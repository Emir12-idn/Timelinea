import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { AccountType } from "@prisma/client";

export class CreateAccountDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  taxName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
