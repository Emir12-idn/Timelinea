import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CostingService } from "./costing.service";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";

@Injectable()
export class StockMovesService {
  constructor(
    private prisma: PrismaService,
    private costing: CostingService,
  ) {}

  findAll(itemId?: number, projectId?: number, warehouseId?: number) {
    return this.prisma.stockMove.findMany({
      where: {
        ...(itemId ? { itemId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: { item: true, project: true, warehouse: true },
      orderBy: { date: "desc" },
    });
  }

  /** Stok on-hand per item per gudang — dari stock_moves, bukan angka tersimpan. */
  async stockByWarehouse(itemId: number) {
    const rows = await this.prisma.stockMove.groupBy({
      by: ["warehouseId"],
      where: { itemId, warehouseId: { not: null } },
      _sum: { qtyIn: true, qtyOut: true },
    });
    const warehouses = await this.prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
    const byWarehouseId = new Map(rows.map((r) => [r.warehouseId, r]));
    return warehouses.map((w) => {
      const row = byWarehouseId.get(w.id);
      const onHand = Number(row?._sum.qtyIn ?? 0) - Number(row?._sum.qtyOut ?? 0);
      return { warehouseId: w.id, warehouseCode: w.code, warehouseName: w.name, onHand };
    });
  }

  async createAdjustment(dto: CreateStockAdjustmentDto, createdBy?: number) {
    if (!dto.qtyIn && !dto.qtyOut) {
      throw new BadRequestException("Isi qtyIn atau qtyOut untuk penyesuaian persediaan");
    }
    if (dto.qtyIn && dto.qtyOut) {
      throw new BadRequestException("Isi salah satu saja: qtyIn atau qtyOut, tidak keduanya");
    }
    const date = new Date(dto.date);

    return this.prisma.$transaction(async (tx) => {
      const warehouseId = dto.warehouseId ?? (await this.costing.getDefaultWarehouseId(tx));

      if (dto.qtyIn) {
        const item = await tx.item.findUniqueOrThrow({ where: { id: dto.itemId } });
        const unitCost = dto.unitCost !== undefined ? BigInt(dto.unitCost) : (item.lastCost ?? 0n);
        return this.costing.stockIn(tx, {
          itemId: dto.itemId,
          warehouseId,
          qty: dto.qtyIn,
          unitCost,
          date,
          refType: "adjustment",
          batchNo: dto.batchNo,
          serialNo: dto.serialNo,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          projectId: dto.projectId,
          note: dto.note,
          createdBy,
        });
      }

      const { move } = await this.costing.stockOut(tx, {
        itemId: dto.itemId,
        warehouseId,
        qty: dto.qtyOut!,
        date,
        refType: "adjustment",
        batchNo: dto.batchNo,
        serialNo: dto.serialNo,
        projectId: dto.projectId,
        note: dto.note,
        createdBy,
      });
      return move;
    });
  }

  /** "Transfer Barang" — pindah stok antar gudang pada biaya yang sama (engine costing di gudang asal). */
  async transfer(dto: CreateTransferDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction((tx) =>
      this.costing.transfer(tx, {
        itemId: dto.itemId,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        qty: dto.qty,
        date,
        refType: "transfer",
        batchNo: dto.batchNo,
        serialNo: dto.serialNo,
        note: dto.note ?? "Transfer antar gudang",
        createdBy,
      }),
    );
  }
}
