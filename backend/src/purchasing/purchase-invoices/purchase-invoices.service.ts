import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { dppFromTotal } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { COA_CODE } from "../../accounting/journal/coa-codes";
import { CostingService } from "../../inventory/costing.service";
import { CreatePurchaseInvoiceDto } from "./dto/create-purchase-invoice.dto";

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private costing: CostingService,
  ) {}

  findAll() {
    return this.prisma.purchaseInvoice.findMany({
      where: { deletedAt: null },
      include: { supplier: true, po: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const inv = await this.prisma.purchaseInvoice.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true, po: { include: { lines: { include: { item: true } } } } },
    });
    if (!inv) throw new NotFoundException("Faktur Pembelian tidak ditemukan");
    return inv;
  }

  /**
   * Faktur pembelian diposting ke jurnal begitu dibuat — lihat §4 di data design.
   * Emerald tidak menerbitkan GRN sendiri (itu terbitan principal/pelanggan di sisi
   * penjualan, dan di sisi pembelian internal juga tidak dipakai) — kalau faktur ini
   * ditautkan ke PO (poId), faktur SEKALIGUS jadi bukti penerimaan: PO otomatis
   * "received" dan stok item stock-type langsung bertambah dari baris PO tsb.
   */
  async create(dto: CreatePurchaseInvoiceDto, createdBy?: number) {
    const date = new Date(dto.date);
    const total = BigInt(dto.total);
    const dpp = dto.dpp !== undefined ? BigInt(dto.dpp) : dppFromTotal(total);
    const ppn = dto.ppn !== undefined ? BigInt(dto.ppn) : total - dpp;

    let debitAccountCode: string = COA_CODE.PERSEDIAAN;
    const po = dto.poId
      ? await this.prisma.purchaseOrder.findFirst({
          where: { id: dto.poId, deletedAt: null },
          include: { lines: { include: { item: true } } },
        })
      : null;
    if (dto.poId && !po) throw new NotFoundException("Pesanan Pembelian (PO) tidak ditemukan");
    if (po) {
      if (po.lines.length === 0) throw new BadRequestException("PO ini belum punya baris item");
      const allService = po.lines.every((l) => l.item.type === "service");
      debitAccountCode = allService ? COA_CODE.HPP : COA_CODE.PERSEDIAAN;
    }

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("PINV", dto.companyId, date, tx);
      const invoice = await tx.purchaseInvoice.create({
        data: {
          no,
          date,
          supplierId: dto.supplierId,
          companyId: dto.companyId,
          poId: dto.poId,
          dpp,
          ppn,
          total,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          createdBy,
        },
      });

      if (po) {
        const warehouseId = dto.warehouseId ?? (await this.costing.getDefaultWarehouseId(tx));
        for (const line of po.lines) {
          if (line.item.type !== "stock") continue;
          await this.costing.stockIn(tx, {
            itemId: line.itemId,
            warehouseId,
            qty: line.qty,
            unitCost: line.unitPrice,
            date,
            refType: "purchase_invoice",
            refId: invoice.id,
            projectId: po.projectId ?? undefined,
            note: `Faktur Pembelian ${invoice.no} (PO ${po.no})`,
            createdBy,
          });
        }
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "received" } });
      }

      await this.journal.postPurchaseInvoice(
        { id: invoice.id, no: invoice.no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
        debitAccountCode,
      );

      return invoice;
    });
  }
}
