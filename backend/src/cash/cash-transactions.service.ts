import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CashTransactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NumberingService } from "../common/numbering.service";
import { JournalService } from "../accounting/journal/journal.service";
import { CreateCashTransactionDto } from "./dto/create-cash-transaction.dto";

@Injectable()
export class CashTransactionsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
    private journal: JournalService,
  ) {}

  findAll(type?: CashTransactionType) {
    return this.prisma.cashTransaction.findMany({
      where: type ? { type } : {},
      include: { partner: true, account: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const tx = await this.prisma.cashTransaction.findUnique({
      where: { id },
      include: { partner: true, account: true, salesInvoice: true, purchaseInvoice: true },
    });
    if (!tx) throw new NotFoundException("Transaksi kas/bank tidak ditemukan");
    return tx;
  }

  /**
   * Penerimaan dari pelanggan / pembayaran ke pemasok — memicu jurnal otomatis §4.
   * type=receipt butuh salesInvoiceId, type=payment butuh purchaseInvoiceId (biar tahu
   * akun lawan Piutang/Utang Usaha mana yang dilunasi).
   */
  async create(dto: CreateCashTransactionDto, createdBy?: number) {
    const date = new Date(dto.date);
    const amount = BigInt(dto.amount);

    if (dto.type === "receipt" && !dto.salesInvoiceId) {
      throw new BadRequestException("Penerimaan wajib mengacu ke sales invoice (salesInvoiceId)");
    }
    if (dto.type === "payment" && !dto.purchaseInvoiceId) {
      throw new BadRequestException("Pembayaran wajib mengacu ke purchase invoice (purchaseInvoiceId)");
    }

    // Item 4 (§10 data design): tidak boleh menerima/membayar faktur yang sudah
    // dibatalkan (void) — konsisten dengan guard di sisi lain (voidInvoice menolak
    // membatalkan faktur yang sudah ada penerimaan/pembayaran tertaut).
    //
    // Multi-currency §11 data design, item 2: juga dipakai untuk selisih kurs —
    // `salesInvoice`/`purchaseInvoice` di bawah dibaca sebelum transaksi supaya
    // `.total`-nya (Rupiah yang DIBOOKING saat faktur dibuat) tersedia untuk
    // dibandingkan dengan `amount` (Rupiah yang benar-benar diterima/dibayar).
    let salesInvoice: { no: string; total: bigint; currency: string } | null = null;
    let purchaseInvoice: { no: string; total: bigint; currency: string } | null = null;
    if (dto.type === "receipt" && dto.salesInvoiceId) {
      const inv = await this.prisma.salesInvoice.findFirst({ where: { id: dto.salesInvoiceId, deletedAt: null } });
      if (!inv) throw new NotFoundException("Faktur Penjualan tidak ditemukan");
      if (inv.status === "void") throw new BadRequestException(`Faktur ${inv.no} sudah dibatalkan (void), tidak bisa menerima pembayaran`);
      salesInvoice = inv;
    }
    if (dto.type === "payment" && dto.purchaseInvoiceId) {
      const inv = await this.prisma.purchaseInvoice.findFirst({ where: { id: dto.purchaseInvoiceId, deletedAt: null } });
      if (!inv) throw new NotFoundException("Faktur Pembelian tidak ditemukan");
      if (inv.status === "void") throw new BadRequestException(`Faktur ${inv.no} sudah dibatalkan (void), tidak bisa dibayar`);
      purchaseInvoice = inv;
    }

    const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException("Akun kas/bank tidak ditemukan");

    return this.prisma.$transaction(async (tx) => {
      const no = await this.numbering.next(dto.type === "receipt" ? "CR" : "CP", dto.companyId, date, tx);
      const cashTx = await tx.cashTransaction.create({
        data: {
          no,
          type: dto.type,
          date,
          accountId: dto.accountId,
          partnerId: dto.partnerId,
          amount,
          salesInvoiceId: dto.salesInvoiceId,
          purchaseInvoiceId: dto.purchaseInvoiceId,
          companyId: dto.companyId,
          exchangeRate: dto.exchangeRate,
          note: dto.note,
          createdBy,
        },
      });

      if (dto.type === "receipt") {
        // Multi-currency §11 data design, item 2: untuk faktur non-IDR, jurnal
        // meng-kredit Piutang Usaha sebesar `salesInvoice.total` yang DIBOOKING
        // (bukan `amount`) — selisihnya otomatis diposting ke Selisih Kurs oleh
        // postCustomerReceipt(). Untuk IDR, receivableAmount = amount (default
        // parameter), jadi perilakunya identik dengan sebelum multi-currency ada.
        const receivableAmount = salesInvoice && salesInvoice.currency !== "IDR" ? salesInvoice.total : amount;
        await this.journal.postCustomerReceipt(
          { id: cashTx.id, no: cashTx.no, date, amount, companyId: dto.companyId ?? null },
          account.code,
          tx,
          createdBy,
          receivableAmount,
        );
        await tx.salesInvoice.update({ where: { id: dto.salesInvoiceId! }, data: { status: "paid" } });
      } else {
        const payableAmount = purchaseInvoice && purchaseInvoice.currency !== "IDR" ? purchaseInvoice.total : amount;
        await this.journal.postSupplierPayment(
          { id: cashTx.id, no: cashTx.no, date, amount, companyId: dto.companyId ?? null },
          account.code,
          tx,
          createdBy,
          payableAmount,
        );
        await tx.purchaseInvoice.update({ where: { id: dto.purchaseInvoiceId! }, data: { status: "paid" } });
      }

      return cashTx;
    });
  }
}
