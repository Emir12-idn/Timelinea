import { Type } from "class-transformer";
import { IsInt, IsNumber, IsPositive, Min } from "class-validator";

export class SalesReturnLineDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice: number;
}
