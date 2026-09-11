import { Type } from "class-transformer";
import { IsInt, IsOptional, Matches } from "class-validator";

export class ClosePeriodDto {
  /** Format YYYY-MM. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "period harus format YYYY-MM" })
  period: string;

  /** Kosongkan untuk menutup periode ini di SELURUH perusahaan sekaligus. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;
}
