import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { FixedAssetsService } from "./fixed-assets.service";
import { CreateFixedAssetDto } from "./dto/create-fixed-asset.dto";
import { RunDepreciationDto } from "./dto/run-depreciation.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.hrd_keuangan)
@Controller("fixed-assets")
export class FixedAssetsController {
  constructor(private service: FixedAssetsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFixedAssetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Post("depreciation/run")
  runDepreciation(@Body() dto: RunDepreciationDto, @CurrentUser() user: AuthUser) {
    return this.service.runDepreciation(dto.period, user.id);
  }
}
