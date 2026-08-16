import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { SalesReturnsService } from "./sales-returns.service";
import { CreateSalesReturnDto } from "./dto/create-sales-return.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("sales-returns")
export class SalesReturnsController {
  constructor(private service: SalesReturnsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSalesReturnDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
}
