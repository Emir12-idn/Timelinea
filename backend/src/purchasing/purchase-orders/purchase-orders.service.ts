import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
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
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
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
