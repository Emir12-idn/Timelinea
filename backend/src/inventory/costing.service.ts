import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { lineAmount } from "../common/money.util";

type Db = PrismaService | Prisma.TransactionClient;

export interface StockInParams {
  itemId: number;
  warehouseId: number;
  qty: number | Prisma.Decimal;
  unitCost: bigint;
  date: Date;
  refType: string;
  refId?: number;
  batchNo?: string;
  serialNo?: string;
  expiryDate?: Date;
  projectId?: number;
  note?: string;
  createdBy?: number | null;
}

export interface StockOutParams {
  itemId: number;
  warehouseId: number;
  qty: number | Prisma.Decimal;
  date: Date;
  refType: string;
  refId?: number;
  batchNo?: string;
  serialNo?: string;
  projectId?: number;
  note?: string;
  createdBy?: number | null;
}

/**
 * Persediaan §1 (gap module) — engine costing multi-gudang. Stok tetap dihitung
 * dari stock_moves (prinsip yang sudah ada), tidak ada saldo tersimpan statis:
 * - average: rata-rata bergerak dihitung on-the-fly dari nilai on-hand (SUM
 *   qtyIn*unitCost - qtyOut*unitCost) dibagi qty on-hand, per item+gudang.
 * - fifo: layer biaya (stock_layers) dikonsumsi dari yang tertua (in_date/id asc).
 * Setiap stock-out menuliskan unitCost hasil konsumsi ke stock_move-nya sendiri —
 * itulah yang dipakai modul lain (HPP penjualan, konsumsi bahan produksi) sebagai
 * biaya riil, bukan placeholder.
 */
@Injectable()
export class CostingService {
  constructor(private prisma: PrismaService) {}

  async getDefaultWarehouseId(db: Db = this.prisma): Promise<number> {
    const warehouse =
      (await db.warehouse.findFirst({ where: { isDefault: true, deletedAt: null } })) ??
      (await db.warehouse.findFirst({ where: { deletedAt: null }, orderBy: { id: "asc" } }));
    if (!warehouse) {
      throw new BadRequestException("Belum ada gudang — tambahkan gudang terlebih dahulu di menu Persediaan > Gudang");
    }
    return warehouse.id;
  }

  /** Nilai & qty on-hand item di satu gudang, diturunkan dari stock_moves (bukan angka tersimpan). */
  private async onHandState(db: Db, itemId: number, warehouseId: number) {
    const moves = await db.stockMove.findMany({
      where: { itemId, warehouseId },
      select: { qtyIn: true, qtyOut: true, unitCost: true },
    });
    let qty = new Prisma.Decimal(0);
    let value = 0n;
    for (const m of moves) {
      const cost = m.unitCost ?? 0n;
      qty = qty.plus(m.qtyIn).minus(m.qtyOut);
      value += lineAmount(cost, m.qtyIn.toNumber()) - lineAmount(cost, m.qtyOut.toNumber());
    }
    return { qty, value };
  }

  /** Biaya rata-rata bergerak saat ini (0 kalau belum ada stok on-hand). */
  async averageCost(db: Db, itemId: number, warehouseId: number): Promise<bigint> {
    const { qty, value } = await this.onHandState(db, itemId, warehouseId);
    if (qty.lte(0)) return 0n;
    return BigInt(new Prisma.Decimal(value.toString()).div(qty).toDecimalPlaces(0).toFixed(0));
  }

  /** Konsumsi layer FIFO tertua dulu; mengembalikan biaya rata-rata tertimbang dari qty yang benar-benar terkonsumsi. */
  private async consumeFifoLayers(db: Db, itemId: number, warehouseId: number, qty: Prisma.Decimal): Promise<bigint> {
    let remaining = qty;
    let totalCost = 0n;
    const layers = await db.stockLayer.findMany({
      where: { itemId, warehouseId, qtyRemaining: { gt: 0 } },
      orderBy: [{ inDate: "asc" }, { id: "asc" }],
    });
    for (const layer of layers) {
      if (remaining.lte(0)) break;
      const take = Prisma.Decimal.min(remaining, layer.qtyRemaining);
      totalCost += lineAmount(layer.unitCost, take.toNumber());
      remaining = remaining.minus(take);
      await db.stockLayer.update({ where: { id: layer.id }, data: { qtyRemaining: layer.qtyRemaining.minus(take) } });
    }
    // Kalau layer tidak cukup (stok negatif / data lama tanpa layer), sisanya dianggap
    // berbiaya 0 — tidak menghentikan transaksi, konsisten dengan stok yang memang
    // sudah dihitung dari mutasi apa adanya (bisa negatif kalau ada salah input).
    const consumedQty = qty.minus(remaining);
    if (consumedQty.lte(0)) return 0n;
    return BigInt(new Prisma.Decimal(totalCost.toString()).div(consumedQty).toDecimalPlaces(0).toFixed(0));
  }

  /** Stock-in: mencatat mutasi masuk pada biaya perolehan yang diberikan, dan (untuk FIFO) membuka layer baru. */
  async stockIn(db: Db, params: StockInParams) {
    const item = await db.item.findUniqueOrThrow({ where: { id: params.itemId } });
    const move = await db.stockMove.create({
      data: {
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        date: params.date,
        refType: params.refType,
        refId: params.refId,
        qtyIn: params.qty,
        unitCost: params.unitCost,
        batchNo: params.batchNo,
        serialNo: params.serialNo,
        expiryDate: params.expiryDate,
        projectId: params.projectId,
        note: params.note,
        createdBy: params.createdBy ?? undefined,
      },
    });
    if (item.costingMethod === "fifo") {
      await db.stockLayer.create({
        data: {
          itemId: params.itemId,
          warehouseId: params.warehouseId,
          qtyRemaining: params.qty,
          unitCost: params.unitCost,
          inDate: params.date,
        },
      });
    }
    await db.item.update({ where: { id: params.itemId }, data: { lastCost: params.unitCost } });
    return move;
  }

  /** Stock-out: menghitung biaya konsumsi lewat engine (average/FIFO) lalu mencatat mutasi keluar pada biaya itu. */
  async stockOut(db: Db, params: StockOutParams) {
    const item = await db.item.findUniqueOrThrow({ where: { id: params.itemId } });
    const qty = params.qty instanceof Prisma.Decimal ? params.qty : new Prisma.Decimal(params.qty);
    const unitCost =
      item.costingMethod === "fifo"
        ? await this.consumeFifoLayers(db, params.itemId, params.warehouseId, qty)
        : await this.averageCost(db, params.itemId, params.warehouseId);

    const move = await db.stockMove.create({
      data: {
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        date: params.date,
        refType: params.refType,
        refId: params.refId,
        qtyOut: qty,
        unitCost,
        batchNo: params.batchNo,
        serialNo: params.serialNo,
        projectId: params.projectId,
        note: params.note,
        createdBy: params.createdBy ?? undefined,
      },
    });
    return { move, unitCost };
  }

  /** Pindah gudang: stock-out dari gudang asal (biaya via engine) lalu stock-in ke gudang tujuan pada biaya yang sama. */
  async transfer(
    db: Db,
    params: {
      itemId: number;
      fromWarehouseId: number;
      toWarehouseId: number;
      qty: number;
      date: Date;
      refType: string;
      refId?: number;
      batchNo?: string;
      serialNo?: string;
      note?: string;
      createdBy?: number | null;
    },
  ) {
    if (params.fromWarehouseId === params.toWarehouseId) {
      throw new BadRequestException("Gudang asal dan tujuan tidak boleh sama");
    }
    const { unitCost } = await this.stockOut(db, {
      itemId: params.itemId,
      warehouseId: params.fromWarehouseId,
      qty: params.qty,
      date: params.date,
      refType: params.refType,
      refId: params.refId,
      batchNo: params.batchNo,
      serialNo: params.serialNo,
      note: params.note,
      createdBy: params.createdBy,
    });
    const inMove = await this.stockIn(db, {
      itemId: params.itemId,
      warehouseId: params.toWarehouseId,
      qty: params.qty,
      unitCost,
      date: params.date,
      refType: params.refType,
      refId: params.refId,
      batchNo: params.batchNo,
      serialNo: params.serialNo,
      note: params.note,
      createdBy: params.createdBy,
    });
    return { unitCost, inMove };
  }
}
