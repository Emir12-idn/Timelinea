import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { CreateSalesOrderDto } from "./dto/create-sales-order.dto";

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
  ) {}

  findAll() {
    return this.prisma.salesOrder.findMany({
      where: { deletedAt: null },
      include: { customer: true, project: true, lines: { include: { item: true } } },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, project: true, lines: { include: { item: true } } },
    });
    if (!so) throw new NotFoundException("Pesanan Penjualan tidak ditemukan");
    return so;
  }

  async create(dto: CreateSalesOrderDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("SO", dto.companyId, date, tx);
      return tx.salesOrder.create({
        data: {
          no,
          date,
          customerId: dto.customerId,
          companyId: dto.companyId,
          projectId: dto.projectId,
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
}
