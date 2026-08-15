import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { PurchaseOrderLineDto } from "./purchase-order-line.dto";

export class CreatePurchaseOrderDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  supplierId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  @ArrayMinSize(1)
  lines: PurchaseOrderLineDto[];
}
