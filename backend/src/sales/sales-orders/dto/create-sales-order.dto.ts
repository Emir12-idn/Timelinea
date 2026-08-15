import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, ValidateNested } from "class-validator";
import { SalesOrderLineDto } from "./sales-order-line.dto";

export class CreateSalesOrderDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  @ArrayMinSize(1)
  lines: SalesOrderLineDto[];
}
