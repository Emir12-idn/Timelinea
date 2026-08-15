import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";

class GoodsReceiptLineDto {
  @Type(() => Number)
  @IsInt()
  poLineId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyReceived: number;
}

export class CreateGoodsReceiptDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  poId: number;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  @ArrayMinSize(1)
  lines: GoodsReceiptLineDto[];
}
