import { Type } from "class-transformer";
import { ArrayMinSize, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { PurchaseRequestLineDto } from "./purchase-request-line.dto";

export class CreatePurchaseRequestDto {
  @IsDateString()
  date: string;

  /** Siapa yang butuh barangnya (opsional — default ke user yang membuat PR ini). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requestedBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestLineDto)
  @ArrayMinSize(1)
  lines: PurchaseRequestLineDto[];
}
