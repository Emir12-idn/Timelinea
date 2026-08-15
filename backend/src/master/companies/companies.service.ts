import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundException("Perusahaan tidak ditemukan");
    return company;
  }

  create(dto: CreateCompanyDto, createdBy?: number) {
    return this.prisma.company.create({ data: { ...dto, createdBy } });
  }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
