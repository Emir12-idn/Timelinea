import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from "class-validator";
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

  /** PPh yang akan dipotong pembeli (informational, default 0) — lihat catatan di schema.prisma. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pph?: number;

  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceLineDto)
  @ArrayMinSize(1)
  lines: SalesInvoiceLineDto[];

  /** Multi-currency §2 (gap module) — kode mata uang baris (mis. "USD"). Kosongkan untuk IDR. */
  @IsOptional()
  @IsString()
  currency?: string;

  /** Kurs manual pada tanggal faktur — Rupiah per 1 unit `currency`. Wajib diisi kalau currency bukan IDR. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;
}
