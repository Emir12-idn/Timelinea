import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { EmploymentStatus } from "@prisma/client";

export class CreateEmployeeDto {
  @IsString()
  nik: string;

  @IsString()
  name: string;

  @IsString()
  position: string;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseSalary: number;

  @IsDateString()
  joinDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
