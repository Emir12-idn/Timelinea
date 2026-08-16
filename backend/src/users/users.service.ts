import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { displayName } from "../auth/role-label.util";
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

/** Adds the computed "{RoleLabel} {name}" (e.g. "HRD Agus") to a user record. */
function withDisplayName<T extends { name: string; role: Role }>(user: T) {
  return { ...user, displayName: displayName(user.name, user.role) };
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({ where: { deletedAt: null }, select: SAFE_SELECT, orderBy: { name: "asc" } });
    return users.map(withDisplayName);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan");
    return withDisplayName(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email sudah terdaftar");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
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
    return withDisplayName(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
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
    return withDisplayName(user);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }
}
