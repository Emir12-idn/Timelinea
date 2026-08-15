import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ProjectStatus } from "@prisma/client";

export class CreateProjectDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contractValue?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
