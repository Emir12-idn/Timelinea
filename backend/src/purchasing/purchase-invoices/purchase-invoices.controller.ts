import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { CreatePurchaseInvoiceDto } from "./dto/create-purchase-invoice.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("purchase-invoices")
export class PurchaseInvoicesController {
  constructor(private service: PurchaseInvoicesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id/void")
  voidInvoice(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.voidInvoice(id, user.id);
  }
}
