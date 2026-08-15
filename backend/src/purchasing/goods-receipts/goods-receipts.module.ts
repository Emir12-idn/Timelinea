import { Module } from "@nestjs/common";
import { GoodsReceiptsService } from "./goods-receipts.service";
import { GoodsReceiptsController } from "./goods-receipts.controller";

@Module({
  providers: [GoodsReceiptsService],
  controllers: [GoodsReceiptsController],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
