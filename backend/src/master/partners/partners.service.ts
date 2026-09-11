import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

  /**
   * §10 data design, item 6 — tidak boleh menghapus mitra (pemasok/pelanggan)
   * yang sudah punya transaksi tertaut, supaya riwayatnya tidak "kehilangan"
   * pemasok/pelanggannya dari daftar aktif (mirip Accurate: master data yang
   * sudah dipakai transaksi tidak bisa dihapus, hanya bisa dinonaktifkan).
   */
  async remove(id: number) {
    await this.findOne(id);
    const refCount = await this.prisma.$transaction([
      this.prisma.purchaseOrder.count({ where: { supplierId: id, deletedAt: null } }),
      this.prisma.salesOrder.count({ where: { customerId: id, deletedAt: null } }),
      this.prisma.purchaseInvoice.count({ where: { supplierId: id, deletedAt: null } }),
      this.prisma.salesInvoice.count({ where: { customerId: id, deletedAt: null } }),
      this.prisma.project.count({ where: { customerId: id, deletedAt: null } }),
    ]).then((counts) => counts.reduce((s, c) => s + c, 0));
    if (refCount > 0) {
      throw new BadRequestException("Mitra ini sudah dipakai di transaksi (PO/SO/faktur/proyek) — tidak bisa dihapus");
    }
    await this.prisma.partner.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
