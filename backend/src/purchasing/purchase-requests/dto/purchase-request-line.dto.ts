import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsPositive, Min, IsString } from "class-validator";

export class PurchaseRequestLineDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;

  /** Estimasi harga per unit (opsional, murni referensi — lihat catatan di schema.prisma). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedUnitPrice?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
