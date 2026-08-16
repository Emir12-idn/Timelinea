import { Module } from "@nestjs/common";
import { SalesReturnsService } from "./sales-returns.service";
import { SalesReturnsController } from "./sales-returns.controller";

@Module({
  providers: [SalesReturnsService],
  controllers: [SalesReturnsController],
  exports: [SalesReturnsService],
})
export class SalesReturnsModule {}
