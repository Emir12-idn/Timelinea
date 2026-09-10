import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { ProjectBudgetsService } from "./project-budgets.service";
import { SetProjectBudgetDto } from "./dto/set-project-budget.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("project-budgets")
export class ProjectBudgetsController {
  constructor(private service: ProjectBudgetsService) {}

  @Get(":projectId")
  findByProject(@Param("projectId", ParseIntPipe) projectId: number) {
    return this.service.findByProject(projectId);
  }

  @Get(":projectId/realization")
  realization(@Param("projectId", ParseIntPipe) projectId: number) {
    return this.service.realization(projectId);
  }

  @Roles(Role.admin, Role.hrd_keuangan, Role.pic_proyek)
  @Post()
  set(@Body() dto: SetProjectBudgetDto, @CurrentUser() user: AuthUser) {
    return this.service.set(dto, user.id);
  }
}
