import { Module } from "@nestjs/common";
import { DeliveryOrdersService } from "./delivery-orders.service";
import { DeliveryOrdersController } from "./delivery-orders.controller";
import { StockMovesModule } from "../../inventory/stock-moves.module";

@Module({
  imports: [StockMovesModule],
  providers: [DeliveryOrdersService],
  controllers: [DeliveryOrdersController],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
