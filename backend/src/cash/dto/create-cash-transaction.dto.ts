import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { CashTransactionType } from "@prisma/client";

export class CreateCashTransactionDto {
  @IsEnum(CashTransactionType)
  type: CashTransactionType;

  @IsDateString()
  date: string;

  /** Akun Kas (1-1100) atau Bank (1-1200) yang dipakai. */
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  partnerId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salesInvoiceId?: number;

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
