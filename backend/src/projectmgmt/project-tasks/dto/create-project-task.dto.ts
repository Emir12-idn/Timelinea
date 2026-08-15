import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateProjectTaskDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  picId?: number;

  @IsOptional()
  @IsDateString()
  planStart?: string;

  @IsOptional()
  @IsDateString()
  planEnd?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependsOnId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
