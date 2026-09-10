import { Module } from "@nestjs/common";
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";
import { StockMovesModule } from "../../inventory/stock-moves.module";

@Module({
  imports: [StockMovesModule],
  providers: [PurchaseInvoicesService],
  controllers: [PurchaseInvoicesController],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
