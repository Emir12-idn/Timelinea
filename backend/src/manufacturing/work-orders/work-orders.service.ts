import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkOrderStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { CostingService } from "../../inventory/costing.service";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";

const WO_INCLUDE = { productItem: true, bom: { include: { lines: { include: { materialItem: true } } } }, warehouse: true, project: true } as const;

// draft -> in_progress -> done ; draft/in_progress -> cancelled. No other transition allowed.
const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["in_progress", "done", "cancelled"],
  in_progress: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

/**
 * Pabrikasi §2 (gap module) — Work Order. Posting ke "done" mengonsumsi bahan BOM
 * (stock-out via CostingService, biaya riil average/FIFO) dan menghasilkan barang
 * jadi (stock-in pada biaya = total bahan + conversion_cost), lalu memposting satu
 * jurnal produksi otomatis (JournalService.postProduction) — pola "no man touch"
 * yang sama dipakai transaksi lain di sistem ini.
 */
@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
    private costing: CostingService,
  ) {}

  findAll(status?: WorkOrderStatus, projectId?: number) {
    return this.prisma.workOrder.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}), ...(projectId ? { projectId } : {}) },
      include: WO_INCLUDE,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id, deletedAt: null }, include: WO_INCLUDE });
    if (!wo) throw new NotFoundException("Perintah Produksi (Work Order) tidak ditemukan");
    return wo;
  }

  async create(dto: CreateWorkOrderDto, createdBy?: number) {
    const bom = await this.prisma.billOfMaterial.findFirst({ where: { id: dto.bomId, deletedAt: null } });
    if (!bom) throw new NotFoundException("BOM tidak ditemukan");
    if (bom.itemId !== dto.productItemId) throw new BadRequestException("BOM tsb bukan untuk barang produk ini");

    const date = new Date(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("WO", undefined, date, tx);
      return tx.workOrder.create({
        data: {
          no,
          date,
          productItemId: dto.productItemId,
          bomId: dto.bomId,
          plannedQty: dto.plannedQty,
          warehouseId: dto.warehouseId,
          conversionCost: dto.conversionCost ?? 0,
          projectId: dto.projectId,
          note: dto.note,
          createdBy,
        },
        include: WO_INCLUDE,
      });
    });
  }

  async updateStatus(id: number, status: WorkOrderStatus, createdBy?: number) {
    const wo = await this.findOne(id);
    if (!ALLOWED_TRANSITIONS[wo.status].includes(status)) {
      throw new BadRequestException(`Tidak bisa mengubah status dari "${wo.status}" ke "${status}"`);
    }
    if (status !== "done") {
      return this.prisma.workOrder.update({ where: { id }, data: { status }, include: WO_INCLUDE });
    }

    const plannedQty = wo.plannedQty;
    return this.prisma.$transaction(async (tx) => {
      let materialCost = 0n;
      for (const line of wo.bom.lines) {
        const qtyToConsume = line.qtyPerUnit.mul(plannedQty);
        const { unitCost } = await this.costing.stockOut(tx, {
          itemId: line.materialItemId,
          warehouseId: wo.warehouseId,
          qty: qtyToConsume,
          date: wo.date,
          refType: "work_order",
          refId: wo.id,
          note: `Konsumsi bahan WO ${wo.no}`,
          createdBy,
        });
        materialCost += lineAmount(unitCost, qtyToConsume.toNumber());
      }

      const conversionCost = wo.conversionCost;
      const totalCost = materialCost + conversionCost;
      const fgUnitCost = plannedQty.gt(0)
        ? BigInt(new Prisma.Decimal(totalCost.toString()).div(plannedQty).toDecimalPlaces(0).toFixed(0))
        : 0n;

      await this.costing.stockIn(tx, {
        itemId: wo.productItemId,
        warehouseId: wo.warehouseId,
        qty: plannedQty,
        unitCost: fgUnitCost,
        date: wo.date,
        refType: "work_order",
        refId: wo.id,
        note: `Hasil produksi WO ${wo.no}`,
        createdBy,
      });

      if (totalCost > 0n) {
        await this.journal.postProduction(
          { workOrderId: wo.id, no: wo.no, date: wo.date, materialCost, conversionCost, companyId: null },
          tx,
          createdBy,
        );
      }

      return tx.workOrder.update({ where: { id: wo.id }, data: { status: "done" }, include: WO_INCLUDE });
    });
  }

  /** Laporan bahan terpakai — dari stock_moves refType='work_order' (qtyOut). */
  async materialsUsedReport(workOrderId?: number) {
    const moves = await this.prisma.stockMove.findMany({
      where: { refType: "work_order", qtyOut: { gt: 0 }, ...(workOrderId ? { refId: workOrderId } : {}) },
      include: { item: true },
      orderBy: { date: "desc" },
    });
    const workOrders = await this.prisma.workOrder.findMany({
      where: { id: { in: [...new Set(moves.map((m) => m.refId!))] } },
      select: { id: true, no: true },
    });
    const woById = new Map(workOrders.map((w) => [w.id, w.no]));
    return moves.map((m) => ({
      workOrderId: m.refId,
      workOrderNo: woById.get(m.refId!) ?? "-",
      date: m.date,
      itemCode: m.item.code,
      itemName: m.item.name,
      qty: m.qtyOut,
      unitCost: m.unitCost,
      amount: lineAmount(m.unitCost ?? 0n, m.qtyOut.toNumber()),
    }));
  }

  /** Laporan produksi rencana vs realisasi — actual = plannedQty kalau status done, 0 kalau belum/batal. */
  async productionReport(projectId?: number) {
    const orders = await this.findAll(undefined, projectId);
    return orders.map((wo) => ({
      id: wo.id,
      no: wo.no,
      date: wo.date,
      productCode: wo.productItem.code,
      productName: wo.productItem.name,
      status: wo.status,
      plannedQty: wo.plannedQty,
      actualQty: wo.status === "done" ? wo.plannedQty : new Prisma.Decimal(0),
      warehouse: wo.warehouse.name,
      projectId: wo.projectId,
    }));
  }
}
