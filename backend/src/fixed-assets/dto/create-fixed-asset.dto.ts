import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";
import { DepreciationMethod } from "@prisma/client";

export class CreateFixedAssetDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsDateString()
  acquisitionDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cost: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usefulLifeMonths: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  /** Metode penyusutan — §11 data design, item 1. Default straight_line kalau kosong. */
  @IsOptional()
  @IsEnum(DepreciationMethod)
  method?: DepreciationMethod;
}
