import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { toCsv } from "../../common/csv.util";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

const WAREHOUSE_EXPORT_COLUMNS = ["code", "name", "address", "isDefault"];

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
  }

  /**
   * §14 data design (pass keenam), item 4 (Part B CSV sweep) — round-1 module
   * (§9.1) the round-3 CSV pass (§11.4) never reached (Item/Partner/
   * PurchaseInvoice/SalesInvoice/StockMove only). Export-only (no import):
   * the warehouse list is short/rarely-changing master data, so a bulk-edit-
   * then-import flow isn't worth building — a plain read-only export for
   * reference/backup is the useful part (judgment call, see final report).
   */
  async exportCsv(): Promise<string> {
    const warehouses = await this.findAll();
    return toCsv(warehouses, WAREHOUSE_EXPORT_COLUMNS);
  }

  async findOne(id: number) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!warehouse) throw new NotFoundException("Gudang tidak ditemukan");
    return warehouse;
  }

  create(dto: CreateWarehouseDto, createdBy?: number) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.warehouse.create({ data: { ...dto, createdBy } });
    });
  }

  async update(id: number, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.warehouse.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return tx.warehouse.update({ where: { id }, data: dto });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
