import { Module } from "@nestjs/common";
import { SalesInvoicesService } from "./sales-invoices.service";
import { SalesInvoicesController } from "./sales-invoices.controller";

@Module({
  providers: [SalesInvoicesService],
  controllers: [SalesInvoicesController],
  exports: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
