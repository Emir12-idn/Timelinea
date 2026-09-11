import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { CreatePurchaseInvoiceDto } from "./dto/create-purchase-invoice.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("purchase-invoices")
export class PurchaseInvoicesController {
  constructor(private service: PurchaseInvoicesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** §11 data design, item 4 — export CSV. Terdaftar sebelum ":id" supaya "export" tidak ditangkap sebagai :id. */
  @Get("export/csv")
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="purchase-invoices.csv"' });
    res.send(csv);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id/void")
  voidInvoice(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.voidInvoice(id, user.id);
  }

  @Get(":id/print")
  async print(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.service.renderPdf(id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="faktur-pembelian-${id}.pdf"` });
    res.send(pdf);
  }
}
