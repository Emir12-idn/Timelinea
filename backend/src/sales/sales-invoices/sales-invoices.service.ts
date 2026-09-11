import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount, percentOf } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { PdfService } from "../../printing/pdf.service";
import { fakturPenjualanHtml } from "../../printing/templates/faktur-penjualan.template";
import { displayName } from "../../auth/role-label.util";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { ValidateFieldsDto } from "./dto/validate-fields.dto";
import { SalesInvoiceStatus } from "@prisma/client";

const PPN_RATE = 0.11;

@Injectable()
export class SalesInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private pdf: PdfService,
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
    const dpp = lines.reduce((sum, l) => sum + l.amount, 0n);
    const ppn = percentOf(dpp, PPN_RATE);
    const pph = BigInt(dto.pph ?? 0);
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

      return invoice;
    });
  }

  async updateStatus(id: number, status: SalesInvoiceStatus, authorName = "system") {
    await this.findOne(id);
    return this.prisma.salesInvoice.update({
      where: { id },
      data: { status, logs: { create: { action: "status_change", status, author: authorName } } },
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
