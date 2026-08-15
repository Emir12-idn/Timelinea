import { Module } from "@nestjs/common";
import { DeliveryOrdersService } from "./delivery-orders.service";
import { DeliveryOrdersController } from "./delivery-orders.controller";

@Module({
  providers: [DeliveryOrdersService],
  controllers: [DeliveryOrdersController],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
