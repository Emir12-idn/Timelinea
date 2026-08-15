import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AttendanceService } from "./attendance.service";
import { UpsertAttendanceDto } from "./dto/upsert-attendance.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query("date") date?: string, @Query("employeeId") employeeId?: string) {
    const scopedEmployeeId = user.role === Role.karyawan ? (user.employeeId ?? -1) : employeeId ? Number(employeeId) : undefined;
    return this.service.findAll(date, scopedEmployeeId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  upsertStatus(@Body() dto: UpsertAttendanceDto) {
    return this.service.upsertStatus(dto);
  }

  @Post("clock-in")
  @HttpCode(200)
  clockIn(@CurrentUser() user: AuthUser) {
    if (!user.employeeId) throw new BadRequestException("Akun ini tidak terhubung ke data karyawan");
    return this.service.clockIn(user.employeeId);
  }

  @Post("clock-out")
  @HttpCode(200)
  clockOut(@CurrentUser() user: AuthUser) {
    if (!user.employeeId) throw new BadRequestException("Akun ini tidak terhubung ke data karyawan");
    return this.service.clockOut(user.employeeId);
  }
}
