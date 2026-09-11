import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { COA_CODE } from "./coa-codes";

export interface JournalLineInput {
  accountCode: string;
  debit?: bigint;
  credit?: bigint;
}

export interface PostEntryParams {
  date: Date;
  refType: string;
  refId: number;
  refNo?: string;
  type: string;
  companyId?: number | null;
  createdBy?: number | null;
  lines: JournalLineInput[];
}

/**
 * "No man touch" posting engine — docs/DATA_DESIGN.md §4. Every transaction that
 * gets posted calls postEntry() with the debit/credit lines for its rule; the
 * engine itself only validates sum(debit) == sum(credit) and writes the entry.
 * Adding a new transaction type never touches this file — see the postXxx()
 * helpers below for the current rule set, add a new helper for a new rule.
 */
@Injectable()
export class JournalService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
  ) {}

  /** Runs inside the given transaction (or opens one) so the entry is atomic with its source document. */
  async postEntry(params: PostEntryParams, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit ?? 0n), 0n);
    const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit ?? 0n), 0n);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Jurnal tidak balance: debit ${totalDebit} != kredit ${totalCredit} (ref ${params.refType}#${params.refId})`,
      );
    }
    if (totalDebit === 0n) {
      throw new BadRequestException("Jurnal kosong (total 0), tidak ada yang diposting");
    }

    const codes = [...new Set(params.lines.map((l) => l.accountCode))];
    const accounts = await db.account.findMany({ where: { code: { in: codes } } });
    const accountByCode = new Map(accounts.map((a) => [a.code, a]));
    for (const code of codes) {
      if (!accountByCode.has(code)) {
        throw new BadRequestException(`Akun dengan kode ${code} belum ada di COA`);
      }
    }

    const no = await this.numbering.next("JV", params.companyId, params.date, db);

    return db.journalEntry.create({
      data: {
        no,
        date: params.date,
        refType: params.refType,
        refId: params.refId,
        refNo: params.refNo,
        type: params.type,
        isAuto: true,
        companyId: params.companyId ?? undefined,
        createdBy: params.createdBy ?? undefined,
        lines: {
          create: params.lines
            .filter((l) => (l.debit ?? 0n) !== 0n || (l.credit ?? 0n) !== 0n)
            .map((l) => ({
              accountId: accountByCode.get(l.accountCode)!.id,
              debit: l.debit ?? 0n,
              credit: l.credit ?? 0n,
            })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  // ---- Rule: Faktur Penjualan -> Debit Piutang Usaha (total) | Kredit Penjualan (dpp), PPN Keluaran (ppn)
  postSalesInvoice(
    invoice: { id: number; no: string; date: Date; dpp: bigint; ppn: bigint; total: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: invoice.date,
        refType: "sales_invoice",
        refId: invoice.id,
        refNo: invoice.no,
        type: "Penjualan",
        companyId: invoice.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.PIUTANG_USAHA, debit: invoice.total },
          { accountCode: COA_CODE.PENJUALAN, credit: invoice.dpp },
          { accountCode: COA_CODE.PPN_KELUARAN, credit: invoice.ppn },
        ],
      },
      db,
    );
  }

  // ---- Rule: Retur Penjualan -> Debit Penjualan (dpp), PPN Keluaran (ppn) | Kredit Piutang Usaha (total)
  postSalesReturn(
    ret: { id: number; no: string; date: Date; dpp: bigint; ppn: bigint; total: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: ret.date,
        refType: "sales_return",
        refId: ret.id,
        refNo: ret.no,
        type: "Retur Penjualan",
        companyId: ret.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.PENJUALAN, debit: ret.dpp },
          { accountCode: COA_CODE.PPN_KELUARAN, debit: ret.ppn },
          { accountCode: COA_CODE.PIUTANG_USAHA, credit: ret.total },
        ],
      },
      db,
    );
  }

  // ---- Rule: Penerimaan dari pelanggan -> Debit Bank/Kas (total) | Kredit Piutang Usaha (total)
  postCustomerReceipt(
    receipt: { id: number; no: string; date: Date; amount: bigint; companyId: number | null },
    cashAccountCode: string,
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: receipt.date,
        refType: "cash_transaction",
        refId: receipt.id,
        refNo: receipt.no,
        type: "Penerimaan Penjualan",
        companyId: receipt.companyId,
        createdBy,
        lines: [
          { accountCode: cashAccountCode, debit: receipt.amount },
          { accountCode: COA_CODE.PIUTANG_USAHA, credit: receipt.amount },
        ],
      },
      db,
    );
  }

  // ---- Rule: Faktur Pembelian -> Debit Persediaan/Beban (dpp), PPN Masukan (ppn) | Kredit Utang Usaha (total)
  postPurchaseInvoice(
    invoice: { id: number; no: string; date: Date; dpp: bigint; ppn: bigint; total: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
    debitAccountCode: string = COA_CODE.PERSEDIAAN,
  ) {
    return this.postEntry(
      {
        date: invoice.date,
        refType: "purchase_invoice",
        refId: invoice.id,
        refNo: invoice.no,
        type: "Pembelian",
        companyId: invoice.companyId,
        createdBy,
        lines: [
          { accountCode: debitAccountCode, debit: invoice.dpp },
          { accountCode: COA_CODE.PPN_MASUKAN, debit: invoice.ppn },
          { accountCode: COA_CODE.UTANG_USAHA, credit: invoice.total },
        ],
      },
      db,
    );
  }

  // ---- Rule: Retur Pembelian -> Debit Utang Usaha (total) | Kredit Persediaan/HPP (dpp), PPN Masukan (ppn)
  postPurchaseReturn(
    ret: { id: number; no: string; date: Date; dpp: bigint; ppn: bigint; total: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
    creditAccountCode: string = COA_CODE.PERSEDIAAN,
  ) {
    return this.postEntry(
      {
        date: ret.date,
        refType: "purchase_return",
        refId: ret.id,
        refNo: ret.no,
        type: "Retur Pembelian",
        companyId: ret.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.UTANG_USAHA, debit: ret.total },
          { accountCode: creditAccountCode, credit: ret.dpp },
          { accountCode: COA_CODE.PPN_MASUKAN, credit: ret.ppn },
        ],
      },
      db,
    );
  }

  // ---- Rule: Pembayaran ke pemasok -> Debit Utang Usaha (total) | Kredit Bank/Kas (total)
  postSupplierPayment(
    payment: { id: number; no: string; date: Date; amount: bigint; companyId: number | null },
    cashAccountCode: string,
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: payment.date,
        refType: "cash_transaction",
        refId: payment.id,
        refNo: payment.no,
        type: "Pembayaran Pembelian",
        companyId: payment.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.UTANG_USAHA, debit: payment.amount },
          { accountCode: cashAccountCode, credit: payment.amount },
        ],
      },
      db,
    );
  }

  // ---- Rule: Penggajian -> Debit Beban Gaji & Upah (gross)
  //            Kredit Utang PPh 21, Piutang Karyawan (cicilan kasbon+hutang), Utang BPJS, Kas (net pay)
  postPayroll(
    payslip: {
      id: number;
      period: string;
      employeeId: number;
      gross: bigint;
      bpjs: bigint;
      taxPph21: bigint;
      kasbonInstallment: bigint;
      loanInstallment: bigint;
      netPay: bigint;
    },
    date: Date,
    companyId: number | null,
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date,
        refType: "payslip",
        refId: payslip.id,
        refNo: `Payroll ${payslip.period} #${payslip.employeeId}`,
        type: "Penggajian",
        companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.BEBAN_GAJI, debit: payslip.gross },
          { accountCode: COA_CODE.UTANG_PPH21, credit: payslip.taxPph21 },
          { accountCode: COA_CODE.UTANG_BPJS, credit: payslip.bpjs },
          { accountCode: COA_CODE.PIUTANG_KARYAWAN, credit: payslip.kasbonInstallment + payslip.loanInstallment },
          { accountCode: COA_CODE.KAS, credit: payslip.netPay },
        ],
      },
      db,
    );
  }

  // ---- Rule: Kasbon disetujui -> Debit Piutang Karyawan (amount) | Kredit Kas (amount)
  postCashAdvanceApproval(
    advance: { id: number; date: Date; amount: bigint },
    companyId: number | null,
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: advance.date,
        refType: "cash_advance",
        refId: advance.id,
        refNo: `CA-${advance.id}`,
        type: "Kasbon",
        companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.PIUTANG_KARYAWAN, debit: advance.amount },
          { accountCode: COA_CODE.KAS, credit: advance.amount },
        ],
      },
      db,
    );
  }

  // ---- Rule: HPP Penjualan -> Debit Harga Pokok Penjualan (amount) | Kredit Persediaan (amount)
  // Persediaan §1 (gap module) — biaya riil dari CostingService (average/FIFO),
  // dipicu saat Surat Jalan diposting untuk baris item bertipe stock.
  postCogs(
    params: { refId: number; refNo: string; date: Date; amount: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    return this.postEntry(
      {
        date: params.date,
        refType: "delivery_order",
        refId: params.refId,
        refNo: params.refNo,
        type: "HPP Penjualan",
        companyId: params.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.HPP, debit: params.amount },
          { accountCode: COA_CODE.PERSEDIAAN, credit: params.amount },
        ],
      },
      db,
    );
  }

  // ---- Rule: Produksi Selesai (Work Order) -> Debit Persediaan (barang jadi, biaya
  //            bahan + konversi) | Kredit Persediaan (bahan terkonsumsi), Kredit Beban
  //            Konversi Produksi (kalau ada biaya konversi manual — pindah dari beban ke
  //            nilai persediaan, standar akuntansi penyerapan overhead produksi).
  postProduction(
    params: { workOrderId: number; no: string; date: Date; materialCost: bigint; conversionCost: bigint; companyId: number | null },
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    const lines: JournalLineInput[] = [
      { accountCode: COA_CODE.PERSEDIAAN, debit: params.materialCost + params.conversionCost },
      { accountCode: COA_CODE.PERSEDIAAN, credit: params.materialCost },
    ];
    if (params.conversionCost > 0n) {
      lines.push({ accountCode: COA_CODE.BEBAN_KONVERSI, credit: params.conversionCost });
    }
    return this.postEntry(
      {
        date: params.date,
        refType: "work_order",
        refId: params.workOrderId,
        refNo: params.no,
        type: "Produksi",
        companyId: params.companyId,
        createdBy,
        lines,
      },
      db,
    );
  }

  /**
   * Membatalkan (void) sebuah entry yang sudah posting — §10 data design, item 4.
   * TIDAK PERNAH menghapus/mengubah baris jurnal yang sudah ada (itu prinsip "no
   * man touch" §4: sekali posting, tetap ada selamanya untuk jejak audit). Sebagai
   * gantinya membuat entry PEMBALIK baru (debit/kredit tiap baris ditukar, jadi
   * totalnya otomatis balance juga) dan menandai entry asal `voidedAt`. Ini pola
   * standar software akuntansi Indonesia — termasuk Accurate: fitur "Void" pada
   * transaksi yang sudah posting otomatis membuat jurnal pembalik, bukan menghapus.
   */
  async reverseEntry(entryId: number, date: Date, db: Prisma.TransactionClient | PrismaService = this.prisma, createdBy?: number | null) {
    const original = await db.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true } });
    if (!original) {
      throw new BadRequestException(`Jurnal #${entryId} tidak ditemukan`);
    }
    if (original.voidedAt) {
      throw new BadRequestException(`Jurnal ${original.no} sudah pernah dibatalkan sebelumnya`);
    }

    const no = await this.numbering.next("JV", original.companyId, date, db);
    const reversal = await db.journalEntry.create({
      data: {
        no,
        date,
        refType: original.refType,
        refId: original.refId,
        refNo: `Pembalik ${original.no}`,
        type: `Pembalik ${original.type}`,
        isAuto: true,
        companyId: original.companyId ?? undefined,
        createdBy: createdBy ?? undefined,
        reversalOfId: original.id,
        lines: {
          // Tukar debit<->kredit tiap baris — cermin dari entry asal yang sudah
          // balance, jadi entry pembalik ini otomatis balance juga tanpa perlu
          // divalidasi ulang lewat postEntry().
          create: original.lines.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
    await db.journalEntry.update({ where: { id: original.id }, data: { voidedAt: new Date() } });
    return reversal;
  }

  // ---- Rule: Penyusutan bulanan -> Debit Beban Penyusutan | Kredit Akumulasi Penyusutan
  postDepreciation(
    asset: { id: number; code: string; companyId: number | null },
    amount: bigint,
    period: string,
    db: Prisma.TransactionClient | PrismaService,
    createdBy?: number | null,
  ) {
    const [year, month] = period.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return this.postEntry(
      {
        date,
        refType: "fixed_asset",
        refId: asset.id,
        refNo: `${asset.code} ${period}`,
        type: "Penyusutan",
        companyId: asset.companyId,
        createdBy,
        lines: [
          { accountCode: COA_CODE.BEBAN_PENYUSUTAN, debit: amount },
          { accountCode: COA_CODE.AKUMULASI_PENYUSUTAN, credit: amount },
        ],
      },
      db,
    );
  }
}
