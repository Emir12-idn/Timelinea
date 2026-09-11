import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JournalService } from "../../accounting/journal/journal.service";
import { percentOf, minBigInt } from "../../common/money.util";
import { PdfService } from "../../printing/pdf.service";
import { slipGajiHtml } from "../../printing/templates/slip-gaji.template";
import { displayName } from "../../auth/role-label.util";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { GeneratePayslipDto } from "./dto/generate-payslip.dto";

const DEFAULT_ALLOWANCE = 750_000n;
const BPJS_RATE = 0.03;

@Injectable()
export class PayslipsService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
    private pdf: PdfService,
    private auditLog: AuditLogService,
  ) {}

  findAll(employeeId?: number, period?: string) {
    return this.prisma.payslip.findMany({
      where: { ...(employeeId ? { employeeId } : {}), ...(period ? { period } : {}) },
      include: { employee: true },
      orderBy: [{ period: "desc" }, { employeeId: "asc" }],
    });
  }

  async findOne(id: number) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id }, include: { employee: true } });
    if (!payslip) throw new NotFoundException("Slip gaji tidak ditemukan");
    return payslip;
  }

  /**
   * Menghitung & menerbitkan slip gaji satu karyawan untuk satu periode, lalu
   * langsung memposting jurnal (§4: Penggajian). Mencicil kasbon/hutang yang
   * masih berjalan dan mengurangi `remaining`-nya.
   */
  async generate(dto: GeneratePayslipDto, createdBy: number) {
    const existing = await this.prisma.payslip.findUnique({
      where: { employeeId_period: { employeeId: dto.employeeId, period: dto.period } },
    });
    if (existing) throw new BadRequestException(`Slip gaji untuk periode ${dto.period} sudah pernah dibuat`);

    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundException("Karyawan tidak ditemukan");

    const [year, month] = dto.period.split("-").map(Number);
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1));

    let overtimeAmount = BigInt(dto.overtimeAmount ?? 0);
    if (dto.overtimeAmount === undefined) {
      const agg = await this.prisma.overtime.aggregate({
        where: { employeeId: dto.employeeId, date: { gte: periodStart, lt: periodEnd } },
        _sum: { amount: true },
      });
      overtimeAmount = agg._sum.amount ?? 0n;
    }

    const allowance = BigInt(dto.allowance ?? Number(DEFAULT_ALLOWANCE));
    const baseSalary = employee.baseSalary;
    const gross = baseSalary + allowance + overtimeAmount;
    const bpjs = percentOf(baseSalary, BPJS_RATE);
    const taxPph21 = BigInt(dto.taxPph21 ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const advances = await tx.cashAdvance.findMany({
        where: { employeeId: dto.employeeId, status: "approved", remaining: { gt: 0 } },
        orderBy: { date: "asc" },
      });
      let kasbonInstallment = 0n;
      for (const adv of advances) {
        const oneThird = BigInt(Math.round(Number(adv.amount) / 3));
        const planned = oneThird > 0n ? oneThird : adv.remaining;
        const installment = minBigInt(planned, adv.remaining);
        if (installment <= 0n) continue;
        kasbonInstallment += installment;
        await tx.cashAdvance.update({ where: { id: adv.id }, data: { remaining: adv.remaining - installment } });
      }

      const loans = await tx.employeeLoan.findMany({
        where: { employeeId: dto.employeeId, remaining: { gt: 0 } },
        orderBy: { date: "asc" },
      });
      let loanInstallment = 0n;
      for (const loan of loans) {
        const installment = minBigInt(loan.installment, loan.remaining);
        if (installment <= 0n) continue;
        loanInstallment += installment;
        await tx.employeeLoan.update({ where: { id: loan.id }, data: { remaining: loan.remaining - installment } });
      }

      const deductionTotal = bpjs + taxPph21 + kasbonInstallment + loanInstallment;
      const netPay = gross - deductionTotal;

      const payslip = await tx.payslip.create({
        data: {
          employeeId: dto.employeeId,
          period: dto.period,
          baseSalary,
          allowance,
          overtimeAmount,
          gross,
          bpjs,
          taxPph21,
          kasbonInstallment,
          loanInstallment,
          deductionTotal,
          netPay,
          createdBy,
        },
      });

      await this.journal.postPayroll(
        {
          id: payslip.id,
          period: payslip.period,
          employeeId: payslip.employeeId,
          gross: payslip.gross,
          bpjs: payslip.bpjs,
          taxPph21: payslip.taxPph21,
          kasbonInstallment: payslip.kasbonInstallment,
          loanInstallment: payslip.loanInstallment,
          netPay: payslip.netPay,
        },
        periodStart,
        dto.companyId ?? null,
        tx,
        createdBy,
      );

      // §12 data design — slip gaji selalu langsung posting begitu di-generate
      // (tidak ada status draft, sama seperti Faktur Pembelian/Penjualan), jadi
      // "generate" di sini SEKALIGUS "post" — perhitungan uang (gross/potongan/
      // net) adalah persis jenis aksi yang wajib punya audit trail (§12 tugas ini).
      await this.auditLog.record(
        { actorId: createdBy, action: "post", entityType: "payslip", entityId: payslip.id, after: payslip },
        tx,
      );

      return payslip;
    });
  }

  async renderPdf(id: number): Promise<Buffer> {
    const payslip = await this.findOne(id);
    const [kasbonAgg, loanAgg, issuer] = await Promise.all([
      this.prisma.cashAdvance.aggregate({
        where: { employeeId: payslip.employeeId, status: "approved", remaining: { gt: 0 } },
        _sum: { remaining: true },
      }),
      this.prisma.employeeLoan.aggregate({
        where: { employeeId: payslip.employeeId, remaining: { gt: 0 } },
        _sum: { remaining: true },
      }),
      payslip.createdBy ? this.prisma.user.findUnique({ where: { id: payslip.createdBy } }) : null,
    ]);
    const html = slipGajiHtml({
      ...payslip,
      sisaKasbon: kasbonAgg._sum.remaining ?? 0n,
      sisaHutang: loanAgg._sum.remaining ?? 0n,
      issuedByName: issuer ? displayName(issuer.name, issuer.role) : null,
    });
    return this.pdf.renderHtmlToPdf(html);
  }
}
