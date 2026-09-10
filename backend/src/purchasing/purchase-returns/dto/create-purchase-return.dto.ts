import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { PurchaseReturnLineDto } from "./purchase-return-line.dto";

export class CreatePurchaseReturnDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  purchaseInvoiceId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  /** Gudang asal barang retur — kalau kosong dipakai gudang default (Persediaan §1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnLineDto)
  @ArrayMinSize(1)
  lines: PurchaseReturnLineDto[];
}
