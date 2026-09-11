import { Prisma } from "@prisma/client";
import { ProjectBudgetsService } from "./project-budgets.service";

/**
 * §14 data design (pass keenam), item 3 (Part B test-coverage sweep) — round-1
 * module (§9.4 RAB) the round-5 Jest baseline (§13.4) never covered.
 * `realization()` is the one piece of real calculation logic here: it sums
 * planned RAB lines against ACTUAL cost re-derived from transactions already
 * tagged to the project (§2 "input di modul asal" principle) — Purchase
 * Invoices whose PO is tagged to the project, plus outbound stock_moves
 * tagged directly to it (valued at their own unitCost, §9.1) — deliberately
 * excluding Sales Invoices/SO (that's revenue against contractValue, not
 * cost). `set()` is a plain upsert-all-lines, already exercised live in this
 * pass's audit-trail work.
 */
function makeFakeDb() {
  const projects = new Map<number, any>();
  const projectBudgets = new Map<number, any>();
  const purchaseInvoices: any[] = [];
  const stockMoves: any[] = [];

  return {
    project: {
      findFirst: jest.fn(({ where }: any) => Promise.resolve(projects.get(where.id) ?? null)),
    },
    projectBudget: {
      findUnique: jest.fn(({ where }: any) => Promise.resolve(projectBudgets.get(where.projectId) ?? null)),
    },
    purchaseInvoice: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(purchaseInvoices.filter((i) => i.deletedAt === null && i.poProjectId === where.po.projectId)),
      ),
    },
    stockMove: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(stockMoves.filter((m) => m.projectId === where.projectId && m.qtyOut.gt(0))),
      ),
    },
    seedProject(id: number, code: string, contractValue: bigint | null = null) {
      projects.set(id, { id, code, name: `Proyek ${code}`, contractValue, deletedAt: null });
    },
    seedBudget(projectId: number, lines: { category?: string; description: string; plannedAmount: bigint }[]) {
      projectBudgets.set(projectId, { id: projectId, projectId, lines });
    },
    seedPurchaseInvoice(projectId: number, total: bigint) {
      purchaseInvoices.push({ deletedAt: null, poProjectId: projectId, total });
    },
    seedStockOut(projectId: number, qtyOut: number, unitCost: bigint) {
      stockMoves.push({ projectId, qtyOut: new Prisma.Decimal(qtyOut), unitCost });
    },
  };
}

describe("ProjectBudgetsService.realization — RAB vs biaya aktual", () => {
  it("sums planned RAB lines as plannedTotal", async () => {
    const db = makeFakeDb();
    db.seedProject(1, "PRJ-001");
    db.seedBudget(1, [
      { description: "Material", plannedAmount: 5_000_000n },
      { description: "Tenaga kerja", plannedAmount: 3_000_000n },
    ]);

    const service = new ProjectBudgetsService(db as any, { record: jest.fn() } as any);
    const result = await service.realization(1);

    expect(result.plannedTotal).toBe(8_000_000n);
  });

  it("actual cost = purchase invoices tagged via PO's project + material cost from tagged outbound stock moves", async () => {
    const db = makeFakeDb();
    db.seedProject(1, "PRJ-001");
    db.seedBudget(1, [{ description: "Total", plannedAmount: 10_000_000n }]);
    db.seedPurchaseInvoice(1, 2_000_000n);
    db.seedPurchaseInvoice(1, 1_500_000n);
    db.seedStockOut(1, 10, 50_000n); // 10 * 50,000 = 500,000

    const service = new ProjectBudgetsService(db as any, { record: jest.fn() } as any);
    const result = await service.realization(1);

    expect(result.actual.purchaseCost).toBe(3_500_000n);
    expect(result.actual.materialCost).toBe(500_000n);
    expect(result.actual.total).toBe(4_000_000n);
    expect(result.variance).toBe(6_000_000n); // 10,000,000 planned - 4,000,000 actual
  });

  it("never counts a negative variance as anything other than actual exceeding plan", async () => {
    const db = makeFakeDb();
    db.seedProject(1, "PRJ-001");
    db.seedBudget(1, [{ description: "Total", plannedAmount: 1_000_000n }]);
    db.seedPurchaseInvoice(1, 1_800_000n);

    const service = new ProjectBudgetsService(db as any, { record: jest.fn() } as any);
    const result = await service.realization(1);

    expect(result.variance).toBe(-800_000n); // over budget
  });

  it("ignores purchase invoices and stock moves belonging to OTHER projects", async () => {
    const db = makeFakeDb();
    db.seedProject(1, "PRJ-001");
    db.seedProject(2, "PRJ-002");
    db.seedBudget(1, [{ description: "Total", plannedAmount: 1_000_000n }]);
    db.seedPurchaseInvoice(2, 9_999_000n); // belongs to project 2, must not leak into project 1's realization
    db.seedStockOut(2, 100, 1_000n);

    const service = new ProjectBudgetsService(db as any, { record: jest.fn() } as any);
    const result = await service.realization(1);

    expect(result.actual.total).toBe(0n);
  });

  it("treats a project with no RAB yet as plannedTotal 0, still reporting actual cost", async () => {
    const db = makeFakeDb();
    db.seedProject(1, "PRJ-001");
    db.seedPurchaseInvoice(1, 250_000n);
    // no seedBudget() call — RAB doesn't exist yet.

    const service = new ProjectBudgetsService(db as any, { record: jest.fn() } as any);
    const result = await service.realization(1);

    expect(result.plannedTotal).toBe(0n);
    expect(result.actual.total).toBe(250_000n);
    expect(result.variance).toBe(-250_000n);
  });
});
