import { Module } from "@nestjs/common";
import { StockMovesService } from "./stock-moves.service";
import { StockMovesController } from "./stock-moves.controller";
import { CostingService } from "./costing.service";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
  imports: [WarehousesModule],
  providers: [StockMovesService, CostingService],
  controllers: [StockMovesController],
  exports: [StockMovesService, CostingService],
})
export class StockMovesModule {}
