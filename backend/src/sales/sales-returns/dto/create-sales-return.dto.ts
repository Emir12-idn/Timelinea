import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { SalesReturnLineDto } from "./sales-return-line.dto";

export class CreateSalesReturnDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  salesInvoiceId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  /** Gudang penerimaan retur — kalau kosong dipakai gudang default (Persediaan §1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ValidateNested({ each: true })
  @Type(() => SalesReturnLineDto)
  @ArrayMinSize(1)
  lines: SalesReturnLineDto[];
}
