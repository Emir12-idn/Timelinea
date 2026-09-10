import { Type } from "class-transformer";
import { ArrayMinSize, IsInt, ValidateNested } from "class-validator";
import { ProjectBudgetLineDto } from "./project-budget-line.dto";

/** Set/replace RAB lengkap untuk satu proyek — kirim ulang seluruh baris tiap kali diedit. */
export class SetProjectBudgetDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @ValidateNested({ each: true })
  @Type(() => ProjectBudgetLineDto)
  @ArrayMinSize(1)
  lines: ProjectBudgetLineDto[];
}
