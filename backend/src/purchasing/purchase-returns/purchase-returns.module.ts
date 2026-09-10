import { Module } from "@nestjs/common";
import { PurchaseReturnsService } from "./purchase-returns.service";
import { PurchaseReturnsController } from "./purchase-returns.controller";
import { StockMovesModule } from "../../inventory/stock-moves.module";

@Module({
  imports: [StockMovesModule],
  providers: [PurchaseReturnsService],
  controllers: [PurchaseReturnsController],
  exports: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
