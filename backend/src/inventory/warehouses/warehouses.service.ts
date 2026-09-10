import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!warehouse) throw new NotFoundException("Gudang tidak ditemukan");
    return warehouse;
  }

  create(dto: CreateWarehouseDto, createdBy?: number) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.warehouse.create({ data: { ...dto, createdBy } });
    });
  }

  async update(id: number, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.warehouse.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return tx.warehouse.update({ where: { id }, data: dto });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
