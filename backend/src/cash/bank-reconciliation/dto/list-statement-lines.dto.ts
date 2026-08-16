import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional } from "class-validator";

export class ListStatementLinesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accountId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  matched?: boolean;
}
