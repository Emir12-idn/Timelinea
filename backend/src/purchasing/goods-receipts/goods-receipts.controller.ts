import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { GoodsReceiptsService } from "./goods-receipts.service";
import { CreateGoodsReceiptDto } from "./dto/create-goods-receipt.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("goods-receipts")
export class GoodsReceiptsController {
  constructor(private service: GoodsReceiptsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGoodsReceiptDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
}
