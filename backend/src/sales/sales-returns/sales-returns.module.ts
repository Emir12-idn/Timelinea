import { Module } from "@nestjs/common";
import { SalesReturnsService } from "./sales-returns.service";
import { SalesReturnsController } from "./sales-returns.controller";
import { StockMovesModule } from "../../inventory/stock-moves.module";

@Module({
  imports: [StockMovesModule],
  providers: [SalesReturnsService],
  controllers: [SalesReturnsController],
  exports: [SalesReturnsService],
})
export class SalesReturnsModule {}
