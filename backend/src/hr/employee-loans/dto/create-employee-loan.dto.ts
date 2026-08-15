import { Type } from "class-transformer";
import { IsDateString, IsInt, Min } from "class-validator";

export class CreateEmployeeLoanDto {
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  principal: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  installment: number;
}
