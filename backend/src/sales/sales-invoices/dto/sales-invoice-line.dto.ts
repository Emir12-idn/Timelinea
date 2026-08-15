import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class SalesInvoiceLineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemId?: number;

  @IsOptional()
  @IsString()
  partNo?: string;

  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;

  @IsString()
  uom: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice: number;
}
