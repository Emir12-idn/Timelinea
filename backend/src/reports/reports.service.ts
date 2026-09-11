import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface AccountAgg {
  code: string;
  name: string;
  type: AccountType;
  debit: bigint;
  credit: bigint;
}

function aggregateByAccount(lines: { debit: bigint; credit: bigint; account: { code: string; name: string; type: AccountType } }[]) {
  const byAccount = new Map<string, AccountAgg>();
  for (const l of lines) {
    const cur = byAccount.get(l.account.code) ?? { code: l.account.code, name: l.account.name, type: l.account.type, debit: 0n, credit: 0n };
    cur.debit += l.debit;
    cur.credit += l.credit;
    byAccount.set(l.account.code, cur);
  }
  return [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function agingBucket(daysOverdue: number) {
  if (daysOverdue <= 0) return "Belum jatuh tempo";
  if (daysOverdue <= 30) return "1-30 hari";
  if (daysOverdue <= 60) return "31-60 hari";
  if (daysOverdue <= 90) return "61-90 hari";
  return "> 90 hari";
}

/**
 * Laporan keuangan dihitung langsung dari journal_lines (§4's postXxx() helpers
 * are the only writers) — tidak ada tabel laporan terpisah untuk dijaga konsistensinya.
 * Tidak ada mekanisme tutup buku periode, jadi neraca menyajikan laba/rugi kumulatif
 * sejak awal sebagai "Laba (Rugi) Ditahan" di sisi ekuitas.
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async labaRugi(from: Date | undefined, to: Date | undefined, companyId?: number) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        account: { type: { in: ["pendapatan", "beban"] } },
        entry: {
          ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          ...(companyId ? { companyId } : {}),
        },
      },
      include: { account: true },
    });

    const accounts = aggregateByAccount(lines);
    const pendapatan = accounts
      .filter((a) => a.type === "pendapatan")
      .map((a) => ({ code: a.code, name: a.name, amount: a.credit - a.debit }));
    const beban = accounts
      .filter((a) => a.type === "beban")
      .map((a) => ({ code: a.code, name: a.name, amount: a.debit - a.credit }));

    const totalPendapatan = pendapatan.reduce((s, a) => s + a.amount, 0n);
    const totalBeban = beban.reduce((s, a) => s + a.amount, 0n);

    return {
      from: from ?? null,
      to: to ?? null,
      pendapatan,
      beban,
      totalPendapatan,
      totalBeban,
      labaRugiBersih: totalPendapatan - totalBeban,
    };
  }

  async neraca(asOf: Date | undefined, companyId?: number) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          ...(asOf ? { date: { lte: asOf } } : {}),
          ...(companyId ? { companyId } : {}),
        },
      },
      include: { account: true },
    });

    const accounts = aggregateByAccount(lines);
    const aset = accounts
      .filter((a) => a.type === "aset")
      .map((a) => ({ code: a.code, name: a.name, amount: a.debit - a.credit }));
    const kewajiban = accounts
      .filter((a) => a.type === "kewajiban")
      .map((a) => ({ code: a.code, name: a.name, amount: a.credit - a.debit }));
    const modal = accounts
      .filter((a) => a.type === "ekuitas")
      .map((a) => ({ code: a.code, name: a.name, amount: a.credit - a.debit }));

    const totalPendapatan = accounts
      .filter((a) => a.type === "pendapatan")
      .reduce((s, a) => s + (a.credit - a.debit), 0n);
    const totalBeban = accounts.filter((a) => a.type === "beban").reduce((s, a) => s + (a.debit - a.credit), 0n);
    const labaDitahan = totalPendapatan - totalBeban;

    const ekuitas = [...modal, { code: "-", name: "Laba (Rugi) Ditahan", amount: labaDitahan }];

    const totalAset = aset.reduce((s, a) => s + a.amount, 0n);
    const totalKewajiban = kewajiban.reduce((s, a) => s + a.amount, 0n);
    const totalEkuitas = ekuitas.reduce((s, a) => s + a.amount, 0n);

    return {
      asOf: asOf ?? null,
      aset,
      totalAset,
      kewajiban,
      totalKewajiban,
      ekuitas,
      totalEkuitas,
      balanced: totalAset === totalKewajiban + totalEkuitas,
    };
  }

  async bukuBesar(accountCode: string, from: Date | undefined, to: Date | undefined, companyId?: number) {
    const account = await this.prisma.account.findUnique({ where: { code: accountCode } });
    if (!account) throw new NotFoundException("Akun tidak ditemukan");

    const debitNormal = account.type === "aset" || account.type === "beban";

    const opening = from
      ? await this.prisma.journalLine.aggregate({
          where: {
            accountId: account.id,
            entry: { date: { lt: from }, ...(companyId ? { companyId } : {}) },
          },
          _sum: { debit: true, credit: true },
        })
      : null;
    const openingDebit = opening?._sum.debit ?? 0n;
    const openingCredit = opening?._sum.credit ?? 0n;
    const openingBalance = debitNormal ? openingDebit - openingCredit : openingCredit - openingDebit;

    const entries = await this.prisma.journalLine.findMany({
      where: {
        accountId: account.id,
        entry: {
          ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          ...(companyId ? { companyId } : {}),
        },
      },
      include: { entry: true },
      orderBy: [{ entry: { date: "asc" } }, { id: "asc" }],
    });

    let running = openingBalance;
    const rows = entries.map((l) => {
      running += debitNormal ? l.debit - l.credit : l.credit - l.debit;
      return {
        date: l.entry.date,
        no: l.entry.no,
        refType: l.entry.refType,
        refNo: l.entry.refNo,
        debit: l.debit,
        credit: l.credit,
        balance: running,
      };
    });

    return {
      account: { code: account.code, name: account.name, type: account.type },
      from: from ?? null,
      to: to ?? null,
      openingBalance,
      rows,
      closingBalance: running,
    };
  }

  async aging(type: "piutang" | "hutang", asOf: Date = new Date()) {
    if (type === "piutang") {
      const invoices = await this.prisma.salesInvoice.findMany({
        where: { status: { in: ["sent", "accepted"] }, deletedAt: null },
        include: { customer: true },
      });
      const rows = invoices.map((inv) => {
        const dueDate = addDays(inv.date, inv.customer.termDays ?? 0);
        const daysOverdue = diffDays(asOf, dueDate);
        return {
          no: inv.no,
          partnerName: inv.customer.name,
          date: inv.date,
          dueDate,
          amount: inv.total,
          daysOverdue,
          bucket: agingBucket(daysOverdue),
        };
      });
      return this.summarizeAging(asOf, rows);
    }

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: { status: "open", deletedAt: null },
      include: { supplier: true },
    });
    const rows = invoices.map((inv) => {
      const dueDate = inv.dueDate ?? addDays(inv.date, inv.supplier.termDays ?? 0);
      const daysOverdue = diffDays(asOf, dueDate);
      return {
        no: inv.no,
        partnerName: inv.supplier.name,
        date: inv.date,
        dueDate,
        amount: inv.total,
        daysOverdue,
        bucket: agingBucket(daysOverdue),
      };
    });
    return this.summarizeAging(asOf, rows);
  }

  private summarizeAging(
    asOf: Date,
    rows: { no: string; partnerName: string; date: Date; dueDate: Date; amount: bigint; daysOverdue: number; bucket: string }[],
  ) {
    const bucketOrder = ["Belum jatuh tempo", "1-30 hari", "31-60 hari", "61-90 hari", "> 90 hari"];
    const totals: Record<string, bigint> = Object.fromEntries(bucketOrder.map((b) => [b, 0n]));
    for (const r of rows) totals[r.bucket] += r.amount;
    return {
      asOf,
      rows: rows.sort((a, b) => b.daysOverdue - a.daysOverdue),
      bucketTotals: bucketOrder.map((bucket) => ({ bucket, amount: totals[bucket] })),
      grandTotal: rows.reduce((s, r) => s + r.amount, 0n),
    };
  }

  /**
   * Laporan konsolidasi multi-company (§6, gap module — prioritas rendah). Tidak ada
   * logika baru: memanggil ulang labaRugi()/neraca() di atas per company, plus sekali
   * lagi tanpa companyId untuk baris "Konsolidasi" (query tanpa filter company sudah
   * otomatis menjumlah semua company — itulah yang dipakai sebagai gabungan).
   */
  async konsolidasi(from: Date | undefined, to: Date | undefined, asOf: Date | undefined) {
    const companies = await this.prisma.company.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });

    const perCompany = await Promise.all(
      companies.map(async (c) => ({
        companyId: c.id,
        companyCode: c.code,
        companyName: c.name,
        labaRugi: await this.labaRugi(from, to, c.id),
        neraca: await this.neraca(asOf, c.id),
      })),
    );

    return {
      from: from ?? null,
      to: to ?? null,
      asOf: asOf ?? null,
      companies: perCompany,
      // Gabungan seluruh badan usaha — termasuk jurnal tanpa company_id (mis. entri lama).
      combined: {
        labaRugi: await this.labaRugi(from, to),
        neraca: await this.neraca(asOf),
      },
    };
  }
}
