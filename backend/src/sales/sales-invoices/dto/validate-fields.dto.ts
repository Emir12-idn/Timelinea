import { Type } from "class-transformer";
import { ArrayMinSize, IsString, ValidateNested } from "class-validator";

class FieldInputDto {
  @IsString()
  field: string;

  @IsString()
  inputValue: string;
}

export class ValidateFieldsDto {
  @ValidateNested({ each: true })
  @Type(() => FieldInputDto)
  @ArrayMinSize(1)
  fields: FieldInputDto[];
}
