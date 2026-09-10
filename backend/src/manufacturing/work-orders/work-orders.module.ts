import { Module } from "@nestjs/common";
import { WorkOrdersService } from "./work-orders.service";
import { WorkOrdersController } from "./work-orders.controller";
import { StockMovesModule } from "../../inventory/stock-moves.module";

@Module({
  imports: [StockMovesModule],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
