import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ChequeGiroStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { CashTransactionsService } from "../cash-transactions.service";
import { CreateChequeGiroDto } from "./dto/create-cheque-giro.dto";

const CG_INCLUDE = { account: true, partner: true, salesInvoice: true, purchaseInvoice: true, cashTransaction: true } as const;

/**
 * Kas & Bank §5 (gap module) — Cek/Giro. `markCleared` tidak menulis aturan jurnal
 * sendiri: ia hanya memanggil CashTransactionsService.create() yang SUDAH ADA (§4),
 * yang lalu memposting jurnal via JournalService.postCustomerReceipt/
 * postSupplierPayment seperti pelunasan tunai biasa. `markBounced` tidak menyentuh
 * jurnal sama sekali — uang memang tidak pernah pindah.
 */
@Injectable()
export class ChequeGiroService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private cashTransactions: CashTransactionsService,
  ) {}

  findAll(status?: ChequeGiroStatus, direction?: "incoming" | "outgoing") {
    return this.prisma.chequeGiro.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}), ...(direction ? { direction } : {}) },
      include: CG_INCLUDE,
      orderBy: { dueDate: "asc" },
    });
  }

  async findOne(id: number) {
    const cg = await this.prisma.chequeGiro.findFirst({ where: { id, deletedAt: null }, include: CG_INCLUDE });
    if (!cg) throw new NotFoundException("Cek/Giro tidak ditemukan");
    return cg;
  }

  async create(dto: CreateChequeGiroDto, createdBy?: number) {
    if (dto.direction === "incoming" && !dto.salesInvoiceId) {
      throw new BadRequestException("Cek/Giro masuk wajib mengacu ke faktur penjualan (salesInvoiceId)");
    }
    if (dto.direction === "outgoing" && !dto.purchaseInvoiceId) {
      throw new BadRequestException("Cek/Giro keluar wajib mengacu ke faktur pembelian (purchaseInvoiceId)");
    }
    const dueDate = new Date(dto.dueDate);

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next(dto.type === "cek" ? "CEK" : "GIRO", dto.companyId, dueDate, tx);
      return tx.chequeGiro.create({
        data: {
          no,
          type: dto.type,
          bankAccount: dto.bankAccount,
          amount: BigInt(dto.amount),
          dueDate,
          direction: dto.direction,
          accountId: dto.accountId,
          partnerId: dto.partnerId,
          salesInvoiceId: dto.salesInvoiceId,
          purchaseInvoiceId: dto.purchaseInvoiceId,
          companyId: dto.companyId,
          note: dto.note,
          createdBy,
        },
        include: CG_INCLUDE,
      });
    });
  }

  /** Cair — hanya boleh pada/lewat due_date, memicu CashTransactionsService yang sudah ada. */
  async markCleared(id: number, createdBy?: number) {
    const cg = await this.findOne(id);
    if (cg.status !== "pending") throw new BadRequestException(`Cek/Giro berstatus "${cg.status}", tidak bisa dicairkan`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < cg.dueDate) {
      throw new BadRequestException(`Belum jatuh tempo (${cg.dueDate.toISOString().slice(0, 10)})`);
    }

    const cashTx = await this.cashTransactions.create(
      {
        type: cg.direction === "incoming" ? "receipt" : "payment",
        date: today.toISOString().slice(0, 10),
        accountId: cg.accountId,
        partnerId: cg.partnerId ?? undefined,
        amount: Number(cg.amount),
        salesInvoiceId: cg.salesInvoiceId ?? undefined,
        purchaseInvoiceId: cg.purchaseInvoiceId ?? undefined,
        companyId: cg.companyId ?? undefined,
        note: `Pencairan ${cg.type === "cek" ? "Cek" : "Giro"} ${cg.no}`,
      },
      createdBy,
    );

    return this.prisma.chequeGiro.update({
      where: { id },
      data: { status: "cleared", cashTransactionId: cashTx.id },
      include: CG_INCLUDE,
    });
  }

  async markBounced(id: number) {
    const cg = await this.findOne(id);
    if (cg.status !== "pending") throw new BadRequestException(`Cek/Giro berstatus "${cg.status}", tidak bisa ditolak`);
    return this.prisma.chequeGiro.update({ where: { id }, data: { status: "bounced" }, include: CG_INCLUDE });
  }
}
