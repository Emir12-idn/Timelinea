import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { StockMovesService } from "./stock-moves.service";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("stock-moves")
export class StockMovesController {
  constructor(private service: StockMovesService) {}

  @Get()
  findAll(@Query("itemId") itemId?: string, @Query("projectId") projectId?: string, @Query("warehouseId") warehouseId?: string) {
    return this.service.findAll(
      itemId ? Number(itemId) : undefined,
      projectId ? Number(projectId) : undefined,
      warehouseId ? Number(warehouseId) : undefined,
    );
  }

  @Get("by-warehouse/:itemId")
  stockByWarehouse(@Param("itemId", ParseIntPipe) itemId: number) {
    return this.service.stockByWarehouse(itemId);
  }

  /** §11 data design, item 4 — export CSV. */
  @Get("export/csv")
  async exportCsv(
    @Res() res: Response,
    @Query("itemId") itemId?: string,
    @Query("projectId") projectId?: string,
    @Query("warehouseId") warehouseId?: string,
  ) {
    const csv = await this.service.exportCsv(
      itemId ? Number(itemId) : undefined,
      projectId ? Number(projectId) : undefined,
      warehouseId ? Number(warehouseId) : undefined,
    );
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="stock-moves.csv"' });
    res.send(csv);
  }

  @Post("adjustments")
  createAdjustment(@Body() dto: CreateStockAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.service.createAdjustment(dto, user.id);
  }

  @Post("transfers")
  transfer(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthUser) {
    return this.service.transfer(dto, user.id);
  }
}
