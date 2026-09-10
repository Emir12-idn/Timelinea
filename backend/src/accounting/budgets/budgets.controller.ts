import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { BudgetsService } from "./budgets.service";
import { SetBudgetDto } from "./dto/set-budget.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("budgets")
export class BudgetsController {
  constructor(private service: BudgetsService) {}

  @Get()
  findAll(@Query("period") period?: string, @Query("companyId") companyId?: string) {
    return this.service.findAll(period, companyId ? Number(companyId) : undefined);
  }

  @Get("monitor")
  monitor(@Query("period") period: string, @Query("companyId") companyId?: string) {
    return this.service.monitor(period, companyId ? Number(companyId) : undefined);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  set(@Body() dto: SetBudgetDto, @CurrentUser() user: AuthUser) {
    return this.service.set(dto, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
