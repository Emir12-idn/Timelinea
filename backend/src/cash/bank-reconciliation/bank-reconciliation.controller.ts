import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { CreateStatementLineDto } from "./dto/create-statement-line.dto";
import { ListStatementLinesDto } from "./dto/list-statement-lines.dto";
import { MatchStatementLineDto } from "./dto/match-statement-line.dto";
import { SummaryQueryDto } from "./dto/summary-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("bank-statement-lines")
export class BankReconciliationController {
  constructor(private service: BankReconciliationService) {}

  @Get()
  findAll(@Query() query: ListStatementLinesDto) {
    return this.service.findLines(query);
  }

  @Get("summary")
  summary(@Query() query: SummaryQueryDto) {
    return this.service.summary(query.accountId, query.asOf);
  }

  @Post()
  create(@Body() dto: CreateStatementLineDto, @CurrentUser() user: AuthUser) {
    return this.service.createLine(dto, user.id);
  }

  @Patch(":id/match")
  match(@Param("id", ParseIntPipe) id: number, @Body() dto: MatchStatementLineDto) {
    return this.service.match(id, dto.cashTransactionId);
  }

  @Patch(":id/unmatch")
  unmatch(@Param("id", ParseIntPipe) id: number) {
    return this.service.unmatch(id);
  }
}
