import { BadRequestException } from "@nestjs/common";
import { JournalService } from "./journal.service";
import { COA_CODE } from "./coa-codes";

/**
 * §13 data design — baseline test suite, pass 5, item 4. JournalService is the
 * "no man touch" posting engine (§4 data design): postEntry() is the ONLY place
 * journal_line rows are ever written, so its two invariants — debit == credit,
 * and every account code must exist — are the highest-value thing to lock down
 * with a test. reverseEntry() is the only way an already-posted entry is ever
 * undone (never mutated/deleted, §10 data design item 4), so its debit/credit
 * mirroring and idempotency (can't void twice) are covered too.
 *
 * Uses a hand-rolled in-memory fake for the Prisma calls JournalService makes
 * (closedPeriod/account/journalEntry) rather than a real database — this keeps
 * the suite fast and dependency-free while still exercising the real service
 * code end-to-end (no internal method is mocked out).
 */
function makeFakeDb(accountCodes: string[]) {
  const accounts = accountCodes.map((code, i) => ({ id: i + 1, code }));
  const journalEntries: any[] = [];
  let nextEntryId = 1;

  return {
    accounts,
    journalEntries,
    closedPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    account: {
      findMany: jest.fn(({ where }: any) => {
        const codes: string[] = where.code.in;
        return Promise.resolve(accounts.filter((a) => codes.includes(a.code)));
      }),
    },
    journalEntry: {
      create: jest.fn(({ data, include }: any) => {
        const { lines, ...rest } = data;
        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const createdLines = (lines.create as any[]).map((l, i) => ({
          id: i + 1,
          ...l,
          account: include?.lines?.include?.account ? accountById.get(l.accountId) : undefined,
        }));
        const entry = { id: nextEntryId++, ...rest, lines: createdLines, voidedAt: null };
        journalEntries.push(entry);
        return Promise.resolve(entry);
      }),
      findUnique: jest.fn(({ where }: any) => Promise.resolve(journalEntries.find((e) => e.id === where.id) ?? null)),
      update: jest.fn(({ where, data }: any) => {
        const entry = journalEntries.find((e) => e.id === where.id);
        Object.assign(entry, data);
        return Promise.resolve(entry);
      }),
    },
  };
}

describe("JournalService", () => {
  const numbering = { next: jest.fn().mockResolvedValue("JV-26-000001") };

  beforeEach(() => {
    numbering.next.mockClear();
  });

  function makeService(db: ReturnType<typeof makeFakeDb>) {
    // db stands in for both the injected PrismaService and the transaction
    // client postEntry()/reverseEntry() accept as an override — JournalService
    // never touches `this.prisma` directly when a db override is passed.
    return new JournalService(db as any, numbering as any);
  }

  describe("postEntry", () => {
    it("writes a balanced entry and returns it with its lines", async () => {
      const db = makeFakeDb([COA_CODE.PIUTANG_USAHA, COA_CODE.PENJUALAN, COA_CODE.PPN_KELUARAN]);
      const service = makeService(db);

      const entry = await service.postEntry(
        {
          date: new Date("2026-01-15"),
          refType: "sales_invoice",
          refId: 1,
          type: "Penjualan",
          companyId: null,
          lines: [
            { accountCode: COA_CODE.PIUTANG_USAHA, debit: 111_000n },
            { accountCode: COA_CODE.PENJUALAN, credit: 100_000n },
            { accountCode: COA_CODE.PPN_KELUARAN, credit: 11_000n },
          ],
        },
        db as any,
      );

      expect(entry.no).toBe("JV-26-000001");
      expect(entry.lines).toHaveLength(3);
      const totalDebit = entry.lines.reduce((s: bigint, l: any) => s + l.debit, 0n);
      const totalCredit = entry.lines.reduce((s: bigint, l: any) => s + l.credit, 0n);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(111_000n);
    });

    it("rejects an unbalanced entry without writing anything", async () => {
      const db = makeFakeDb([COA_CODE.PIUTANG_USAHA, COA_CODE.PENJUALAN]);
      const service = makeService(db);

      await expect(
        service.postEntry(
          {
            date: new Date("2026-01-15"),
            refType: "sales_invoice",
            refId: 1,
            type: "Penjualan",
            companyId: null,
            lines: [
              { accountCode: COA_CODE.PIUTANG_USAHA, debit: 100_000n },
              { accountCode: COA_CODE.PENJUALAN, credit: 90_000n },
            ],
          },
          db as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(db.journalEntry.create).not.toHaveBeenCalled();
    });

    it("rejects an entry that nets to zero", async () => {
      const db = makeFakeDb([COA_CODE.KAS]);
      const service = makeService(db);

      await expect(
        service.postEntry(
          {
            date: new Date("2026-01-15"),
            refType: "cash_transaction",
            refId: 1,
            type: "Penerimaan",
            companyId: null,
            lines: [],
          },
          db as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an entry referencing an account code that isn't in the COA", async () => {
      const db = makeFakeDb([COA_CODE.KAS]); // PIUTANG_USAHA deliberately missing
      const service = makeService(db);

      await expect(
        service.postEntry(
          {
            date: new Date("2026-01-15"),
            refType: "sales_invoice",
            refId: 1,
            type: "Penjualan",
            companyId: null,
            lines: [
              { accountCode: COA_CODE.KAS, debit: 100n },
              { accountCode: COA_CODE.PIUTANG_USAHA, credit: 100n },
            ],
          },
          db as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("blocks posting into a closed period", async () => {
      const db = makeFakeDb([COA_CODE.KAS, COA_CODE.PIUTANG_USAHA]);
      db.closedPeriod.findFirst.mockResolvedValueOnce({ id: 1, period: "2026-01", companyId: 0 });
      const service = makeService(db);

      await expect(
        service.postEntry(
          {
            date: new Date("2026-01-15"),
            refType: "sales_invoice",
            refId: 1,
            type: "Penjualan",
            companyId: null,
            lines: [
              { accountCode: COA_CODE.KAS, debit: 100n },
              { accountCode: COA_CODE.PIUTANG_USAHA, credit: 100n },
            ],
          },
          db as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("omits zero-amount lines from what gets written", async () => {
      const db = makeFakeDb([COA_CODE.PIUTANG_USAHA, COA_CODE.PENJUALAN, COA_CODE.PPN_KELUARAN]);
      const service = makeService(db);

      const entry = await service.postEntry(
        {
          date: new Date("2026-01-15"),
          refType: "sales_invoice",
          refId: 1,
          type: "Penjualan",
          companyId: null,
          lines: [
            { accountCode: COA_CODE.PIUTANG_USAHA, debit: 100_000n },
            { accountCode: COA_CODE.PENJUALAN, credit: 100_000n },
            { accountCode: COA_CODE.PPN_KELUARAN, credit: 0n }, // e.g. a PPN-exempt line
          ],
        },
        db as any,
      );

      expect(entry.lines).toHaveLength(2);
    });
  });

  describe("business-rule helpers", () => {
    it("postSalesInvoice posts Piutang Usaha (total) against Penjualan (dpp) + PPN Keluaran (ppn)", async () => {
      const db = makeFakeDb([COA_CODE.PIUTANG_USAHA, COA_CODE.PENJUALAN, COA_CODE.PPN_KELUARAN]);
      const service = makeService(db);

      const entry = await service.postSalesInvoice(
        { id: 1, no: "SI-26-000001", date: new Date("2026-01-15"), dpp: 100_000n, ppn: 11_000n, total: 111_000n, companyId: null },
        db as any,
      );

      const byCode = (code: string) => entry.lines.find((l: any) => db.accounts.find((a) => a.id === l.accountId)?.code === code)!;
      expect(byCode(COA_CODE.PIUTANG_USAHA).debit).toBe(111_000n);
      expect(byCode(COA_CODE.PENJUALAN).credit).toBe(100_000n);
      expect(byCode(COA_CODE.PPN_KELUARAN).credit).toBe(11_000n);
    });

    it("postCustomerReceipt books a realized FX gain when more Rupiah is received than was booked", async () => {
      const db = makeFakeDb([COA_CODE.KAS, COA_CODE.PIUTANG_USAHA, COA_CODE.SELISIH_KURS]);
      const service = makeService(db);

      // Invoice booked at Rp 1,000,000 (receivableAmount); customer actually pays Rp 1,050,000.
      const entry = await service.postCustomerReceipt(
        { id: 1, no: "CR-1", date: new Date("2026-01-15"), amount: 1_050_000n, companyId: null },
        COA_CODE.KAS,
        db as any,
        undefined,
        1_000_000n,
      );

      const byCode = (code: string) => entry.lines.find((l: any) => db.accounts.find((a) => a.id === l.accountId)?.code === code)!;
      expect(byCode(COA_CODE.KAS).debit).toBe(1_050_000n);
      expect(byCode(COA_CODE.PIUTANG_USAHA).credit).toBe(1_000_000n);
      expect(byCode(COA_CODE.SELISIH_KURS).credit).toBe(50_000n);
    });
  });

  describe("reverseEntry", () => {
    async function postSimpleEntry(db: ReturnType<typeof makeFakeDb>, service: JournalService) {
      return service.postEntry(
        {
          date: new Date("2026-01-15"),
          refType: "purchase_invoice",
          refId: 1,
          type: "Pembelian",
          companyId: null,
          lines: [
            { accountCode: COA_CODE.PERSEDIAAN, debit: 100_000n },
            { accountCode: COA_CODE.UTANG_USAHA, credit: 100_000n },
          ],
        },
        db as any,
      );
    }

    it("mirrors every line's debit/credit and marks the original voided", async () => {
      const db = makeFakeDb([COA_CODE.PERSEDIAAN, COA_CODE.UTANG_USAHA]);
      const service = makeService(db);
      const original = await postSimpleEntry(db, service);

      const reversal = await service.reverseEntry(original.id, new Date("2026-01-20"), db as any);

      expect(reversal.reversalOfId).toBe(original.id);
      expect(reversal.lines).toEqual([
        expect.objectContaining({ accountId: original.lines[0].accountId, debit: 0n, credit: 100_000n }),
        expect.objectContaining({ accountId: original.lines[1].accountId, debit: 100_000n, credit: 0n }),
      ]);
      // The reversal itself must still balance.
      const totalDebit = reversal.lines.reduce((s: bigint, l: any) => s + l.debit, 0n);
      const totalCredit = reversal.lines.reduce((s: bigint, l: any) => s + l.credit, 0n);
      expect(totalDebit).toBe(totalCredit);

      const refreshed = await db.journalEntry.findUnique({ where: { id: original.id } });
      expect(refreshed.voidedAt).not.toBeNull();
    });

    it("refuses to reverse an entry that was already voided", async () => {
      const db = makeFakeDb([COA_CODE.PERSEDIAAN, COA_CODE.UTANG_USAHA]);
      const service = makeService(db);
      const original = await postSimpleEntry(db, service);
      await service.reverseEntry(original.id, new Date("2026-01-20"), db as any);

      await expect(service.reverseEntry(original.id, new Date("2026-01-21"), db as any)).rejects.toThrow(BadRequestException);
    });

    it("refuses to reverse an entry that doesn't exist", async () => {
      const db = makeFakeDb([COA_CODE.PERSEDIAAN]);
      const service = makeService(db);

      await expect(service.reverseEntry(999, new Date("2026-01-20"), db as any)).rejects.toThrow(BadRequestException);
    });
  });
});
