import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { BomService } from "./bom.service";
import { CreateBomDto } from "./dto/create-bom.dto";
import { UpdateBomDto } from "./dto/update-bom.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("boms")
export class BomController {
  constructor(private service: BomService) {}

  @Get()
  findAll(@Query("itemId") itemId?: string) {
    return this.service.findAll(itemId ? Number(itemId) : undefined);
  }

  @Get("active/:itemId")
  findActiveForItem(@Param("itemId", ParseIntPipe) itemId: number) {
    return this.service.findActiveForItem(itemId);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  create(@Body() dto: CreateBomDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateBomDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
