import { Type } from "class-transformer";
import { IsInt, IsOptional, Matches } from "class-validator";

export class SetBudgetDto {
  @Type(() => Number)
  @IsInt()
  accountId: number;

  /** Format YYYY-MM. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "period harus format YYYY-MM" })
  period: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  amount: number;
}
