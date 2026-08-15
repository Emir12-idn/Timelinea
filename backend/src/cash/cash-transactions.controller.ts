import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CashTransactionType } from "@prisma/client";
import { CashTransactionsService } from "./cash-transactions.service";
import { CreateCashTransactionDto } from "./dto/create-cash-transaction.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("cash-transactions")
export class CashTransactionsController {
  constructor(private service: CashTransactionsService) {}

  @Get()
  findAll(@Query("type") type?: CashTransactionType) {
    return this.service.findAll(type);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCashTransactionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
}
