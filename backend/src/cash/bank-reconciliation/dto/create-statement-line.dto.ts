import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateStatementLineDto {
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsDateString()
  date: string;

  @IsString()
  description: string;

  /** Positif = uang masuk, negatif = uang keluar — mengikuti tanda di rekening koran. */
  @Type(() => Number)
  @IsInt()
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;
}
