import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { convertToBase, lineAmount, percentOf } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { PdfService } from "../../printing/pdf.service";
import { fakturPenjualanHtml } from "../../printing/templates/faktur-penjualan.template";
import { displayName } from "../../auth/role-label.util";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { ValidateFieldsDto } from "./dto/validate-fields.dto";
import { SalesInvoiceStatus } from "@prisma/client";

const PPN_RATE = 0.11;

// draft -> sent -> accepted -> paid ; paid/void adalah status akhir. "void" TIDAK
// bisa dicapai lewat updateStatus() biasa — harus lewat voidInvoice() (endpoint
// khusus) supaya jurnal pembaliknya otomatis dibuat, bukan cuma ganti label status
// (§10 data design, item 4).
const ALLOWED_TRANSITIONS: Record<SalesInvoiceStatus, SalesInvoiceStatus[]> = {
  draft: ["sent"],
  sent: ["accepted"],
  accepted: ["paid"],
  paid: [],
  void: [],
};

@Injectable()
export class SalesInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private pdf: PdfService,
    private auditLog: AuditLogService,
  ) {}

  findAll(status?: SalesInvoiceStatus) {
    return this.prisma.salesInvoice.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: { customer: true, project: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        project: true,
        lines: { include: { item: true } },
        validations: true,
        logs: { orderBy: { at: "desc" } },
      },
    });
    if (!invoice) throw new NotFoundException("Faktur Penjualan tidak ditemukan");
    return invoice;
  }

  /** Faktur penjualan diposting ke jurnal begitu dibuat — lihat §4 di data design. */
  async create(dto: CreateSalesInvoiceDto, createdBy?: number, authorName = "system") {
    const date = new Date(dto.date);

    // Part No di cetakan ikut kode Barang & Jasa (Item.code) kalau baris tidak
    // mengisinya sendiri — supaya kolom "Part No" di Faktur Penjualan tidak kosong.
    const itemIds = [...new Set(dto.lines.map((l) => l.itemId).filter((id): id is number => id !== undefined))];
    const items = itemIds.length ? await this.prisma.item.findMany({ where: { id: { in: itemIds } } }) : [];
    const itemCodeById = new Map(items.map((i) => [i.id, i.code]));

    const lines = dto.lines.map((l) => ({
      ...l,
      partNo: l.partNo ?? (l.itemId ? itemCodeById.get(l.itemId) : undefined),
      amount: lineAmount(BigInt(l.unitPrice), l.qty),
    }));
    // DPP total dulu (jumlah baris, sudah bulat rupiah masing-masing), baru PPN
    // dihitung & dibulatkan SEKALI di level faktur — bukan per baris. Ini pola
    // pembulatan yang didokumentasikan DJP (PER-11/PJ/2025, pembulatan ke rupiah
    // penuh half-up) dan dipakai Accurate ("Rounded Upper" per invoice, bukan per
    // baris) — lihat §10 data design. `percentOf` (money.util) dipakai supaya
    // pembulatannya konsisten (Decimal half-up) dengan util yang sama dipakai di
    // tempat lain, bukan Math.round(Number(...)) yang rawan presisi float.
    // §11 data design, item 2 — multi-currency: baris (unitPrice/amount) diinput
    // dalam `currency` (foreign kalau bukan IDR) apa adanya — lihat catatan di
    // schema.prisma soal kenapa header dpp/ppn/total tetap Rupiah sementara baris
    // tidak. Untuk IDR, exchangeRate = 1 jadi konversinya no-op (perilaku identik
    // sebelum multi-currency ada).
    const currency = dto.currency?.trim().toUpperCase() || "IDR";
    if (currency !== "IDR" && dto.exchangeRate === undefined) {
      throw new BadRequestException("exchangeRate wajib diisi untuk faktur dengan currency selain IDR");
    }
    const exchangeRate = dto.exchangeRate ?? 1;

    const dppForeign = lines.reduce((sum, l) => sum + l.amount, 0n);
    const ppnForeign = percentOf(dppForeign, PPN_RATE);
    const pph = BigInt(dto.pph ?? 0);
    const dpp = convertToBase(dppForeign, exchangeRate);
    const ppn = convertToBase(ppnForeign, exchangeRate);
    const total = dpp + ppn;

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("SI", dto.companyId, date, tx);
      const invoice = await tx.salesInvoice.create({
        data: {
          no,
          date,
          customerId: dto.customerId,
          companyId: dto.companyId,
          taxInvoiceNo: dto.taxInvoiceNo,
          poRef: dto.poRef,
          projectId: dto.projectId,
          dpp,
          ppn,
          pph,
          total,
          currency,
          exchangeRate,
          status: "draft",
          createdBy,
          lines: {
            create: lines.map((l) => ({
              itemId: l.itemId,
              partNo: l.partNo,
              poRef: l.poRef,
              name: l.name,
              qty: l.qty,
              uom: l.uom,
              unitPrice: BigInt(l.unitPrice),
              amount: l.amount,
            })),
          },
          logs: { create: { action: "create", status: "draft", author: authorName } },
        },
      });

      await this.journal.postSalesInvoice(
        { id: invoice.id, no: invoice.no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
      );

      // §11 data design, item 6 — audit trail: faktur penjualan juga selalu
      // langsung posting begitu dibuat, apapun status awalnya (draft) — lihat
      // catatan panjang soal ini di RecurringTemplate (recurring/recurring-
      // templates.service.ts).
      await this.auditLog.record(
        { actorId: createdBy, action: "post", entityType: "sales_invoice", entityId: invoice.id, after: invoice },
        tx,
      );

      return invoice;
    });
  }

  async updateStatus(id: number, status: SalesInvoiceStatus, authorName = "system", actorId?: number) {
    const invoice = await this.findOne(id);
    if (status === "void") {
      throw new BadRequestException(
        "Gunakan PATCH /sales-invoices/:id/void untuk membatalkan faktur yang sudah posting — bukan lewat status biasa, supaya jurnal pembaliknya otomatis dibuat.",
      );
    }
    if (!ALLOWED_TRANSITIONS[invoice.status].includes(status)) {
      throw new BadRequestException(`Tidak bisa mengubah status faktur dari "${invoice.status}" ke "${status}"`);
    }
    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: { status, logs: { create: { action: "status_change", status, author: authorName } } },
    });
    await this.auditLog.record({
      actorId,
      action: "status_change",
      entityType: "sales_invoice",
      entityId: id,
      before: { status: invoice.status },
      after: { status: updated.status },
    });
    return updated;
  }

  /**
   * Void/batalkan faktur yang sudah posting — §10 data design, item 4. Membuat
   * jurnal pembalik (JournalService.reverseEntry) lewat entry asal (refType
   * "sales_invoice"), TIDAK menghapus faktur atau baris jurnalnya. Faktur
   * penjualan sendiri tidak menggerakkan stok (Surat Jalan yang menggerakkan),
   * jadi void di sini tidak menyentuh persediaan.
   *
   * Ditolak kalau sudah ada dokumen turunan yang menganggap faktur ini lunas/aktif
   * — penerimaan kas, retur, atau cek/giro tertaut — itu semua harus dibatalkan
   * duluan (item 6: tidak boleh membatalkan dokumen yang masih direferensikan).
   */
  async voidInvoice(id: number, authorName = "system", createdBy?: number) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, deletedAt: null },
      include: { cashTransactions: true, returns: { where: { deletedAt: null } }, chequeGiros: true },
    });
    if (!invoice) throw new NotFoundException("Faktur Penjualan tidak ditemukan");
    if (invoice.status === "void") {
      throw new BadRequestException(`Faktur ${invoice.no} sudah dibatalkan sebelumnya`);
    }
    if (invoice.cashTransactions.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah ada penerimaan pembayaran tertaut — tidak bisa dibatalkan`);
    }
    if (invoice.returns.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah punya Retur Penjualan tertaut — tidak bisa dibatalkan`);
    }
    if (invoice.chequeGiros.length > 0) {
      throw new BadRequestException(`Faktur ${invoice.no} sudah tertaut Cek/Giro — batalkan Cek/Gironya dulu`);
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findFirst({ where: { refType: "sales_invoice", refId: id, voidedAt: null } });
      if (entry) {
        await this.journal.reverseEntry(entry.id, new Date(), tx, createdBy);
      }
      const voided = await tx.salesInvoice.update({
        where: { id },
        data: { status: "void", logs: { create: { action: "void", status: "void", author: authorName } } },
      });
      await this.auditLog.record(
        {
          actorId: createdBy,
          action: "void",
          entityType: "sales_invoice",
          entityId: id,
          before: { status: invoice.status },
          after: { status: voided.status },
        },
        tx,
      );
      return voided;
    });
  }

  /** Meniru "AI validation" ala Komatsu: bandingkan input vendor vs data sistem, simpan hasilnya. */
  async validateFields(id: number, dto: ValidateFieldsDto) {
    const invoice = await this.findOne(id);
    const systemValues: Record<string, string> = {
      no: invoice.no,
      tanggal: invoice.date.toISOString().slice(0, 10),
      pelanggan: invoice.customer.name,
      dpp: invoice.dpp.toString(),
      ppn: invoice.ppn.toString(),
      total: invoice.total.toString(),
      po_ref: invoice.poRef ?? "",
    };

    await this.prisma.documentValidation.deleteMany({ where: { salesInvoiceId: id } });
    const rows = dto.fields.map((f) => {
      const systemValue = systemValues[f.field] ?? "";
      return {
        salesInvoiceId: id,
        field: f.field,
        inputValue: f.inputValue,
        systemValue,
        isMatch: f.inputValue.trim().toLowerCase() === systemValue.trim().toLowerCase(),
      };
    });
    await this.prisma.documentValidation.createMany({ data: rows });
    return this.prisma.documentValidation.findMany({ where: { salesInvoiceId: id } });
  }

  async renderPdf(id: number): Promise<Buffer> {
    const invoice = await this.findOne(id);
    const [company, preparer] = await Promise.all([
      invoice.companyId
        ? this.prisma.company.findUnique({ where: { id: invoice.companyId } })
        : this.prisma.company.findFirst({ where: { isDefault: true, deletedAt: null } }),
      invoice.createdBy ? this.prisma.user.findUnique({ where: { id: invoice.createdBy } }) : null,
    ]);
    const html = fakturPenjualanHtml({
      ...invoice,
      bankAccount: company?.bankAccount ?? null,
      paymentTermDays: invoice.customer.termDays ?? null,
      preparedByName: preparer ? displayName(preparer.name, preparer.role) : null,
    });
    return this.pdf.renderHtmlToPdf(html);
  }
}
