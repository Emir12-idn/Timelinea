import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional } from "class-validator";

export class SummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  asOf?: Date;
}
