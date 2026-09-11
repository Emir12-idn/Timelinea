import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ReportsService } from "./reports.service";
import { DateRangeQueryDto } from "./dto/date-range-query.dto";
import { AsOfQueryDto } from "./dto/as-of-query.dto";
import { AgingQueryDto } from "./dto/aging-query.dto";
import { ConsolidatedQueryDto } from "./dto/consolidated-query.dto";

@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get("laba-rugi")
  labaRugi(@Query() query: DateRangeQueryDto) {
    return this.service.labaRugi(query.from, query.to, query.companyId);
  }

  @Get("neraca")
  neraca(@Query() query: AsOfQueryDto) {
    return this.service.neraca(query.asOf, query.companyId);
  }

  @Get("buku-besar/:accountCode")
  bukuBesar(@Param("accountCode") accountCode: string, @Query() query: DateRangeQueryDto) {
    return this.service.bukuBesar(accountCode, query.from, query.to, query.companyId);
  }

  @Get("aging")
  aging(@Query() query: AgingQueryDto) {
    return this.service.aging(query.type, query.asOf);
  }

  /** §6 (gap module, prioritas rendah) — Laba Rugi & Neraca per company + gabungan. */
  @Get("konsolidasi")
  konsolidasi(@Query() query: ConsolidatedQueryDto) {
    return this.service.konsolidasi(query.from, query.to, query.asOf ?? query.to);
  }
}
