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
   * Tier 1 — pic_proyek/atasan sign-off (§data design "waiting on confirmation"
   * note, resolved as: atasan dulu, baru HRD). Only moves `pending` forward;
   * doesn't touch cash or the journal yet.
   */
  async decideTier1(id: number, decision: "approved" | "rejected", decidedBy: number) {
    const advance = await this.prisma.cashAdvance.findUnique({ where: { id } });
    if (!advance) throw new NotFoundException("Pengajuan kasbon tidak ditemukan");
    if (advance.status !== "pending") {
      throw new BadRequestException("Kasbon ini sudah melewati tahap persetujuan atasan");
    }

    if (decision === "rejected") {
      return this.prisma.cashAdvance.update({ where: { id }, data: { status: "rejected", approvedBy: decidedBy } });
    }
    return this.prisma.cashAdvance.update({ where: { id }, data: { status: "tier1_approved", tier1By: decidedBy } });
  }

  /**
   * Tier 2 (final) — HRD/Keuangan. Approved -> remaining = amount dan langsung
   * diposting ke jurnal (Piutang Karyawan debit, Kas kredit) — §4. Requires
   * tier 1 to have signed off first.
   */
  async decide(id: number, decision: "approved" | "rejected", approvedBy: number) {
    const advance = await this.prisma.cashAdvance.findUnique({ where: { id } });
    if (!advance) throw new NotFoundException("Pengajuan kasbon tidak ditemukan");
    if (advance.status === "pending") {
      throw new BadRequestException("Kasbon ini menunggu persetujuan atasan (tier 1) terlebih dahulu");
    }
    if (advance.status !== "tier1_approved") throw new BadRequestException("Kasbon ini sudah diproses");

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
