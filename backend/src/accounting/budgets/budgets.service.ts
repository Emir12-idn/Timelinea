import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SetBudgetDto } from "./dto/set-budget.dto";

function monthRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}

/**
 * Buku Besar §3 (gap module) — Anggaran per akun + Monitor Anggaran. Bukan jenis
 * transaksi baru: `set` hanya upsert nilai anggaran, `monitor` murni membandingkan
 * itu dengan realisasi (SUM journal_line pada periode yang sama, tanda mengikuti
 * saldo normal akun — sama seperti ReportsService.bukuBesar).
 */
@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  findAll(period?: string, companyId?: number) {
    return this.prisma.budget.findMany({
      where: { ...(period ? { period } : {}), ...(companyId !== undefined ? { companyId } : {}) },
      include: { account: true },
      orderBy: [{ period: "desc" }, { account: { code: "asc" } }],
    });
  }

  set(dto: SetBudgetDto, createdBy?: number) {
    const companyId = dto.companyId ?? 0;
    return this.prisma.budget.upsert({
      where: { companyId_period_accountId: { companyId, period: dto.period, accountId: dto.accountId } },
      create: { companyId, period: dto.period, accountId: dto.accountId, amount: BigInt(dto.amount), createdBy },
      update: { amount: BigInt(dto.amount) },
      include: { account: true },
    });
  }

  async remove(id: number) {
    const budget = await this.prisma.budget.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException("Anggaran tidak ditemukan");
    await this.prisma.budget.delete({ where: { id } });
    return { ok: true };
  }

  /** Monitor Anggaran — anggaran vs realisasi per akun untuk satu periode. */
  async monitor(period: string, companyId?: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { period, companyId: companyId ?? 0 },
      include: { account: true },
      orderBy: { account: { code: "asc" } },
    });
    if (budgets.length === 0) return [];

    const { from, to } = monthRange(period);
    const accountIds = budgets.map((b) => b.accountId);
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: accountIds },
        entry: { date: { gte: from, lt: to }, ...(companyId ? { companyId } : {}) },
      },
      select: { accountId: true, debit: true, credit: true },
    });
    const actualByAccount = new Map<number, bigint>();
    for (const l of lines) {
      const cur = actualByAccount.get(l.accountId) ?? 0n;
      actualByAccount.set(l.accountId, cur + l.debit - l.credit);
    }

    return budgets.map((b) => {
      // Saldo normal debit (aset/beban) -> realisasi = debit-credit apa adanya;
      // saldo normal kredit (pendapatan/kewajiban/ekuitas) -> realisasi dibalik tandanya.
      const debitNormal = b.account.type === "aset" || b.account.type === "beban";
      const raw = actualByAccount.get(b.accountId) ?? 0n;
      const actual = debitNormal ? raw : -raw;
      return {
        id: b.id,
        period: b.period,
        accountId: b.accountId,
        accountCode: b.account.code,
        accountName: b.account.name,
        budget: b.amount,
        actual,
        variance: b.amount - actual,
      };
    });
  }
}
