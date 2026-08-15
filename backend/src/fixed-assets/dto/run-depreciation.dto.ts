import { IsString, Matches } from "class-validator";

export class RunDepreciationDto {
  /** Format YYYY-MM */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period: string;
}
