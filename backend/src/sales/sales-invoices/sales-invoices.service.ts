import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { lineAmount } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { ValidateFieldsDto } from "./dto/validate-fields.dto";
import { SalesInvoiceStatus } from "@prisma/client";

const PPN_RATE = 0.11;

@Injectable()
export class SalesInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
  ) {}

  findAll(status?: SalesInvoiceStatus) {
    return this.prisma.salesInvoice.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: { customer: true, project: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        project: true,
        lines: { include: { item: true } },
        validations: true,
        logs: { orderBy: { at: "desc" } },
      },
    });
    if (!invoice) throw new NotFoundException("Faktur Penjualan tidak ditemukan");
    return invoice;
  }

  /** Faktur penjualan diposting ke jurnal begitu dibuat — lihat §4 di data design. */
  async create(dto: CreateSalesInvoiceDto, createdBy?: number, authorName = "system") {
    const date = new Date(dto.date);
    const lines = dto.lines.map((l) => ({
      ...l,
      amount: lineAmount(BigInt(l.unitPrice), l.qty),
    }));
    const dpp = lines.reduce((sum, l) => sum + l.amount, 0n);
    const ppn = BigInt(Math.round(Number(dpp) * PPN_RATE));
    const total = dpp + ppn;

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("SI", dto.companyId, date, tx);
      const invoice = await tx.salesInvoice.create({
        data: {
          no,
          date,
          customerId: dto.customerId,
          companyId: dto.companyId,
          taxInvoiceNo: dto.taxInvoiceNo,
          poRef: dto.poRef,
          projectId: dto.projectId,
          dpp,
          ppn,
          total,
          status: "draft",
          createdBy,
          lines: {
            create: lines.map((l) => ({
              itemId: l.itemId,
              partNo: l.partNo,
              name: l.name,
              qty: l.qty,
              uom: l.uom,
              unitPrice: BigInt(l.unitPrice),
              amount: l.amount,
            })),
          },
          logs: { create: { action: "create", status: "draft", author: authorName } },
        },
      });

      await this.journal.postSalesInvoice(
        { id: invoice.id, no: invoice.no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
      );

      return invoice;
    });
  }

  async updateStatus(id: number, status: SalesInvoiceStatus, authorName = "system") {
    await this.findOne(id);
    return this.prisma.salesInvoice.update({
      where: { id },
      data: { status, logs: { create: { action: "status_change", status, author: authorName } } },
    });
  }

  /** Meniru "AI validation" ala Komatsu: bandingkan input vendor vs data sistem, simpan hasilnya. */
  async validateFields(id: number, dto: ValidateFieldsDto) {
    const invoice = await this.findOne(id);
    const systemValues: Record<string, string> = {
      no: invoice.no,
      tanggal: invoice.date.toISOString().slice(0, 10),
      pelanggan: invoice.customer.name,
      dpp: invoice.dpp.toString(),
      ppn: invoice.ppn.toString(),
      total: invoice.total.toString(),
      po_ref: invoice.poRef ?? "",
    };

    await this.prisma.documentValidation.deleteMany({ where: { salesInvoiceId: id } });
    const rows = dto.fields.map((f) => {
      const systemValue = systemValues[f.field] ?? "";
      return {
        salesInvoiceId: id,
        field: f.field,
        inputValue: f.inputValue,
        systemValue,
        isMatch: f.inputValue.trim().toLowerCase() === systemValue.trim().toLowerCase(),
      };
    });
    await this.prisma.documentValidation.createMany({ data: rows });
    return this.prisma.documentValidation.findMany({ where: { salesInvoiceId: id } });
  }
}
