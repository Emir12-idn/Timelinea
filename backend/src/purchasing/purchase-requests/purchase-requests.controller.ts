import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PurchaseRequestStatus, Role } from "@prisma/client";
import { PurchaseRequestsService } from "./purchase-requests.service";
import { CreatePurchaseRequestDto } from "./dto/create-purchase-request.dto";
import { RejectPurchaseRequestDto } from "./dto/reject-purchase-request.dto";
import { ConvertToPoDto } from "./dto/convert-to-po.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(private service: PurchaseRequestsService) {}

  @Get()
  findAll(@Query("status") status?: PurchaseRequestStatus) {
    return this.service.findAll(status);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  /** §14 data design, item 2 — approval single-level (admin/hrd_keuangan), sama tier dengan PO. */
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/approve")
  approve(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.approve(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.hrd_keuangan)
  @Patch(":id/reject")
  reject(@Param("id", ParseIntPipe) id: number, @Body() dto: RejectPurchaseRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.reject(id, user.id, dto.reason);
  }

  @Patch(":id/convert-to-po")
  convertToPurchaseOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: ConvertToPoDto, @CurrentUser() user: AuthUser) {
    return this.service.convertToPurchaseOrder(id, dto, user.id);
  }
}
