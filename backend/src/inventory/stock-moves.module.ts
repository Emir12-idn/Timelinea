import { Module } from "@nestjs/common";
import { StockMovesService } from "./stock-moves.service";
import { StockMovesController } from "./stock-moves.controller";

@Module({
  providers: [StockMovesService],
  controllers: [StockMovesController],
  exports: [StockMovesService],
})
export class StockMovesModule {}
