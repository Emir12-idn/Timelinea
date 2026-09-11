import { Module } from "@nestjs/common";
import { PurchaseRequestsService } from "./purchase-requests.service";
import { PurchaseRequestsController } from "./purchase-requests.controller";
import { PurchaseOrdersModule } from "../purchase-orders/purchase-orders.module";

@Module({
  imports: [PurchaseOrdersModule],
  providers: [PurchaseRequestsService],
  controllers: [PurchaseRequestsController],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
