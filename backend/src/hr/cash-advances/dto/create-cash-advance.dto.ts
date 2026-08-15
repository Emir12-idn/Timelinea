import { Type } from "class-transformer";
import { IsDateString, IsInt, IsString, Min } from "class-validator";

export class CreateCashAdvanceDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  reason: string;
}
