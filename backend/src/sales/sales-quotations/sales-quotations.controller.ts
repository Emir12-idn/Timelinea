import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SalesQuotationStatus } from "@prisma/client";
import { SalesQuotationsService } from "./sales-quotations.service";
import { CreateSalesQuotationDto } from "./dto/create-sales-quotation.dto";
import { UpdateSalesQuotationStatusDto } from "./dto/update-status.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("sales-quotations")
export class SalesQuotationsController {
  constructor(private service: SalesQuotationsService) {}

  @Get()
  findAll(@Query("status") status?: SalesQuotationStatus) {
    return this.service.findAll(status);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSalesQuotationDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSalesQuotationStatusDto, @CurrentUser() user: AuthUser) {
    return this.service.updateStatus(id, dto.status, user.id);
  }

  @Patch(":id/convert-to-so")
  convertToSalesOrder(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.convertToSalesOrder(id, user.id);
  }
}
