import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { PdfService } from "../../printing/pdf.service";
import { bastHtml } from "../../printing/templates/bast.template";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { CreateBastDto } from "./dto/create-bast.dto";

@Injectable()
export class BastsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private pdf: PdfService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.bast.findMany({
      include: { customer: true, project: true, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const bast = await this.prisma.bast.findUnique({
      where: { id },
      include: { customer: true, project: true, lines: { include: { item: true } }, sourceInvoice: true },
    });
    if (!bast) throw new NotFoundException("BAST tidak ditemukan");
    return bast;
  }

  async create(dto: CreateBastDto, createdBy?: number) {
    const date = new Date(dto.date);

    let lines = dto.lines;
    if (!lines && dto.sourceInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findFirst({
        where: { id: dto.sourceInvoiceId },
        include: { lines: true },
      });
      if (!invoice) throw new NotFoundException("Faktur sumber tidak ditemukan");
      lines = invoice.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        partNo: l.partNo ?? undefined,
        name: l.name,
        qty: Number(l.qty),
        uom: l.uom,
      }));
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException("BAST butuh minimal satu baris item (langsung atau dari sourceInvoiceId)");
    }

    const no = await this.numbering.next("BAST");
    const bast = await this.prisma.bast.create({
      data: {
        no,
        date,
        projectId: dto.projectId,
        poRef: dto.poRef,
        customerId: dto.customerId,
        sourceInvoiceId: dto.sourceInvoiceId,
        createdBy,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    // §12 data design — BAST adalah dokumen serah terima resmi ke pelanggan
    // (tanda tangan dua pihak), jadi pembuatannya dicatat di audit trail sama
    // seperti dokumen transaksi lain yang sudah dipasangi (§11.6).
    await this.auditLog.record({ actorId: createdBy, action: "create", entityType: "bast", entityId: bast.id, after: bast });
    return bast;
  }

  /**
   * §12 data design — cetak BAST dicatat juga (bukan cuma create): BAST yang
   * dicetak ulang berarti ada salinan fisik baru beredar untuk ditandatangani/
   * diserahkan, dan itu relevan secara audit sama seperti pembuatannya — beda
   * dari cetak PO/Faktur/Slip Gaji yang lebih sering cuma untuk arsip internal.
   */
  async renderPdf(id: number, actorId?: number): Promise<Buffer> {
    const bast = await this.findOne(id);
    const html = bastHtml(bast);
    if (actorId !== undefined) {
      await this.auditLog.record({ actorId, action: "print", entityType: "bast", entityId: id });
    }
    return this.pdf.renderHtmlToPdf(html);
  }
}
