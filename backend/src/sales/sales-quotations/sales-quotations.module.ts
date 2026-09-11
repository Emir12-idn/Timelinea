import { Module } from "@nestjs/common";
import { SalesQuotationsService } from "./sales-quotations.service";
import { SalesQuotationsController } from "./sales-quotations.controller";
import { SalesOrdersModule } from "../sales-orders/sales-orders.module";

@Module({
  imports: [SalesOrdersModule],
  providers: [SalesQuotationsService],
  controllers: [SalesQuotationsController],
  exports: [SalesQuotationsService],
})
export class SalesQuotationsModule {}
