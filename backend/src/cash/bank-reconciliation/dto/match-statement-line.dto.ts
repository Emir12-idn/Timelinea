import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class MatchStatementLineDto {
  @Type(() => Number)
  @IsInt()
  cashTransactionId: number;
}
