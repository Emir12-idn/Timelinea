import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateRecurringTemplateDto } from "./create-recurring-template.dto";

export class UpdateRecurringTemplateDto extends PartialType(CreateRecurringTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
