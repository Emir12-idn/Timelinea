import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { OvertimeService } from "./overtime.service";
import { CreateOvertimeDto } from "./dto/create-overtime.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.hrd_keuangan)
@Controller("overtime")
export class OvertimeController {
  constructor(private service: OvertimeService) {}

  @Get()
  findAll(@Query("employeeId") employeeId?: string) {
    return this.service.findAll(employeeId ? Number(employeeId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateOvertimeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
}
