import { PartialType } from "@nestjs/mapped-types";
import { IsDateString, IsOptional } from "class-validator";
import { CreateProjectTaskDto } from "./create-project-task.dto";

export class UpdateProjectTaskDto extends PartialType(CreateProjectTaskDto) {
  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @IsOptional()
  @IsDateString()
  actualEnd?: string;
}
