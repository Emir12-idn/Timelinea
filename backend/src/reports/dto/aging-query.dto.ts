import { Type } from "class-transformer";
import { IsDate, IsIn, IsOptional } from "class-validator";

export class AgingQueryDto {
  @IsIn(["piutang", "hutang"])
  type!: "piutang" | "hutang";

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  asOf?: Date;
}
