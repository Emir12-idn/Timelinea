import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private service: CompaniesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Role.admin)
  @Post()
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.admin)
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.admin)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
