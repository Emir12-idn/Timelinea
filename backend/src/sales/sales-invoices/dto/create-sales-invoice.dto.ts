import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { SalesInvoiceLineDto } from "./sales-invoice-line.dto";

export class CreateSalesInvoiceDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  taxInvoiceNo?: string;

  @IsOptional()
  @IsString()
  poRef?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceLineDto)
  @ArrayMinSize(1)
  lines: SalesInvoiceLineDto[];
}
