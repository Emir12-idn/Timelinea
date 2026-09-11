import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { PdfService } from "../../printing/pdf.service";
import { purchaseOrderHtml } from "../../printing/templates/purchase-order.template";
import { displayName } from "../../auth/role-label.util";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";

// draft -> sent -> received | cancelled ; draft -> cancelled directly too (order
// scrapped before ever being sent). received/cancelled adalah status akhir — tidak
// ada transisi keluar dari keduanya (§10 data design, item 4: workflow gap). Ini
// disederhanakan dari model tiga-status Accurate (On Process/Full Received/Closed)
// karena sistem ini sengaja tidak punya GRN terpisah (lihat backend/README.md) —
// satu Faktur Pembelian SELALU menerima PO secara penuh, jadi tidak ada status
// "diterima sebagian" untuk dimodelkan di sini.
const ALLOWED_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private pdf: PdfService,
  ) {}

  findAll(status?: PoStatus) {
    return this.prisma.purchaseOrder.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: { supplier: true, project: true, lines: { include: { item: true } } },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true, project: true, lines: { include: { item: true } }, purchaseInvoices: true },
    });
    if (!po) throw new NotFoundException("Pesanan Pembelian tidak ditemukan");
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("PO", dto.companyId, date, tx);
      return tx.purchaseOrder.create({
        data: {
          no,
          date,
          supplierId: dto.supplierId,
          companyId: dto.companyId,
          projectId: dto.projectId,
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
        include: { lines: true },
      });
    });
  }

  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const po = await this.findOne(id);
    if (po.status !== "draft") {
      throw new BadRequestException("Hanya PO berstatus draft yang bisa diubah");
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { poId: id } });
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          date: dto.date ? new Date(dto.date) : undefined,
          supplierId: dto.supplierId,
          companyId: dto.companyId,
          projectId: dto.projectId,
          note: dto.note,
          lines: dto.lines
            ? {
                create: dto.lines.map((l) => ({
                  itemId: l.itemId,
                  qty: l.qty,
                  unitPrice: BigInt(l.unitPrice),
                  amount: lineAmount(BigInt(l.unitPrice), l.qty),
                })),
              }
            : undefined,
        },
        include: { lines: true },
      });
    });
  }

  async updateStatus(id: number, status: PoStatus) {
    const po = await this.findOne(id);
    if (!ALLOWED_TRANSITIONS[po.status].includes(status)) {
      throw new BadRequestException(`Tidak bisa mengubah status PO dari "${po.status}" ke "${status}"`);
    }
    // §11 data design, item 5 — PO harus di-approve dulu sebelum bisa dikirim ke
    // pemasok (draft -> sent). Cuma menjaga transisi INI; draft -> cancelled tetap
    // bebas (membatalkan PO yang belum pernah dikirim tidak butuh approval).
    if (status === "sent" && !po.approvedBy) {
      throw new BadRequestException(`PO ${po.no} belum di-approve — approve dulu sebelum dikirim ke pemasok`);
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
  }

  /**
   * Approve PO — single-level, role admin/hrd_keuangan (dijaga di controller).
   * Hanya boleh selagi masih draft (belum dikirim/dibatalkan); approve ulang PO
   * yang sudah di-approve ditolak (idempotency guard, bukan re-approve).
   */
  async approve(id: number, approvedBy: number) {
    const po = await this.findOne(id);
    if (po.status !== "draft") {
      throw new BadRequestException(`Hanya PO berstatus draft yang bisa di-approve (status sekarang: "${po.status}")`);
    }
    if (po.approvedBy) {
      throw new BadRequestException(`PO ${po.no} sudah di-approve sebelumnya`);
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { approvedBy, approvedAt: new Date() },
    });
  }

  async renderPdf(id: number): Promise<Buffer> {
    const po = await this.findOne(id);
    const issuer = po.createdBy ? await this.prisma.user.findUnique({ where: { id: po.createdBy } }) : null;
    const html = purchaseOrderHtml({
      no: po.no,
      date: po.date,
      note: po.note,
      supplier: po.supplier,
      lines: po.lines,
      issuedByName: issuer ? displayName(issuer.name, issuer.role) : null,
    });
    return this.pdf.renderHtmlToPdf(html);
  }

  async remove(id: number) {
    const po = await this.findOne(id);
    if (po.status !== "draft") {
      throw new BadRequestException("Hanya PO berstatus draft yang bisa dihapus");
    }
    await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
