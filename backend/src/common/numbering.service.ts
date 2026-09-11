import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Generates sequential document numbers like "PO-26-000123", scoped per
 * doc type/year/company so numbering resets every year and per legal entity.
 * Uses an atomic upsert+increment on Counter so concurrent requests never
 * collide (Postgres serializes the row-level update). Pass a transaction
 * client so the number is only "burned" if the surrounding document commits.
 *
 * Display format is `PREFIX-YY-SEQ` (2-digit year, 6-digit zero-padded
 * sequence) — docs/DATA_DESIGN.md §10: publicly documented Accurate 5
 * numbering (e.g. its Journal Voucher scheme of branch+type+**2-digit
 * year**+serial, and training-material examples like "FJ-000001") uses a
 * short 2-digit year segment, not a 4-digit one. The Counter row itself
 * still keys on the full 4-digit year (`year` column) so numbering still
 * resets on a real calendar-year boundary and stays unambiguous across
 * centuries — only the rendered string is shortened.
 */
@Injectable()
export class NumberingService {
  constructor(private prisma: PrismaService) {}

  async next(key: string, companyId?: number | null, date: Date = new Date(), db: Db = this.prisma): Promise<string> {
    const year = date.getFullYear();
    const scopedCompanyId = companyId ?? 0;
    const counter = await db.counter.upsert({
      where: { key_year_companyId: { key, year, companyId: scopedCompanyId } },
      create: { key, year, companyId: scopedCompanyId, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    const yy = String(year).slice(-2);
    const seq = String(counter.seq).padStart(6, "0");
    return `${key}-${yy}-${seq}`;
  }
}
