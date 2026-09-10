import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class ProjectBudgetLineDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  plannedAmount: number;
}
