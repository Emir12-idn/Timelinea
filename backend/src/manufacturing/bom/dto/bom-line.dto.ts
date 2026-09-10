import { Type } from "class-transformer";
import { IsInt, IsNumber, IsPositive, IsString } from "class-validator";

export class BomLineDto {
  @Type(() => Number)
  @IsInt()
  materialItemId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyPerUnit: number;

  @IsString()
  uom: string;
}
