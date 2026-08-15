import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { WorkReportsService } from "./work-reports.service";
import { CreateWorkReportDto } from "./dto/create-work-report.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("work-reports")
export class WorkReportsController {
  constructor(private service: WorkReportsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query("taskId") taskId?: string, @Query("employeeId") employeeId?: string) {
    // Karyawan biasa hanya boleh melihat laporan miliknya sendiri (portal self-service, §6).
    const scopedEmployeeId = user.role === Role.karyawan ? (user.employeeId ?? -1) : employeeId ? Number(employeeId) : undefined;
    return this.service.findAll(scopedEmployeeId, taskId ? Number(taskId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateWorkReportDto, @CurrentUser() user: AuthUser) {
    if (!user.employeeId) {
      throw new BadRequestException("Akun ini tidak terhubung ke data karyawan");
    }
    return this.service.create(dto, user.employeeId);
  }
}
