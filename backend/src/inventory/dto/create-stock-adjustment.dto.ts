import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateStockAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsString()
  note: string;
}
