import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CostingService } from "./costing.service";
import { toCsv } from "../common/csv.util";
import { AuditLogService } from "../common/audit-log/audit-log.service";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";

const STOCK_MOVE_EXPORT_COLUMNS = [
  "date",
  "itemCode",
  "itemName",
  "warehouseCode",
  "qtyIn",
  "qtyOut",
  "unitCost",
  "refType",
  "refId",
  "batchNo",
  "expiryDate",
  "note",
];

@Injectable()
export class StockMovesService {
  constructor(
    private prisma: PrismaService,
    private costing: CostingService,
    private auditLog: AuditLogService,
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

  /** §11 data design, item 4 — export CSV daftar mutasi stok. */
  async exportCsv(itemId?: number, projectId?: number, warehouseId?: number): Promise<string> {
    const moves = await this.findAll(itemId, projectId, warehouseId);
    const rows = moves.map((m) => ({
      ...m,
      itemCode: m.item.code,
      itemName: m.item.name,
      warehouseCode: m.warehouse?.code ?? "",
    }));
    return toCsv(rows, STOCK_MOVE_EXPORT_COLUMNS);
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

  /**
   * "Transfer Barang" — pindah stok antar gudang pada biaya yang sama (engine
   * costing di gudang asal). §14 data design (pass keenam), item 3 — round-1
   * module (§9.1) yang belum punya audit trail; transfer memindahkan stok
   * sungguhan antar gudang (bukan cuma baca), jadi diaudit sama seperti aksi
   * state-changing lain, dicatat di `stock` transaksi yang sama (atomik lewat
   * `db` opsional AuditLogService, pola sama dengan WorkOrder posting produksi).
   */
  async transfer(dto: CreateTransferDto, createdBy?: number) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const result = await this.costing.transfer(tx, {
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
      });
      await this.auditLog.record(
        {
          actorId: createdBy,
          action: "transfer",
          entityType: "stock_move",
          entityId: result.inMove.id,
          before: null,
          after: {
            itemId: dto.itemId,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
            qty: dto.qty,
            unitCost: result.unitCost,
          },
        },
        tx,
      );
      return result;
    });
  }
}
