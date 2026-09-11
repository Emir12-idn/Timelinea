import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount, percentOf } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { CostingService } from "../../inventory/costing.service";
import { CreateSalesReturnDto } from "./dto/create-sales-return.dto";

const PPN_RATE = 0.11;

const DETAIL_INCLUDE = {
  salesInvoice: { include: { customer: true } },
  lines: { include: { item: true } },
} as const;

/**
 * Retur penjualan: pelanggan mengembalikan barang yang sudah difaktur. Jurnal
 * dan stok adalah kebalikan dari faktur penjualan (§4) — lihat JournalService.postSalesReturn.
 * Tidak mengubah SalesInvoice itu sendiri (faktur asli tetap apa adanya untuk jejak
 * audit), retur berdiri sebagai dokumen sendiri yang mengurangi Piutang Usaha.
 */
@Injectable()
export class SalesReturnsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private costing: CostingService,
  ) {}

  findAll() {
    return this.prisma.salesReturn.findMany({
      where: { deletedAt: null },
      include: DETAIL_INCLUDE,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const ret = await this.prisma.salesReturn.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
    if (!ret) throw new NotFoundException("Retur Penjualan tidak ditemukan");
    return ret;
  }

  async create(dto: CreateSalesReturnDto, createdBy?: number) {
    const date = new Date(dto.date);
    const invoice = await this.prisma.salesInvoice.findFirst({ where: { id: dto.salesInvoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundException("Faktur Penjualan tidak ditemukan");

    const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
    const items = await this.prisma.item.findMany({ where: { id: { in: itemIds } } });
    const itemById = new Map(items.map((i) => [i.id, i]));

    const lines = dto.lines.map((l) => ({ ...l, amount: lineAmount(BigInt(l.unitPrice), l.qty) }));
    // Sum-then-round di level dokumen, sama seperti Faktur Penjualan (§10 data design).
    const dpp = lines.reduce((sum, l) => sum + l.amount, 0n);
    const ppn = percentOf(dpp, PPN_RATE);
    const total = dpp + ppn;

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("SRET", dto.companyId, date, tx);
      const ret = await tx.salesReturn.create({
        data: {
          no,
          date,
          salesInvoiceId: dto.salesInvoiceId,
          companyId: dto.companyId,
          reason: dto.reason,
          dpp,
          ppn,
          total,
          createdBy,
          lines: {
            create: lines.map((l) => ({
              itemId: l.itemId,
              qty: l.qty,
              unitPrice: BigInt(l.unitPrice),
              amount: l.amount,
            })),
          },
        },
      });

      // Barang masuk kembali pada biaya terakhir yang diketahui (Item.lastCost) —
      // faktur penjualan tidak menyimpan biaya pokok per baris, jadi ini pendekatan
      // terbaik yang tersedia (judgment call, lihat laporan akhir tugas ini).
      const warehouseId = dto.warehouseId ?? (await this.costing.getDefaultWarehouseId(tx));
      for (const l of lines) {
        const item = itemById.get(l.itemId);
        if (item?.type === "stock") {
          await this.costing.stockIn(tx, {
            itemId: l.itemId,
            warehouseId,
            qty: l.qty,
            unitCost: item.lastCost ?? 0n,
            date,
            refType: "sales_return",
            refId: ret.id,
            note: `Retur Penjualan ${no} (Faktur ${invoice.no})`,
            createdBy,
          });
        }
      }

      await this.journal.postSalesReturn(
        { id: ret.id, no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
      );

      return ret;
    });
  }
}
