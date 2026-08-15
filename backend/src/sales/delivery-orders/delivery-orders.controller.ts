import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
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
}
