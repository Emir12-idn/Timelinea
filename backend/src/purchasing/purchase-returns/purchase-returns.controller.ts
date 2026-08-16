import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { PurchaseReturnsService } from "./purchase-returns.service";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("purchase-returns")
export class PurchaseReturnsController {
  constructor(private service: PurchaseReturnsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseReturnDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
}
