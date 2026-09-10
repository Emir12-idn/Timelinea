import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role, WorkOrderStatus } from "@prisma/client";
import { WorkOrdersService } from "./work-orders.service";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";
import { UpdateWorkOrderStatusDto } from "./dto/update-work-order-status.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private service: WorkOrdersService) {}

  @Get()
  findAll(@Query("status") status?: WorkOrderStatus, @Query("projectId") projectId?: string) {
    return this.service.findAll(status, projectId ? Number(projectId) : undefined);
  }

  @Get("reports/materials-used")
  materialsUsedReport(@Query("workOrderId") workOrderId?: string) {
    return this.service.materialsUsedReport(workOrderId ? Number(workOrderId) : undefined);
  }

  @Get("reports/production")
  productionReport(@Query("projectId") projectId?: string) {
    return this.service.productionReport(projectId ? Number(projectId) : undefined);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Post()
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/status")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateWorkOrderStatusDto, @CurrentUser() user: AuthUser) {
    return this.service.updateStatus(id, dto.status, user.id);
  }
}
