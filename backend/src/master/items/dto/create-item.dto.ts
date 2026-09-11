import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { CostingMethod, ItemType } from "@prisma/client";

export class CreateItemDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  uom: string;

  @IsEnum(ItemType)
  type: ItemType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastCost?: number;

  /** Persediaan §1 (gap module) — default average kalau kosong (lihat coa-codes/schema untuk catatan). */
  @IsOptional()
  @IsEnum(CostingMethod)
  costingMethod?: CostingMethod;

  /** §11 data design, item 7 — aktifkan konsumsi FEFO (bukan FIFO murni) untuk item FIFO ini. */
  @IsOptional()
  @IsBoolean()
  tracksExpiry?: boolean;

  /** Barcode fisik (opsional, data murni — tidak ada integrasi scanner). */
  @IsOptional()
  @IsString()
  barcode?: string;
}
