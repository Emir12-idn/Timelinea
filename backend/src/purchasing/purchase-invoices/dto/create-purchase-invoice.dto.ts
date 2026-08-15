import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Min } from "class-validator";

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grId?: number;

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
}
