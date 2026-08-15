import { IsEnum } from "class-validator";
import { PoStatus } from "@prisma/client";

export class UpdatePoStatusDto {
  @IsEnum(PoStatus)
  status: PoStatus;
}
