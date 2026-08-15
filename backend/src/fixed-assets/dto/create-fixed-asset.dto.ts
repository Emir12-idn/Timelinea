import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

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
}
