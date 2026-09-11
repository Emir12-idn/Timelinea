import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { ClosedPeriodsService } from "./closed-periods.service";
import { ClosePeriodDto } from "./dto/close-period.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("closed-periods")
export class ClosedPeriodsController {
  constructor(private service: ClosedPeriodsService) {}

  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.service.findAll(companyId ? Number(companyId) : undefined);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  close(@Body() dto: ClosePeriodDto, @CurrentUser() user: AuthUser) {
    return this.service.close(dto, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Delete(":id")
  reopen(@Param("id", ParseIntPipe) id: number) {
    return this.service.reopen(id);
  }
}
