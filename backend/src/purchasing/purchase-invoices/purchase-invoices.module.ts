import { Module } from "@nestjs/common";
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";

@Module({
  providers: [PurchaseInvoicesService],
  controllers: [PurchaseInvoicesController],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
