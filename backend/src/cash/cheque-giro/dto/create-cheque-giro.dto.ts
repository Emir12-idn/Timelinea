import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ChequeGiroDirection, ChequeGiroType } from "@prisma/client";

export class CreateChequeGiroDto {
  @IsEnum(ChequeGiroType)
  type: ChequeGiroType;

  /** Nama bank / no rekening cek-giro fisiknya (teks bebas, bukan akun GL). */
  @IsString()
  bankAccount: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsEnum(ChequeGiroDirection)
  direction: ChequeGiroDirection;

  /** Akun Kas/Bank GL yang dipakai saat dicairkan. */
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  partnerId?: number;

  /** Wajib untuk direction=incoming — faktur penjualan yang dilunasi cek/giro ini. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salesInvoiceId?: number;

  /** Wajib untuk direction=outgoing — faktur pembelian yang dilunasi cek/giro ini. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  purchaseInvoiceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
