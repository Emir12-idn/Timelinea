import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { convertToBase, dppFromTotal } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { COA_CODE } from "../../accounting/journal/coa-codes";
import { CostingService } from "../../inventory/costing.service";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { toCsv } from "../../common/csv.util";
import { CreatePurchaseInvoiceDto } from "./dto/create-purchase-invoice.dto";

const PURCHASE_INVOICE_EXPORT_COLUMNS = ["no", "date", "supplierName", "poNo", "dpp", "ppn", "total", "currency", "exchangeRate", "status", "dueDate"];

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private costing: CostingService,
    private auditLog: AuditLogService,
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
    const currency = dto.currency?.trim().toUpperCase() || "IDR";
    if (currency !== "IDR" && dto.exchangeRate === undefined) {
      throw new BadRequestException("exchangeRate wajib diisi untuk faktur dengan currency selain IDR");
    }
    const exchangeRate = dto.exchangeRate ?? 1;

    // §11 data design, item 2 — multi-currency: dto.total/dpp/ppn diinput dalam
    // `currency` (foreign kalau bukan IDR), lalu dikonversi ke Rupiah untuk
    // disimpan (dpp/ppn/total di skema selalu Rupiah — lihat catatan di
    // schema.prisma). Untuk IDR, exchangeRate = 1 jadi konversinya no-op dan
    // perilakunya identik dengan sebelum multi-currency ada.
    const totalForeign = BigInt(dto.total);
    const dppForeign = dto.dpp !== undefined ? BigInt(dto.dpp) : dppFromTotal(totalForeign);
    const ppnForeign = dto.ppn !== undefined ? BigInt(dto.ppn) : totalForeign - dppForeign;
    const total = convertToBase(totalForeign, exchangeRate);
    const dpp = convertToBase(dppForeign, exchangeRate);
    const ppn = convertToBase(ppnForeign, exchangeRate);

    let debitAccountCode: string = COA_CODE.PERSEDIAAN;
    const po = dto.poId
      ? await this.prisma.purchaseOrder.findFirst({
          where: { id: dto.poId, deletedAt: null },
          include: { lines: { include: { item: true } } },
        })
      : null;
    if (dto.poId && !po) throw new NotFoundException("Pesanan Pembelian (PO) tidak ditemukan");
    if (po) {
      // Tidak ada GRN terpisah di sistem ini — satu Faktur Pembelian SEKALIGUS jadi
      // bukti penerimaan penuh PO (lihat backend/README.md), jadi PO yang sudah
      // "received" tidak boleh difaktur lagi (akan menggandakan stock-in) dan PO
      // yang sudah "cancelled" jelas tidak boleh difaktur (§10 data design, item 4).
      if (po.status === "received") {
        throw new BadRequestException(`PO ${po.no} sudah diterima penuh lewat faktur pembelian sebelumnya`);
      }
      if (po.status === "cancelled") {
        throw new BadRequestException(`PO ${po.no} sudah dibatalkan, tidak bisa difaktur`);
      }
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
          currency,
          exchangeRate,
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

      // §11 data design, item 6 — audit trail: faktur pembelian selalu langsung
      // posting begitu dibuat (tidak ada status draft), jadi "create" di sini
      // SEKALIGUS "post".
      await this.auditLog.record(
        { actorId: createdBy, action: "post", entityType: "purchase_invoice", entityId: invoice.id, after: invoice },
        tx,
      );

      return invoice;
    });
  }

  /**
   * Void/batalkan faktur pembelian yang sudah posting — §10 data design, item 4.
   * Membuat jurnal pembalik (bukan menghapus), stock-OUT balik dari stock-in yang
   * dibuat faktur ini (lewat CostingService — kalau stok itu sudah sebagian
   * terpakai/terjual di tempat lain, stockOut ini akan gagal karena guard stok
   * minus yang sudah ada, yang justru benar: tidak boleh void faktur pembelian
   * kalau barangnya sudah dipakai), dan PO tertaut dikembalikan ke status "sent"
   * (supaya bisa difaktur ulang).
   *
   * Ditolak kalau sudah ada pembayaran atau retur pembelian tertaut ke faktur ini
   * (item 6: tidak boleh membatalkan dokumen yang masih direferensikan).
   */
  async voidInvoice(id: number, createdBy?: number) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id, deletedAt: null },
      include: { cashTransactions: true, returns: { where: { deletedAt: null } }, chequeGiros: true },
    });
    if (!invoice) throw new NotFoundException("Faktur Pembelian tidak ditemukan");
    if (invoice.status === "void") {
      throw new BadRequestException(`Faktur ${invoice.no} sudah dibatalkan sebelumnya`);
    }
    if (invoice.cashTransactions.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah ada pembayaran tertaut — tidak bisa dibatalkan`);
    }
    if (invoice.returns.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah punya Retur Pembelian tertaut — tidak bisa dibatalkan`);
    }
    if (invoice.chequeGiros.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah tertaut Cek/Giro — batalkan Cek/Gironya dulu`);
    }

    return this.prisma.$transaction(async (tx) => {
      const stockIns = await tx.stockMove.findMany({ where: { refType: "purchase_invoice", refId: id, qtyIn: { gt: 0 } } });
      for (const move of stockIns) {
        if (move.warehouseId === null) continue;
        await this.costing.stockOut(tx, {
          itemId: move.itemId,
          warehouseId: move.warehouseId,
          qty: move.qtyIn,
          date: new Date(),
          refType: "purchase_invoice_void",
          refId: id,
          note: `Void Faktur Pembelian ${invoice.no}`,
          createdBy,
        });
      }

      const entry = await tx.journalEntry.findFirst({ where: { refType: "purchase_invoice", refId: id, voidedAt: null } });
      if (entry) {
        await this.journal.reverseEntry(entry.id, new Date(), tx, createdBy);
      }

      if (invoice.poId) {
        await tx.purchaseOrder.update({ where: { id: invoice.poId }, data: { status: "sent" } });
      }

      const voided = await tx.purchaseInvoice.update({ where: { id }, data: { status: "void" } });
      await this.auditLog.record(
        {
          actorId: createdBy,
          action: "void",
          entityType: "purchase_invoice",
          entityId: id,
          before: { status: invoice.status },
          after: { status: voided.status },
        },
        tx,
      );
      return voided;
    });
  }

  /** §11 data design, item 4 — export CSV daftar Faktur Pembelian. */
  async exportCsv(): Promise<string> {
    const invoices = await this.findAll();
    const rows = invoices.map((inv) => ({
      ...inv,
      supplierName: inv.supplier.name,
      poNo: inv.po?.no ?? "",
    }));
    return toCsv(rows, PURCHASE_INVOICE_EXPORT_COLUMNS);
  }
}
