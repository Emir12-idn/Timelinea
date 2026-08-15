import { IsString } from "class-validator";

export class CreateDepartmentDto {
  @IsString()
  code: string;

  @IsString()
  name: string;
}
