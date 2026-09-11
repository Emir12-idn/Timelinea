import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class ConvertToPoDto {
  /** PR tidak punya supplier (§14 data design item 2) — dipilih di sini saat konversi. */
  @Type(() => Number)
  @IsInt()
  supplierId: number;

  @IsOptional()
  @IsString()
  note?: string;
}
