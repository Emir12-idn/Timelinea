import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Generates sequential document numbers like "PO-2026-000123", scoped per
 * doc type/year/company so numbering resets every year and per legal entity.
 * Uses an atomic upsert+increment on Counter so concurrent requests never
 * collide (Postgres serializes the row-level update). Pass a transaction
 * client so the number is only "burned" if the surrounding document commits.
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
    const seq = String(counter.seq).padStart(6, "0");
    return `${key}-${year}-${seq}`;
  }
}
