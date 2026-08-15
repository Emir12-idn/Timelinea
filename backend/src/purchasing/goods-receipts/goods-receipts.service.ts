import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { CreateGoodsReceiptDto } from "./dto/create-goods-receipt.dto";

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
  ) {}

  findAll() {
    return this.prisma.goodsReceipt.findMany({
      where: { deletedAt: null },
      include: { po: { include: { supplier: true } }, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const gr = await this.prisma.goodsReceipt.findFirst({
      where: { id, deletedAt: null },
      include: { po: { include: { supplier: true } }, lines: { include: { poLine: { include: { item: true } } } } },
    });
    if (!gr) throw new NotFoundException("Penerimaan Barang tidak ditemukan");
    return gr;
  }

  async create(dto: CreateGoodsReceiptDto, createdBy?: number) {
    const date = new Date(dto.date);
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: dto.poId, deletedAt: null }, include: { lines: true } });
    if (!po) throw new NotFoundException("PO tidak ditemukan");
    if (po.status === "cancelled") throw new BadRequestException("PO sudah dibatalkan");

    const poLineIds = new Set(po.lines.map((l) => l.id));
    for (const line of dto.lines) {
      if (!poLineIds.has(line.poLineId)) {
        throw new BadRequestException(`Baris PO ${line.poLineId} tidak ditemukan pada PO ini`);
      }
    }
    const itemByPoLine = new Map(po.lines.map((l) => [l.id, l.itemId]));

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("GR", po.companyId, date, tx);
      const gr = await tx.goodsReceipt.create({
        data: {
          no,
          date,
          poId: dto.poId,
          note: dto.note,
          createdBy,
          lines: { create: dto.lines.map((l) => ({ poLineId: l.poLineId, qtyReceived: l.qtyReceived })) },
        },
        include: { lines: true },
      });

      for (const line of dto.lines) {
        await tx.stockMove.create({
          data: {
            itemId: itemByPoLine.get(line.poLineId)!,
            date,
            refType: "goods_receipt",
            refId: gr.id,
            qtyIn: line.qtyReceived,
            projectId: po.projectId,
            note: `Penerimaan PO ${po.no}`,
            createdBy,
          },
        });
      }

      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "received" } });

      return gr;
    });
  }
}
