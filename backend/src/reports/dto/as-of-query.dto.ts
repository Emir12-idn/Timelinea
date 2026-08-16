import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional } from "class-validator";

export class AsOfQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  asOf?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;
}
