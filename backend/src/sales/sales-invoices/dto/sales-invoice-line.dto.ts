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

  /** No PO per baris — satu faktur bisa menagih barang dari beberapa PO berbeda.
   * Kosongkan untuk pakai `poRef` di level faktur (kalau ada). */
  @IsOptional()
  @IsString()
  poRef?: string;

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
