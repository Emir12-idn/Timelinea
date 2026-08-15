import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }
}
