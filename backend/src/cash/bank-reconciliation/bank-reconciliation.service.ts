import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { CreateStatementLineDto } from "./dto/create-statement-line.dto";
import { ListStatementLinesDto } from "./dto/list-statement-lines.dto";

/**
 * Rekonsiliasi bank murni alat pencocokan — tidak posting apa pun ke jurnal.
 * CashTransaction sudah diposting saat dibuat (§4); di sini kita cuma
 * mencocokkan baris rekening koran (dientri manual, belum ada API feed bank
 * lokal) dengan CashTransaction yang sudah ada, supaya kelihatan mana yang
 * "sudah dicatat sistem tapi belum kelihatan di bank" dan sebaliknya.
 */
@Injectable()
export class BankReconciliationService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  createLine(dto: CreateStatementLineDto, createdBy?: number) {
    return this.prisma.bankStatementLine.create({
      data: {
        accountId: dto.accountId,
        date: new Date(dto.date),
        description: dto.description,
        amount: BigInt(dto.amount),
        companyId: dto.companyId,
        createdBy,
      },
    });
  }

  findLines(query: ListStatementLinesDto) {
    return this.prisma.bankStatementLine.findMany({
      where: {
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.matched === true ? { cashTransactionId: { not: null } } : {}),
        ...(query.matched === false ? { cashTransactionId: null } : {}),
      },
      include: { account: true, cashTransaction: { include: { partner: true } } },
      orderBy: { date: "desc" },
    });
  }

  async match(id: number, cashTransactionId: number, actorId?: number) {
    const line = await this.prisma.bankStatementLine.findUnique({ where: { id } });
    if (!line) throw new NotFoundException("Baris rekening koran tidak ditemukan");
    if (line.cashTransactionId) throw new BadRequestException("Baris ini sudah dicocokkan");

    const cashTx = await this.prisma.cashTransaction.findUnique({
      where: { id: cashTransactionId },
      include: { bankStatementLine: true },
    });
    if (!cashTx) throw new NotFoundException("Transaksi kas/bank tidak ditemukan");
    if (cashTx.bankStatementLine) throw new BadRequestException("Transaksi ini sudah dicocokkan ke baris lain");
    if (cashTx.accountId !== line.accountId) {
      throw new BadRequestException("Transaksi dan baris rekening koran memakai akun Kas/Bank yang berbeda");
    }

    const expectedAmount = cashTx.type === "receipt" ? cashTx.amount : -cashTx.amount;
    if (expectedAmount !== line.amount) {
      throw new BadRequestException(
        `Jumlah tidak cocok: baris rekening koran ${line.amount}, transaksi ${cashTx.type === "receipt" ? "+" : "-"}${cashTx.amount}`,
      );
    }

    const updated = await this.prisma.bankStatementLine.update({ where: { id }, data: { cashTransactionId } });
    // §12 data design — cocok/batal-cocok rekonsiliasi bank tidak menyentuh
    // jurnal (murni alat pencocokan, lihat komentar kelas di atas), tapi tetap
    // mengubah status pencocokan sebuah dokumen — dicatat sama seperti aksi
    // status-berubah lain di §11.6.
    await this.auditLog.record({
      actorId,
      action: "match",
      entityType: "bank_statement_line",
      entityId: id,
      before: { cashTransactionId: null },
      after: { cashTransactionId: updated.cashTransactionId },
    });
    return updated;
  }

  async unmatch(id: number, actorId?: number) {
    const line = await this.prisma.bankStatementLine.findUnique({ where: { id } });
    if (!line) throw new NotFoundException("Baris rekening koran tidak ditemukan");
    const updated = await this.prisma.bankStatementLine.update({ where: { id }, data: { cashTransactionId: null } });
    await this.auditLog.record({
      actorId,
      action: "unmatch",
      entityType: "bank_statement_line",
      entityId: id,
      before: { cashTransactionId: line.cashTransactionId },
      after: { cashTransactionId: null },
    });
    return updated;
  }

  async summary(accountId: number, asOf?: Date) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Akun tidak ditemukan");

    const lines = await this.prisma.journalLine.findMany({
      where: { accountId, entry: asOf ? { date: { lte: asOf } } : {} },
    });
    const bookBalance = lines.reduce((sum, l) => sum + (l.debit - l.credit), 0n);

    const [matchedIds, unmatchedTransactions, unmatchedLines] = await Promise.all([
      this.prisma.bankStatementLine
        .findMany({ where: { accountId, cashTransactionId: { not: null } }, select: { cashTransactionId: true } })
        .then((rows) => rows.map((r) => r.cashTransactionId!)),
      this.prisma.cashTransaction.findMany({ where: { accountId }, include: { partner: true } }),
      this.prisma.bankStatementLine.findMany({ where: { accountId, cashTransactionId: null }, orderBy: { date: "desc" } }),
    ]);
    const unmatchedBookTransactions = unmatchedTransactions.filter((t) => !matchedIds.includes(t.id));

    return {
      account: { id: account.id, code: account.code, name: account.name },
      asOf: asOf ?? null,
      bookBalance,
      unmatchedBookTransactions,
      unmatchedStatementLines: unmatchedLines,
    };
  }
}
