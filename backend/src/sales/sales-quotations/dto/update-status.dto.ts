import { IsEnum } from "class-validator";
import { SalesQuotationStatus } from "@prisma/client";

export class UpdateSalesQuotationStatusDto {
  @IsEnum(SalesQuotationStatus)
  status: SalesQuotationStatus;
}
