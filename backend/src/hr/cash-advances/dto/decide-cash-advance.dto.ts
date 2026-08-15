import { IsIn } from "class-validator";

export class DecideCashAdvanceDto {
  @IsIn(["approved", "rejected"])
  decision: "approved" | "rejected";
}
