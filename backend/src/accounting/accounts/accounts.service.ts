import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.account.findMany({ orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException("Akun tidak ditemukan");
    return account;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }

  async update(id: number, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }
}
