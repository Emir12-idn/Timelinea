import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { StockMovesService } from "./stock-moves.service";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("stock-moves")
export class StockMovesController {
  constructor(private service: StockMovesService) {}

  @Get()
  findAll(@Query("itemId") itemId?: string, @Query("projectId") projectId?: string) {
    return this.service.findAll(itemId ? Number(itemId) : undefined, projectId ? Number(projectId) : undefined);
  }

  @Post("adjustments")
  createAdjustment(@Body() dto: CreateStockAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.service.createAdjustment(dto, user.id);
  }
}
