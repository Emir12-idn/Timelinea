import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { dppFromTotal } from "../../common/money.util";
import { JournalService } from "../../accounting/journal/journal.service";
import { COA_CODE } from "../../accounting/journal/coa-codes";
import { CreatePurchaseInvoiceDto } from "./dto/create-purchase-invoice.dto";

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
  ) {}

  findAll() {
    return this.prisma.purchaseInvoice.findMany({
      where: { deletedAt: null },
      include: { supplier: true, gr: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const inv = await this.prisma.purchaseInvoice.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true, gr: { include: { po: true } } },
    });
    if (!inv) throw new NotFoundException("Faktur Pembelian tidak ditemukan");
    return inv;
  }

  /** Faktur pembelian diposting ke jurnal begitu dibuat — lihat §4 di data design. */
  async create(dto: CreatePurchaseInvoiceDto, createdBy?: number) {
    const date = new Date(dto.date);
    const total = BigInt(dto.total);
    const dpp = dto.dpp !== undefined ? BigInt(dto.dpp) : dppFromTotal(total);
    const ppn = dto.ppn !== undefined ? BigInt(dto.ppn) : total - dpp;

    let debitAccountCode: string = COA_CODE.PERSEDIAAN;
    if (dto.grId) {
      const gr = await this.prisma.goodsReceipt.findFirst({
        where: { id: dto.grId },
        include: { lines: { include: { poLine: { include: { item: true } } } } },
      });
      if (!gr) throw new NotFoundException("Penerimaan Barang (GR) tidak ditemukan");
      const allService = gr.lines.every((l) => l.poLine.item.type === "service");
      debitAccountCode = allService ? COA_CODE.HPP : COA_CODE.PERSEDIAAN;
    }

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next("PINV", dto.companyId, date, tx);
      const invoice = await tx.purchaseInvoice.create({
        data: {
          no,
          date,
          supplierId: dto.supplierId,
          companyId: dto.companyId,
          grId: dto.grId,
          dpp,
          ppn,
          total,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          createdBy,
        },
      });

      await this.journal.postPurchaseInvoice(
        { id: invoice.id, no: invoice.no, date, dpp, ppn, total, companyId: dto.companyId ?? null },
        tx,
        createdBy,
        debitAccountCode,
      );

      return invoice;
    });
  }
}
