import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateWorkReportDto {
  @Type(() => Number)
  @IsInt()
  taskId: number;

  @IsDateString()
  date: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
