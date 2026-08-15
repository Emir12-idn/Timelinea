import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsPositive, Min } from "class-validator";

export class CreateOvertimeDto {
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  hours: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rate: number;
}
