import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JournalService } from "../../accounting/journal/journal.service";
import { CreateCashAdvanceDto } from "./dto/create-cash-advance.dto";

@Injectable()
export class CashAdvancesService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  findAll(employeeId?: number) {
    return this.prisma.cashAdvance.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreateCashAdvanceDto, employeeId: number) {
    return this.prisma.cashAdvance.create({
      data: {
        employeeId,
        date: new Date(dto.date),
        amount: BigInt(dto.amount),
        reason: dto.reason,
        status: "pending",
        remaining: 0n,
      },
    });
  }

  /**
   * HRD approve/reject (§6: default 1 level). Approved -> remaining = amount dan
   * langsung diposting ke jurnal (Piutang Karyawan debit, Kas kredit) — §4.
   */
  async decide(id: number, decision: "approved" | "rejected", approvedBy: number) {
    const advance = await this.prisma.cashAdvance.findUnique({ where: { id } });
    if (!advance) throw new NotFoundException("Pengajuan kasbon tidak ditemukan");
    if (advance.status !== "pending") throw new BadRequestException("Kasbon ini sudah diproses");

    if (decision === "rejected") {
      return this.prisma.cashAdvance.update({ where: { id }, data: { status: "rejected", approvedBy } });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cashAdvance.update({
        where: { id },
        data: { status: "approved", approvedBy, remaining: advance.amount },
      });
      await this.journal.postCashAdvanceApproval({ id: updated.id, date: updated.date, amount: updated.amount }, null, tx, approvedBy);
      return updated;
    });
  }
}
