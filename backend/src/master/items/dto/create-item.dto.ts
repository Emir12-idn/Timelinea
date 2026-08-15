import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ItemType } from "@prisma/client";

export class CreateItemDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  uom: string;

  @IsEnum(ItemType)
  type: ItemType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastCost?: number;
}
