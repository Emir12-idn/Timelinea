import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PartnerType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  findAll(q?: string, type?: PartnerType) {
    const where: Prisma.PartnerWhereInput = {
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    };
    return this.prisma.partner.findMany({ where, orderBy: { name: "asc" } });
  }

  async findOne(id: number) {
    const partner = await this.prisma.partner.findFirst({ where: { id, deletedAt: null } });
    if (!partner) throw new NotFoundException("Mitra (pemasok/pelanggan) tidak ditemukan");
    return partner;
  }

  create(dto: CreatePartnerDto, createdBy?: number) {
    return this.prisma.partner.create({ data: { ...dto, createdBy } });
  }

  async update(id: number, dto: UpdatePartnerDto) {
    await this.findOne(id);
    return this.prisma.partner.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.partner.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
