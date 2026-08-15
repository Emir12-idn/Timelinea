import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateItemGroupDto } from "./dto/create-item-group.dto";
import { UpdateItemGroupDto } from "./dto/update-item-group.dto";

@Injectable()
export class ItemGroupsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.itemGroup.findMany({ orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const group = await this.prisma.itemGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Grup barang tidak ditemukan");
    return group;
  }

  create(dto: CreateItemGroupDto) {
    return this.prisma.itemGroup.create({ data: dto });
  }

  async update(id: number, dto: UpdateItemGroupDto) {
    await this.findOne(id);
    return this.prisma.itemGroup.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.itemGroup.delete({ where: { id } });
    return { ok: true };
  }
}
