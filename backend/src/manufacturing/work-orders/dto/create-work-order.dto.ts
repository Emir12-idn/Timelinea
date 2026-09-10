import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class CreateWorkOrderDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  productItemId: number;

  @Type(() => Number)
  @IsInt()
  bomId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  plannedQty: number;

  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  /** Biaya tenaga kerja/overhead manual, ditambahkan ke biaya barang jadi saat diposting selesai. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  conversionCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
