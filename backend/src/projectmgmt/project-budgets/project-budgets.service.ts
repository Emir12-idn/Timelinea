import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { lineAmount } from "../../common/money.util";
import { SetProjectBudgetDto } from "./dto/set-project-budget.dto";

/**
 * Proyek §4 (gap module) — RAB per proyek. `realization()` membandingkannya dengan
 * biaya aktual, dihitung ulang dari transaksi yang SUDAH di-tag project_id (prinsip
 * "input di modul asal" §2 dokumen ini) — bukan tabel baru untuk realisasi:
 * - Faktur Pembelian yang PO-nya di-tag proyek ini (biaya pembelian).
 * - stock_move keluar yang langsung di-tag proyek ini (biaya bahan/persediaan).
 */
@Injectable()
export class ProjectBudgetsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: number) {
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
      include: { lines: true, project: true },
    });
    if (!budget) throw new NotFoundException("Proyek ini belum punya RAB");
    return budget;
  }

  /** Upsert seluruh RAB proyek — baris lama diganti dengan yang baru dikirim. */
  set(dto: SetProjectBudgetDto, createdBy?: number) {
    const lines = dto.lines.map((l) => ({ category: l.category, description: l.description, plannedAmount: BigInt(l.plannedAmount) }));
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectBudget.findUnique({ where: { projectId: dto.projectId } });
      if (existing) {
        await tx.projectBudgetLine.deleteMany({ where: { projectBudgetId: existing.id } });
        await tx.projectBudget.update({
          where: { id: existing.id },
          data: { lines: { create: lines } },
        });
        return tx.projectBudget.findUniqueOrThrow({ where: { id: existing.id }, include: { lines: true } });
      }
      return tx.projectBudget.create({
        data: { projectId: dto.projectId, createdBy, lines: { create: lines } },
        include: { lines: true },
      });
    });
  }

  /** Laporan realisasi biaya proyek — RAB vs biaya aktual (lihat catatan kelas di atas). */
  async realization(projectId: number) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException("Proyek tidak ditemukan");

    const budget = await this.prisma.projectBudget.findUnique({ where: { projectId }, include: { lines: true } });
    const plannedTotal = (budget?.lines ?? []).reduce((sum, l) => sum + l.plannedAmount, 0n);

    const [purchaseInvoices, stockMoves] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where: { deletedAt: null, po: { projectId } },
        select: { total: true },
      }),
      this.prisma.stockMove.findMany({
        where: { projectId, qtyOut: { gt: 0 } },
        select: { qtyOut: true, unitCost: true },
      }),
    ]);
    const purchaseCost = purchaseInvoices.reduce((sum, i) => sum + i.total, 0n);
    const materialCost = stockMoves.reduce((sum, m) => sum + lineAmount(m.unitCost ?? 0n, m.qtyOut.toNumber()), 0n);
    const actualTotal = purchaseCost + materialCost;

    return {
      projectId,
      projectCode: project.code,
      projectName: project.name,
      contractValue: project.contractValue,
      plannedTotal,
      actual: { purchaseCost, materialCost, total: actualTotal },
      variance: plannedTotal - actualTotal,
      lines: budget?.lines ?? [],
    };
  }
}
