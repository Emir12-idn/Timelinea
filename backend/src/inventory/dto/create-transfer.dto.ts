import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

/** "Transfer Barang" — pindah barang antar gudang (stock-out asal + stock-in tujuan, biaya sama). */
export class CreateTransferDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsInt()
  fromWarehouseId: number;

  @Type(() => Number)
  @IsInt()
  toWarehouseId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qty: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  serialNo?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
