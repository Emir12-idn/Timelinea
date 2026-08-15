import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { EmployeeLoansService } from "./employee-loans.service";
import { CreateEmployeeLoanDto } from "./dto/create-employee-loan.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.hrd_keuangan)
@Controller("employee-loans")
export class EmployeeLoansController {
  constructor(private service: EmployeeLoansService) {}

  @Get()
  findAll(@Query("employeeId") employeeId?: string) {
    return this.service.findAll(employeeId ? Number(employeeId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateEmployeeLoanDto) {
    return this.service.create(dto);
  }
}
