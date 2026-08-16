import { Body, Controller, Get, Param, ParseIntPipe, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { DeliveryOrdersService } from "./delivery-orders.service";
import { CreateDeliveryOrderDto } from "./dto/create-delivery-order.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("delivery-orders")
export class DeliveryOrdersController {
  constructor(private service: DeliveryOrdersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDeliveryOrderDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Get(":id/print")
  async print(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.service.renderPdf(id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="surat-jalan-${id}.pdf"` });
    res.send(pdf);
  }
}
