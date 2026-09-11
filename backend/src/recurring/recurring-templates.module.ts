import { Module } from "@nestjs/common";
import { RecurringTemplatesService } from "./recurring-templates.service";
import { RecurringTemplatesController } from "./recurring-templates.controller";
import { SalesInvoicesModule } from "../sales/sales-invoices/sales-invoices.module";
import { PurchaseInvoicesModule } from "../purchasing/purchase-invoices/purchase-invoices.module";

@Module({
  imports: [SalesInvoicesModule, PurchaseInvoicesModule],
  providers: [RecurringTemplatesService],
  controllers: [RecurringTemplatesController],
  exports: [RecurringTemplatesService],
})
export class RecurringTemplatesModule {}
