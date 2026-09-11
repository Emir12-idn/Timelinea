import { Type } from "class-transformer";
import { IsDate, IsOptional } from "class-validator";

export class ConsolidatedQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  /** Default: sama dengan `to` kalau kosong — neraca per akhir periode yang sama. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  asOf?: Date;
}
