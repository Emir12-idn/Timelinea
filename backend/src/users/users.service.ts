import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  employeeId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({ where: { deletedAt: null }, select: SAFE_SELECT, orderBy: { name: "asc" } });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan");
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email sudah terdaftar");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        employeeId: dto.employeeId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        employeeId: dto.employeeId,
        isActive: dto.isActive,
      },
      select: SAFE_SELECT,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }
}
