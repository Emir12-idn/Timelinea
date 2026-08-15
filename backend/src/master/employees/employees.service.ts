import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll(q?: string) {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { nik: { contains: q, mode: "insensitive" } }] } : {}),
    };
    return this.prisma.employee.findMany({ where, orderBy: { name: "asc" } });
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundException("Karyawan tidak ditemukan");
    return employee;
  }

  create(dto: CreateEmployeeDto, createdBy?: number) {
    return this.prisma.employee.create({
      data: { ...dto, joinDate: new Date(dto.joinDate), baseSalary: BigInt(dto.baseSalary), createdBy },
    });
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        baseSalary: dto.baseSalary !== undefined ? BigInt(dto.baseSalary) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }
}
