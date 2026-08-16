import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  npwp?: string;

  @IsOptional()
  @IsString()
  address?: string;

  /** Ditampilkan di print-out Faktur Penjualan, mis. "Bank Mandiri 123-456-7890 a.n. Emerald Duta Sejahtera, PT". */
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
