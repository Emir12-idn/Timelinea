import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBomDto } from "./dto/create-bom.dto";
import { UpdateBomDto } from "./dto/update-bom.dto";

const BOM_INCLUDE = { item: true, lines: { include: { materialItem: true } } } as const;

/**
 * Pabrikasi §2 (gap module) — Bill of Material. Satu item produk bisa punya
 * beberapa versi BOM (riwayat perubahan resep), tapi hanya satu yang aktif
 * pada satu waktu — itulah yang dipakai sebagai default saat membuat Work Order.
 */
@Injectable()
export class BomService {
  constructor(private prisma: PrismaService) {}

  findAll(itemId?: number) {
    return this.prisma.billOfMaterial.findMany({
      where: { deletedAt: null, ...(itemId ? { itemId } : {}) },
      include: BOM_INCLUDE,
      orderBy: [{ itemId: "asc" }, { version: "desc" }],
    });
  }

  async findOne(id: number) {
    const bom = await this.prisma.billOfMaterial.findFirst({ where: { id, deletedAt: null }, include: BOM_INCLUDE });
    if (!bom) throw new NotFoundException("BOM tidak ditemukan");
    return bom;
  }

  async findActiveForItem(itemId: number) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { itemId, isActive: true, deletedAt: null },
      include: BOM_INCLUDE,
    });
    if (!bom) throw new NotFoundException("Belum ada BOM aktif untuk barang ini");
    return bom;
  }

  /** Versi baru otomatis jadi satu-satunya versi aktif untuk item tsb. */
  async create(dto: CreateBomDto, createdBy?: number) {
    return this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.billOfMaterial.findFirst({
        where: { itemId: dto.itemId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.billOfMaterial.updateMany({ where: { itemId: dto.itemId, isActive: true }, data: { isActive: false } });
      return tx.billOfMaterial.create({
        data: {
          itemId: dto.itemId,
          version: (lastVersion?.version ?? 0) + 1,
          isActive: true,
          createdBy,
          lines: { create: dto.lines },
        },
        include: BOM_INCLUDE,
      });
    });
  }

  async update(id: number, dto: UpdateBomDto) {
    const bom = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.billOfMaterial.updateMany({ where: { itemId: bom.itemId, isActive: true, id: { not: id } }, data: { isActive: false } });
      }
      return tx.billOfMaterial.update({ where: { id }, data: { isActive: dto.isActive }, include: BOM_INCLUDE });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.billOfMaterial.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }
}
