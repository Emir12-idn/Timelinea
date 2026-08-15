import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { PartnerType } from "@prisma/client";

export class CreatePartnerDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(PartnerType)
  type: PartnerType;

  @IsOptional()
  @IsString()
  npwp?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  termDays?: number;
}
