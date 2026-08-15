import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, ValidateNested } from "class-validator";

class DeliveryOrderLineDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;
}

export class CreateDeliveryOrderDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  soId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ValidateNested({ each: true })
  @Type(() => DeliveryOrderLineDto)
  @ArrayMinSize(1)
  lines: DeliveryOrderLineDto[];
}
