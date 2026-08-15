import { IsEnum } from "class-validator";
import { SalesInvoiceStatus } from "@prisma/client";

export class UpdateSalesInvoiceStatusDto {
  @IsEnum(SalesInvoiceStatus)
  status: SalesInvoiceStatus;
}
