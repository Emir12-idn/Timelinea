import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PartnerType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { parseCsv, toCsv } from "../../common/csv.util";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";

const PARTNER_TYPES: PartnerType[] = ["customer", "supplier", "both"];
const PARTNER_EXPORT_COLUMNS = ["code", "name", "type", "npwp", "address", "phone", "email", "termDays"];

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

  /**
   * §11 data design, item 4 — import CSV Pemasok/Pelanggan (master data). Upsert
   * per baris berdasarkan `code`, sama pola dengan ItemsService.importCsv: satu
   * baris gagal tidak menggagalkan baris lain, dikumpulkan di `errors`.
   */
  async importCsv(csvText: string, createdBy?: number) {
    const rows = parseCsv(csvText);
    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNo = i + 2;
      try {
        if (!r.code) throw new Error("kolom code wajib diisi");
        if (!r.name) throw new Error("kolom name wajib diisi");
        const type = (r.type || "customer") as PartnerType;
        if (!PARTNER_TYPES.includes(type)) throw new Error(`type harus salah satu dari: ${PARTNER_TYPES.join(", ")}`);
        const termDays = r.termDays ? Number(r.termDays) : undefined;
        if (termDays !== undefined && Number.isNaN(termDays)) throw new Error("termDays harus angka");

        const data = {
          name: r.name,
          type,
          npwp: r.npwp || undefined,
          address: r.address || undefined,
          phone: r.phone || undefined,
          email: r.email || undefined,
          termDays,
        };
        const existing = await this.prisma.partner.findUnique({ where: { code: r.code } });
        if (existing) {
          await this.prisma.partner.update({ where: { code: r.code }, data });
          updated++;
        } else {
          await this.prisma.partner.create({ data: { code: r.code, ...data, createdBy } });
          created++;
        }
      } catch (err) {
        errors.push({ row: rowNo, message: err instanceof Error ? err.message : String(err) });
      }
    }
    return { created, updated, errors };
  }

  async exportCsv(type?: PartnerType): Promise<string> {
    const partners = await this.findAll(undefined, type);
    return toCsv(partners, PARTNER_EXPORT_COLUMNS);
  }
}
