import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("items")
export class ItemsController {
  constructor(private service: ItemsService) {}

  @Get()
  findAll(@Query("q") q?: string) {
    return this.service.findAll(q);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(":id/stock")
  stockOnHand(@Param("id", ParseIntPipe) id: number) {
    return this.service.stockOnHand(id);
  }

  @Post()
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
