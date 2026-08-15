import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt } from "class-validator";
import { AttendanceStatus } from "@prisma/client";

export class UpsertAttendanceDto {
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}
