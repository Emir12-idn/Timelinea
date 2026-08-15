import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { CreateDeliveryOrderDto } from "./dto/create-delivery-order.dto";

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
  ) {}

  findAll() {
    return this.prisma.deliveryOrder.findMany({
      where: { deletedAt: null },
      include: { so: { include: { customer: true } }, project: true, lines: { include: { item: true } } },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const deliveryOrder = await this.prisma.deliveryOrder.findFirst({
      where: { id, deletedAt: null },
      include: { so: { include: { customer: true } }, project: true, lines: { include: { item: true } } },
    });
    if (!deliveryOrder) throw new NotFoundException("Surat Jalan tidak ditemukan");
    return deliveryOrder;
  }

  async create(dto: CreateDeliveryOrderDto, createdBy?: number) {
    const date = new Date(dto.date);
    let companyId: number | undefined;
    if (dto.soId) {
      const so = await this.prisma.salesOrder.findFirst({ where: { id: dto.soId } });
      companyId = so?.companyId ?? undefined;
    }

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("DO", companyId, date, tx);
      const deliveryOrder = await tx.deliveryOrder.create({
        data: {
          no,
          date,
          soId: dto.soId,
          projectId: dto.projectId,
          status: "delivered",
          createdBy,
          lines: { create: dto.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })) },
        },
        include: { lines: true },
      });

      for (const line of dto.lines) {
        await tx.stockMove.create({
          data: {
            itemId: line.itemId,
            date,
            refType: "delivery_order",
            refId: deliveryOrder.id,
            qtyOut: line.qty,
            projectId: dto.projectId,
            note: `Surat jalan ${deliveryOrder.no}`,
            createdBy,
          },
        });
      }

      return deliveryOrder;
    });
  }
}
