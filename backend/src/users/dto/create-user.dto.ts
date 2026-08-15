import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
