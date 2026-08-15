import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 25;

  @IsOptional()
  @IsString()
  q?: string;
}

export function paginate(page = 1, pageSize = 25) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
