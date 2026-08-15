import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";

@Injectable()
export class StockMovesService {
  constructor(private prisma: PrismaService) {}

  findAll(itemId?: number, projectId?: number) {
    return this.prisma.stockMove.findMany({
      where: {
        ...(itemId ? { itemId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: { item: true, project: true },
      orderBy: { date: "desc" },
    });
  }

  createAdjustment(dto: CreateStockAdjustmentDto, createdBy?: number) {
    if (!dto.qtyIn && !dto.qtyOut) {
      throw new BadRequestException("Isi qtyIn atau qtyOut untuk penyesuaian persediaan");
    }
    return this.prisma.stockMove.create({
      data: {
        itemId: dto.itemId,
        date: new Date(dto.date),
        refType: "adjustment",
        qtyIn: dto.qtyIn ?? 0,
        qtyOut: dto.qtyOut ?? 0,
        projectId: dto.projectId,
        note: dto.note,
        createdBy,
      },
    });
  }
}
