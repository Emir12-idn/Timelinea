import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

export class GeneratePayslipDto {
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  /** Format YYYY-MM */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  allowance?: number;

  /** Kosongkan untuk auto-jumlah dari data Lembur (Overtime) pada periode ini. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  overtimeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  taxPph21?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;
}
