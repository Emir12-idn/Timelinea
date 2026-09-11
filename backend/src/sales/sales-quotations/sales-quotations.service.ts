import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { SalesQuotationStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { SalesOrdersService } from "../sales-orders/sales-orders.service";
import { CreateSalesOrderDto } from "../sales-orders/dto/create-sales-order.dto";
import { CreateSalesQuotationDto } from "./dto/create-sales-quotation.dto";

const SQ_INCLUDE = { customer: true, project: true, lines: { include: { item: true } }, convertedSo: true } as const;

// draft -> sent -> accepted|rejected|expired ; draft -> rejected directly too
// (quotation scrapped before ever being sent — mirrors PurchaseOrder's
// draft -> cancelled shortcut, §10 data design item 4). accepted/rejected/
// expired are final — no transition out of any of them via updateStatus().
const ALLOWED_TRANSITIONS: Record<SalesQuotationStatus, SalesQuotationStatus[]> = {
  draft: ["sent", "rejected"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

/**
 * §14 data design (pass keenam), item 1 — Penawaran (Sales Quotation). Langkah
 * pertama alur "Sales Quotation -> SO -> DO -> Faktur" yang §2 dokumen ini
 * sudah sebutkan sejak awal tapi baru dibangun di pass ini. Mengikuti pola
 * SalesOrdersService persis (create/findAll/findOne) ditambah status workflow
 * (gaya PurchaseOrdersService) dan satu aksi tambahan: convertToSalesOrder(),
 * yang memanggil SalesOrdersService.create() yang SUDAH ADA (pola yang sama
 * dipakai RecurringTemplatesService.confirmDraft() memanggil SalesInvoicesService
 * .create()) — supaya numbering/journal SO tetap lewat jalur normalnya, tidak
 * ada jalan pintas.
 */
@Injectable()
export class SalesQuotationsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private auditLog: AuditLogService,
    private salesOrders: SalesOrdersService,
  ) {}

  findAll(status?: SalesQuotationStatus) {
    return this.prisma.salesQuotation.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: SQ_INCLUDE,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const sq = await this.prisma.salesQuotation.findFirst({ where: { id, deletedAt: null }, include: SQ_INCLUDE });
    if (!sq) throw new NotFoundException("Penawaran (Sales Quotation) tidak ditemukan");
    return sq;
  }

  async create(dto: CreateSalesQuotationDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("SQ", dto.companyId, date, tx);
      return tx.salesQuotation.create({
        data: {
          no,
          date,
          customerId: dto.customerId,
          companyId: dto.companyId,
          projectId: dto.projectId,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          note: dto.note,
          createdBy,
          lines: {
            create: dto.lines.map((l) => ({
              itemId: l.itemId,
              qty: l.qty,
              unitPrice: BigInt(l.unitPrice),
              amount: lineAmount(BigInt(l.unitPrice), l.qty),
            })),
          },
        },
        include: SQ_INCLUDE,
      });
    });
  }

  async updateStatus(id: number, status: SalesQuotationStatus, actorId?: number) {
    const sq = await this.findOne(id);
    if (!ALLOWED_TRANSITIONS[sq.status].includes(status)) {
      throw new BadRequestException(`Tidak bisa mengubah status Penawaran dari "${sq.status}" ke "${status}"`);
    }
    const updated = await this.prisma.salesQuotation.update({ where: { id }, data: { status }, include: SQ_INCLUDE });
    await this.auditLog.record({
      actorId,
      action: status === "rejected" ? "reject" : "status_change",
      entityType: "sales_quotation",
      entityId: id,
      before: { status: sq.status },
      after: { status: updated.status },
    });
    return updated;
  }

  /**
   * Konversi Penawaran -> Pesanan Penjualan (SO) — hanya boleh dari status
   * `accepted` (pelanggan sudah setuju), dan hanya sekali (convertedSoId unik).
   * Baris quotation dibawa apa adanya ke SO baru lewat SalesOrdersService.create()
   * yang sudah ada, supaya numbering (SO-YY-xxxxxx) dan konvensi SO lain tidak
   * dibuat ulang di sini.
   */
  async convertToSalesOrder(id: number, actorId?: number) {
    const sq = await this.findOne(id);
    if (sq.status !== "accepted") {
      throw new BadRequestException(`Hanya Penawaran berstatus "accepted" yang bisa dikonversi jadi SO (status sekarang: "${sq.status}")`);
    }
    if (sq.convertedSoId) {
      throw new BadRequestException(`Penawaran ${sq.no} sudah dikonversi jadi SO sebelumnya`);
    }

    const soDto: CreateSalesOrderDto = {
      date: new Date().toISOString().slice(0, 10),
      customerId: sq.customerId,
      companyId: sq.companyId ?? undefined,
      projectId: sq.projectId ?? undefined,
      lines: sq.lines.map((l) => ({ itemId: l.itemId, qty: l.qty.toNumber(), unitPrice: Number(l.unitPrice) })),
    };
    const so = await this.salesOrders.create(soDto, actorId);

    const updated = await this.prisma.salesQuotation.update({
      where: { id },
      data: { convertedSoId: so.id },
      include: SQ_INCLUDE,
    });
    await this.auditLog.record({
      actorId,
      action: "convert",
      entityType: "sales_quotation",
      entityId: id,
      before: { convertedSoId: null },
      after: { convertedSoId: so.id, soNo: so.no },
    });
    return updated;
  }
}
