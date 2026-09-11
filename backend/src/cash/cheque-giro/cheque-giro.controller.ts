import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ChequeGiroDirection, ChequeGiroStatus, Role } from "@prisma/client";
import { ChequeGiroService } from "./cheque-giro.service";
import { CreateChequeGiroDto } from "./dto/create-cheque-giro.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("cheque-giros")
export class ChequeGiroController {
  constructor(private service: ChequeGiroService) {}

  @Get()
  findAll(@Query("status") status?: ChequeGiroStatus, @Query("direction") direction?: ChequeGiroDirection) {
    return this.service.findAll(status, direction);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  create(@Body() dto: CreateChequeGiroDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/clear")
  markCleared(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.markCleared(id, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/bounce")
  markBounced(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.markBounced(id, user.id);
  }
}
