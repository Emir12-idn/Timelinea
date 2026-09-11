import { BudgetsService } from "./budgets.service";

/**
 * §14 data design (pass keenam), item 3 (Part B test-coverage sweep) — round-1
 * module (§9.3 Anggaran) the round-5 Jest baseline (§13.4) never covered.
 * `monitor()` is the realization math Monitor Anggaran reads: actual is summed
 * from `journal_line` for the account+period, with the sign flipped for
 * credit-normal accounts (pendapatan/kewajiban/ekuitas) so "realisasi"
 * reads the way a human expects (revenue realized = positive), exactly
 * mirroring ReportsService.bukuBesar's sign convention (see the comment in
 * budgets.service.ts). `set()`/`remove()` are plain upserts/deletes, already
 * exercised live in this pass's audit-trail work — this suite is scoped to
 * the one piece of actual calculation logic in this module.
 */
function makeFakeDb() {
  const budgetRows: any[] = [];
  const journalLines: { accountId: number; debit: bigint; credit: bigint; date: Date; companyId: number | null }[] = [];
  const accounts = [
    { id: 1, code: "1-1400", name: "Persediaan Bahan", type: "aset" },
    { id: 2, code: "4-4100", name: "Penjualan", type: "pendapatan" },
    { id: 3, code: "2-2100", name: "Utang Usaha", type: "kewajiban" },
  ];

  return {
    journalLines,
    budget: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          budgetRows
            .filter((b) => b.period === where.period && b.companyId === where.companyId)
            .map((b) => ({ ...b, account: accounts.find((a) => a.id === b.accountId) })),
        ),
      ),
    },
    journalLine: {
      findMany: jest.fn(({ where }: any) => {
        const ids: number[] = where.accountId.in;
        const { gte, lt } = where.entry.date;
        const companyId = where.entry.companyId;
        return Promise.resolve(
          journalLines.filter(
            (l) => ids.includes(l.accountId) && l.date >= gte && l.date < lt && (companyId === undefined || l.companyId === companyId),
          ),
        );
      }),
    },
    seedBudget(period: string, accountId: number, amount: bigint, companyId = 0) {
      budgetRows.push({ id: budgetRows.length + 1, period, accountId, amount, companyId });
    },
  };
}

describe("BudgetsService.monitor — anggaran vs realisasi", () => {
  it("for a debit-normal account (aset), realisasi is the raw net debit minus credit", async () => {
    const db = makeFakeDb();
    db.seedBudget("2026-03", 1, 100_000n);
    db.journalLines.push({ accountId: 1, debit: 50_000n, credit: 20_000n, date: new Date("2026-03-15"), companyId: null });

    const service = new BudgetsService(db as any, { record: jest.fn() } as any);
    const rows = await service.monitor("2026-03");

    expect(rows).toHaveLength(1);
    expect(rows[0].actual).toBe(30_000n); // 50,000 - 20,000
    expect(rows[0].variance).toBe(70_000n); // 100,000 budget - 30,000 actual
  });

  it("for a credit-normal account (pendapatan), realisasi flips the sign so realized revenue reads positive", async () => {
    const db = makeFakeDb();
    db.seedBudget("2026-03", 2, 200_000n);
    // Mostly credited (as revenue normally is) with a small debit (e.g. a correction).
    db.journalLines.push({ accountId: 2, debit: 5_000n, credit: 80_000n, date: new Date("2026-03-20"), companyId: null });

    const service = new BudgetsService(db as any, { record: jest.fn() } as any);
    const rows = await service.monitor("2026-03");

    // raw = debit - credit = 5,000 - 80,000 = -75,000 ; flipped for pendapatan -> 75,000
    expect(rows[0].actual).toBe(75_000n);
    expect(rows[0].variance).toBe(125_000n);
  });

  it("also flips the sign for a kewajiban (liability) account", async () => {
    const db = makeFakeDb();
    db.seedBudget("2026-03", 3, 50_000n);
    db.journalLines.push({ accountId: 3, debit: 0n, credit: 40_000n, date: new Date("2026-03-10"), companyId: null });

    const service = new BudgetsService(db as any, { record: jest.fn() } as any);
    const rows = await service.monitor("2026-03");

    expect(rows[0].actual).toBe(40_000n); // raw -40,000 flipped -> 40,000
  });

  it("excludes journal lines outside the requested period's month", async () => {
    const db = makeFakeDb();
    db.seedBudget("2026-03", 1, 100_000n);
    db.journalLines.push({ accountId: 1, debit: 10_000n, credit: 0n, date: new Date("2026-03-01"), companyId: null }); // in period
    db.journalLines.push({ accountId: 1, debit: 999_000n, credit: 0n, date: new Date("2026-02-28"), companyId: null }); // just before
    db.journalLines.push({ accountId: 1, debit: 999_000n, credit: 0n, date: new Date("2026-04-01"), companyId: null }); // just after

    const service = new BudgetsService(db as any, { record: jest.fn() } as any);
    const rows = await service.monitor("2026-03");

    expect(rows[0].actual).toBe(10_000n);
  });

  it("sums multiple accounts independently, each keyed to its own budget row", async () => {
    const db = makeFakeDb();
    db.seedBudget("2026-03", 1, 100_000n);
    db.seedBudget("2026-03", 2, 200_000n);
    db.journalLines.push({ accountId: 1, debit: 30_000n, credit: 0n, date: new Date("2026-03-05"), companyId: null });
    db.journalLines.push({ accountId: 2, debit: 0n, credit: 60_000n, date: new Date("2026-03-06"), companyId: null });

    const service = new BudgetsService(db as any, { record: jest.fn() } as any);
    const rows = await service.monitor("2026-03");

    const byAccount = new Map(rows.map((r: any) => [r.accountId, r.actual]));
    expect(byAccount.get(1)).toBe(30_000n);
    expect(byAccount.get(2)).toBe(60_000n);
  });

  it("short-circuits to an empty array (no journalLine query at all) when no budget exists for the period", async () => {
    const db = makeFakeDb();
    const service = new BudgetsService(db as any, { record: jest.fn() } as any);

    const rows = await service.monitor("2026-03");

    expect(rows).toEqual([]);
    expect(db.journalLine.findMany).not.toHaveBeenCalled();
  });
});
