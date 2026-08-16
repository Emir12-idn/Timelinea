import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { COA_CODE } from "../../accounting/journal/coa-codes";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";

const PPN_RATE = 0.11;

const DETAIL_INCLUDE = {
  purchaseInvoice: { include: { supplier: true } },
  lines: { include: { item: true } },
} as const;

/**
 * Retur pembelian: barang yang sudah masuk lewat Faktur Pembelian dikembalikan
 * ke pemasok. Jurnal dan stok adalah kebalikan dari faktur pembelian (§4) —
 * lihat JournalService.postPurchaseReturn. Faktur Pembelian asli tidak diubah,
 * retur berdiri sendiri sebagai dokumen yang mengurangi Utang Usaha.
 */
@Injectable()
export class PurchaseReturnsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
  ) {}

  findAll() {
    return this.prisma.purchaseReturn.findMany({
      where: { deletedAt: null },
      include: DETAIL_INCLUDE,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const ret = await this.prisma.purchaseReturn.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
    if (!ret) throw new NotFoundException("Retur Pembelian tidak ditemukan");
    return ret;
  }

  async create(dto: CreatePurchaseReturnDto, createdBy?: number) {
    const date = new Date(dto.date);
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id: dto.purchaseInvoiceId, deletedAt: null },
      include: { po: { include: { lines: { include: { item: true } } } } },
    });
    if (!invoice) throw new NotFoundException("Faktur Pembelian tidak ditemukan");

    let creditAccountCode: string = COA_CODE.PERSEDIAAN;
    if (invoice.po && invoice.po.lines.length > 0) {
      const allService = invoice.po.lines.every((l) => l.item.type === "service");
      creditAccountCode = allService ? COA_CODE.HPP : COA_CODE.PERSEDIAAN;
    }

    const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
    const items = await this.prisma.item.findMany({ where: { id: { in: itemIds } } });
    const itemById = new Map(items.map((i) => [i.id, i]));

    const lines = dto.lines.map((l) => ({ ...l, amount: lineAmount(BigInt(l.unitPrice), l.qty) }));
    const dpp = lines.reduce((sum, l) => sum + l.amount, 0n);
    const ppn = BigInt(Math.round(Number(dpp) * PPN_RATE));
    const total = dpp + ppn;

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("PRET", dto.companyId, date, tx);
      const ret = await tx.purchaseReturn.create({
        data: {
          no,
          date,
          purchaseInvoiceId: dto.purchaseInvoiceId,
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

      for (const l of lines) {
        if (itemById.get(l.itemId)?.type === "stock") {
          await tx.stockMove.create({
            data: {
              itemId: l.itemId,
              date,
              refType: "purchase_return",
              refId: ret.id,
              qtyOut: l.qty,
              note: `Retur Pembelian ${no} (Faktur ${invoice.no})`,
              createdBy,
            },
          });
        }
      }

      await this.journal.postPurchaseReturn(
        { id: ret.id, no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
        creditAccountCode,
      );

      return ret;
    });
  }
}
