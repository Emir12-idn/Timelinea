import { IsEnum } from "class-validator";
import { WorkOrderStatus } from "@prisma/client";

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;
}
