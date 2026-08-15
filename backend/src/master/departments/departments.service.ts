import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({ orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException("Departemen tidak ditemukan");
    return dept;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
    return { ok: true };
  }
}
