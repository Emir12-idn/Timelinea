import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateStockAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qtyIn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qtyOut?: number;

  /** Opsional untuk qtyIn — kalau kosong dipakai last_cost item. Tidak dipakai untuk qtyOut (biaya dari engine costing). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  serialNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsString()
  note: string;
}
