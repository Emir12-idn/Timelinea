import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PurchaseRequestStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { PurchaseOrdersService } from "../purchase-orders/purchase-orders.service";
import { CreatePurchaseOrderDto } from "../purchase-orders/dto/create-purchase-order.dto";
import { CreatePurchaseRequestDto } from "./dto/create-purchase-request.dto";
import { ConvertToPoDto } from "./dto/convert-to-po.dto";

const PR_INCLUDE = { department: true, project: true, lines: { include: { item: true } }, convertedPo: true } as const;

/**
 * §14 data design (pass keenam), item 2 — Permintaan Pembelian (Purchase
 * Request). Langkah pra-persetujuan internal sebelum PO ada, yang §2 dokumen
 * ini sudah sebutkan sejak awal tapi baru dibangun di pass ini. Alur lebih
 * sederhana dari SalesQuotation (tidak ada "sent", cuma draft -> approved/
 * rejected -> converted) karena PR memang internal (tidak pernah dikirim ke
 * pihak luar) — mengikuti izin eksplisit tugas ini untuk tetap ringkas dan
 * tanpa print template sendiri.
 */
@Injectable()
export class PurchaseRequestsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private auditLog: AuditLogService,
    private purchaseOrders: PurchaseOrdersService,
  ) {}

  findAll(status?: PurchaseRequestStatus) {
    return this.prisma.purchaseRequest.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: PR_INCLUDE,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const pr = await this.prisma.purchaseRequest.findFirst({ where: { id, deletedAt: null }, include: PR_INCLUDE });
    if (!pr) throw new NotFoundException("Permintaan Pembelian (PR) tidak ditemukan");
    return pr;
  }

  async create(dto: CreatePurchaseRequestDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("PR", dto.companyId, date, tx);
      return tx.purchaseRequest.create({
        data: {
          no,
          date,
          requestedBy: dto.requestedBy ?? createdBy,
          departmentId: dto.departmentId,
          projectId: dto.projectId,
          companyId: dto.companyId,
          note: dto.note,
          createdBy,
          lines: {
            create: dto.lines.map((l) => ({
              itemId: l.itemId,
              qty: l.qty,
              estimatedUnitPrice: l.estimatedUnitPrice !== undefined ? BigInt(l.estimatedUnitPrice) : undefined,
              note: l.note,
            })),
          },
        },
        include: PR_INCLUDE,
      });
    });
  }

  /** Approve — single-level (role admin/hrd_keuangan dijaga di controller), sama pola dengan PurchaseOrdersService.approve(). */
  async approve(id: number, approvedBy: number) {
    const pr = await this.findOne(id);
    if (pr.status !== "draft") {
      throw new BadRequestException(`Hanya PR berstatus draft yang bisa di-approve (status sekarang: "${pr.status}")`);
    }
    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: "approved", approvedBy, approvedAt: new Date() },
      include: PR_INCLUDE,
    });
    await this.auditLog.record({
      actorId: approvedBy,
      action: "approve",
      entityType: "purchase_request",
      entityId: id,
      before: { status: pr.status },
      after: { status: updated.status, approvedBy },
    });
    return updated;
  }

  async reject(id: number, actorId: number, reason?: string) {
    const pr = await this.findOne(id);
    if (pr.status !== "draft") {
      throw new BadRequestException(`Hanya PR berstatus draft yang bisa ditolak (status sekarang: "${pr.status}")`);
    }
    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: "rejected", note: reason ? `${pr.note ? pr.note + " — " : ""}Ditolak: ${reason}` : pr.note },
      include: PR_INCLUDE,
    });
    await this.auditLog.record({
      actorId,
      action: "reject",
      entityType: "purchase_request",
      entityId: id,
      before: { status: pr.status },
      after: { status: updated.status, reason },
    });
    return updated;
  }

  /**
   * Konversi PR -> PO — hanya boleh dari status `approved`, dan hanya sekali
   * (convertedPoId unik). Supplier dipilih di sini (PR sendiri tidak punya
   * supplier, §14 data design item 2). unitPrice PO awal = estimatedUnitPrice
   * baris PR kalau diisi, kalau tidak fallback ke item.lastCost, kalau itu pun
   * kosong 0 — PO hasil konversi tetap berstatus draft jadi harganya masih
   * bisa diedit user via PATCH /purchase-orders/:id sebelum dikirim/di-approve.
   */
  async convertToPurchaseOrder(id: number, dto: ConvertToPoDto, actorId?: number) {
    const pr = await this.findOne(id);
    if (pr.status !== "approved") {
      throw new BadRequestException(`Hanya PR berstatus "approved" yang bisa dikonversi jadi PO (status sekarang: "${pr.status}")`);
    }
    if (pr.convertedPoId) {
      throw new BadRequestException(`PR ${pr.no} sudah dikonversi jadi PO sebelumnya`);
    }

    const poDto: CreatePurchaseOrderDto = {
      date: new Date().toISOString().slice(0, 10),
      supplierId: dto.supplierId,
      companyId: pr.companyId ?? undefined,
      projectId: pr.projectId ?? undefined,
      note: dto.note ?? pr.note ?? undefined,
      lines: pr.lines.map((l) => ({
        itemId: l.itemId,
        qty: l.qty.toNumber(),
        unitPrice: Number(l.estimatedUnitPrice ?? l.item.lastCost ?? 0n),
      })),
    };
    const po = await this.purchaseOrders.create(poDto, actorId);

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: "converted", convertedPoId: po.id },
      include: PR_INCLUDE,
    });
    await this.auditLog.record({
      actorId,
      action: "convert",
      entityType: "purchase_request",
      entityId: id,
      before: { status: pr.status, convertedPoId: null },
      after: { status: updated.status, convertedPoId: po.id, poNo: po.no },
    });
    return updated;
  }
}
