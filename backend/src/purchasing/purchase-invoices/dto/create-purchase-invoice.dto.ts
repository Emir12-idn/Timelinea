import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class CreatePurchaseInvoiceDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  supplierId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  /** Opsional — kalau diisi, faktur ini sekaligus jadi bukti penerimaan barang PO tsb (§4). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  poId?: number;

  /** Gudang penerimaan barang PO — kalau kosong dipakai gudang default (Persediaan §1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  total: number;

  /** Opsional — jika kosong, dihitung dari total dengan asumsi PPN 11%. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dpp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ppn?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Multi-currency §2 (gap module) — kode mata uang (mis. "USD"). Kosongkan untuk IDR. */
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
