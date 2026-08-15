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

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
