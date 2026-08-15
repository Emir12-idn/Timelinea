import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateItemGroupDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
