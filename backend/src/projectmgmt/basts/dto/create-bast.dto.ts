import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";

class BastLineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemId?: number;

  @IsOptional()
  @IsString()
  partNo?: string;

  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;

  @IsString()
  uom: string;
}

export class CreateBastDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  poRef?: string;

  /** Jika diisi, item BAST otomatis diambil dari baris faktur ini (bisa dioverride via `lines`). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceInvoiceId?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BastLineDto)
  @ArrayMinSize(1)
  lines?: BastLineDto[];
}
