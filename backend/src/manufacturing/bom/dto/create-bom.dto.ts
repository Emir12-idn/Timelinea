import { Type } from "class-transformer";
import { ArrayMinSize, IsInt, ValidateNested } from "class-validator";
import { BomLineDto } from "./bom-line.dto";

export class CreateBomDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @ValidateNested({ each: true })
  @Type(() => BomLineDto)
  @ArrayMinSize(1)
  lines: BomLineDto[];
}
