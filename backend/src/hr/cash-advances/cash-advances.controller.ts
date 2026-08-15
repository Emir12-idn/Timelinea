import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CashAdvancesService } from "./cash-advances.service";
import { CreateCashAdvanceDto } from "./dto/create-cash-advance.dto";
import { DecideCashAdvanceDto } from "./dto/decide-cash-advance.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("cash-advances")
export class CashAdvancesController {
  constructor(private service: CashAdvancesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query("employeeId") employeeId?: string) {
    const scopedEmployeeId = user.role === Role.karyawan ? (user.employeeId ?? -1) : employeeId ? Number(employeeId) : undefined;
    return this.service.findAll(scopedEmployeeId);
  }

  @Post()
  create(@Body() dto: CreateCashAdvanceDto, @CurrentUser() user: AuthUser) {
    if (!user.employeeId) throw new BadRequestException("Akun ini tidak terhubung ke data karyawan");
    return this.service.create(dto, user.employeeId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/decision")
  decide(@Param("id", ParseIntPipe) id: number, @Body() dto: DecideCashAdvanceDto, @CurrentUser() user: AuthUser) {
    return this.service.decide(id, dto.decision, user.id);
  }
}
