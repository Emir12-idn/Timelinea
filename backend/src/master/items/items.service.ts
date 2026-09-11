import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ItemType, CostingMethod } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { parseCsv, toCsv } from "../../common/csv.util";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

const ITEM_TYPES: ItemType[] = ["stock", "service"];
const COSTING_METHODS: CostingMethod[] = ["average", "fifo"];
const ITEM_EXPORT_COLUMNS = ["code", "name", "uom", "type", "minStock", "lastCost", "costingMethod", "tracksExpiry", "barcode"];

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  findAll(q?: string) {
    const where: Prisma.ItemWhereInput = {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    };
    return this.prisma.item.findMany({ where, include: { group: true }, orderBy: { name: "asc" } });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findFirst({ where: { id, deletedAt: null }, include: { group: true } });
    if (!item) throw new NotFoundException("Barang/jasa tidak ditemukan");
    return item;
  }

  /** Stok berjalan = SUM(qty_in) - SUM(qty_out) dari stock_moves — tidak pernah disimpan statis. */
  async stockOnHand(id: number) {
    await this.findOne(id);
    const agg = await this.prisma.stockMove.aggregate({
      where: { itemId: id },
      _sum: { qtyIn: true, qtyOut: true },
    });
    const qtyIn = agg._sum.qtyIn ?? 0;
    const qtyOut = agg._sum.qtyOut ?? 0;
    return { itemId: id, onHand: Number(qtyIn) - Number(qtyOut) };
  }

  create(dto: CreateItemDto, createdBy?: number) {
    return this.prisma.item.create({
      data: {
        ...dto,
        minStock: dto.minStock !== undefined ? dto.minStock : undefined,
        lastCost: dto.lastCost !== undefined ? BigInt(dto.lastCost) : undefined,
        createdBy,
      },
    });
  }

  async update(id: number, dto: UpdateItemDto) {
    await this.findOne(id);
    return this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        lastCost: dto.lastCost !== undefined ? BigInt(dto.lastCost) : undefined,
      },
    });
  }

  /**
   * §10 data design, item 6 — tidak boleh menghapus barang/jasa yang sudah pernah
   * dipakai di transaksi (mutasi stok atau baris dokumen manapun), supaya riwayat
   * transaksi lama tidak kehilangan referensi barangnya dari daftar aktif.
   */
  async remove(id: number) {
    await this.findOne(id);
    const refCount = await this.prisma.$transaction([
      this.prisma.stockMove.count({ where: { itemId: id } }),
      this.prisma.purchaseOrderLine.count({ where: { itemId: id } }),
      this.prisma.salesOrderLine.count({ where: { itemId: id } }),
      this.prisma.deliveryOrderLine.count({ where: { itemId: id } }),
      this.prisma.salesInvoiceLine.count({ where: { itemId: id } }),
    ]).then((counts) => counts.reduce((s, c) => s + c, 0));
    if (refCount > 0) {
      throw new BadRequestException("Barang/jasa ini sudah pernah dipakai di transaksi — tidak bisa dihapus");
    }
    await this.prisma.item.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  /**
   * §11 data design, item 4 — import CSV Barang & Jasa (master data). Upsert per
   * baris berdasarkan `code` (kolom wajib) — kode yang sudah ada di-update, kode
   * baru dibuat baru. Setiap baris divalidasi & diproses independen: satu baris
   * gagal (kolom wajib kosong/tipe tidak valid) tidak menggagalkan baris lain,
   * dikumpulkan di `errors` dengan nomor baris (1-based, header = baris 1) supaya
   * user bisa perbaiki & impor ulang cuma baris yang gagal.
   */
  async importCsv(csvText: string, createdBy?: number) {
    const rows = parseCsv(csvText);
    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNo = i + 2; // +1 header, +1 1-based
      try {
        if (!r.code) throw new Error("kolom code wajib diisi");
        if (!r.name) throw new Error("kolom name wajib diisi");
        if (!r.uom) throw new Error("kolom uom wajib diisi");
        const type = (r.type || "stock") as ItemType;
        if (!ITEM_TYPES.includes(type)) throw new Error(`type harus salah satu dari: ${ITEM_TYPES.join(", ")}`);
        const costingMethod = (r.costingMethod || "average") as CostingMethod;
        if (!COSTING_METHODS.includes(costingMethod)) {
          throw new Error(`costingMethod harus salah satu dari: ${COSTING_METHODS.join(", ")}`);
        }
        const minStock = r.minStock ? Number(r.minStock) : undefined;
        if (minStock !== undefined && Number.isNaN(minStock)) throw new Error("minStock harus angka");
        const tracksExpiry = ["true", "1", "yes", "ya"].includes((r.tracksExpiry || "").toLowerCase());

        const existing = await this.prisma.item.findUnique({ where: { code: r.code } });
        if (existing) {
          await this.prisma.item.update({
            where: { code: r.code },
            data: { name: r.name, uom: r.uom, type, costingMethod, minStock, tracksExpiry, barcode: r.barcode || undefined },
          });
          updated++;
        } else {
          await this.prisma.item.create({
            data: { code: r.code, name: r.name, uom: r.uom, type, costingMethod, minStock, tracksExpiry, barcode: r.barcode || undefined, createdBy },
          });
          created++;
        }
      } catch (err) {
        errors.push({ row: rowNo, message: err instanceof Error ? err.message : String(err) });
      }
    }
    return { created, updated, errors };
  }

  async exportCsv(): Promise<string> {
    const items = await this.findAll();
    return toCsv(items, ITEM_EXPORT_COLUMNS);
  }
}
