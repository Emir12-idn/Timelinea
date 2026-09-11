import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { SalesInvoiceStatus } from "@prisma/client";
import { SalesInvoicesService } from "./sales-invoices.service";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { UpdateSalesInvoiceStatusDto } from "./dto/update-status.dto";
import { ValidateFieldsDto } from "./dto/validate-fields.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("sales-invoices")
export class SalesInvoicesController {
  constructor(private service: SalesInvoicesService) {}

  @Get()
  findAll(@Query("status") status?: SalesInvoiceStatus) {
    return this.service.findAll(status);
  }

  /** §11 data design, item 4 — export CSV. Terdaftar sebelum ":id" supaya "export" tidak ditangkap sebagai :id. */
  @Get("export/csv")
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sales-invoices.csv"' });
    res.send(csv);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSalesInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id, user.displayName);
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSalesInvoiceStatusDto, @CurrentUser() user: AuthUser) {
    return this.service.updateStatus(id, dto.status, user.displayName, user.id);
  }

  @Patch(":id/void")
  voidInvoice(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.voidInvoice(id, user.displayName, user.id);
  }

  @Post(":id/validate")
  validateFields(@Param("id", ParseIntPipe) id: number, @Body() dto: ValidateFieldsDto) {
    return this.service.validateFields(id, dto);
  }

  @Get(":id/print")
  async print(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.service.renderPdf(id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="faktur-${id}.pdf"` });
    res.send(pdf);
  }
}
