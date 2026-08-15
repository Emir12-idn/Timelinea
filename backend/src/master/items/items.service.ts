import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  findAll(q?: string) {
    const where: Prisma.ItemWhereInput = {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    };
    return this.prisma.item.findMany({ where, include: { group: true }, orderBy: { name: "asc" } });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findFirst({ where: { id, deletedAt: null }, include: { group: true } });
    if (!item) throw new NotFoundException("Barang/jasa tidak ditemukan");
    return item;
  }

  /** Stok berjalan = SUM(qty_in) - SUM(qty_out) dari stock_moves — tidak pernah disimpan statis. */
  async stockOnHand(id: number) {
    await this.findOne(id);
    const agg = await this.prisma.stockMove.aggregate({
      where: { itemId: id },
      _sum: { qtyIn: true, qtyOut: true },
    });
    const qtyIn = agg._sum.qtyIn ?? 0;
    const qtyOut = agg._sum.qtyOut ?? 0;
    return { itemId: id, onHand: Number(qtyIn) - Number(qtyOut) };
  }

  create(dto: CreateItemDto, createdBy?: number) {
    return this.prisma.item.create({
      data: {
        ...dto,
        minStock: dto.minStock !== undefined ? dto.minStock : undefined,
        lastCost: dto.lastCost !== undefined ? BigInt(dto.lastCost) : undefined,
        createdBy,
      },
    });
  }

  async update(id: number, dto: UpdateItemDto) {
    await this.findOne(id);
    return this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        lastCost: dto.lastCost !== undefined ? BigInt(dto.lastCost) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.item.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
