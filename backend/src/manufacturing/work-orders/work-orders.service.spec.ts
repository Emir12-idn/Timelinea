import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { WorkOrdersService } from "./work-orders.service";
import { CostingService } from "../../inventory/costing.service";
import { JournalService } from "../../accounting/journal/journal.service";
import { COA_CODE } from "../../accounting/journal/coa-codes";

/**
 * §14 data design (pass keenam), item 3 (Part B test-coverage sweep) — round-1
 * module (§9.2 Pabrikasi) that the round-5 Jest baseline (§13.4) never covered,
 * even though BOM-consumption math is exactly the kind of financial-calculation
 * logic that pass explicitly prioritized (moving-average cost, weighted
 * finished-goods unit cost, journal amounts). Posting to "done" is the ONLY
 * place WorkOrdersService touches stock/journal (see the long comment at the
 * top of work-orders.service.ts), so that's what this suite exercises.
 *
 * Uses REAL CostingService and JournalService instances (not mocked out) wired
 * to a small in-memory fake covering everything both of them touch (item/
 * stockMove/stockLayer for costing, account/journalEntry/closedPeriod for
 * journal) plus the workOrder collection itself — same style as
 * costing.service.spec.ts and journal.service.spec.ts, so the actual
 * consumption/weighted-average/rounding math is what gets tested, not a mock
 * standing in for it.
 */
function makeFakeDb(accountCodes: string[]) {
  const accounts = accountCodes.map((code, i) => ({ id: i + 1, code }));
  const itemRows = new Map<number, any>();
  const stockMoves: any[] = [];
  const stockLayers: any[] = [];
  const journalEntries: any[] = [];
  const workOrders = new Map<number, any>();
  let nextMoveId = 1;
  let nextEntryId = 1;

  const db: any = {
    accounts,
    stockMoves,
    journalEntries,
    item: {
      findUniqueOrThrow: jest.fn(({ where }: any) => {
        const it = itemRows.get(where.id);
        if (!it) throw new Error(`item ${where.id} not found`);
        return Promise.resolve(it);
      }),
      update: jest.fn(({ where, data }: any) => {
        const it = itemRows.get(where.id)!;
        Object.assign(it, data);
        return Promise.resolve(it);
      }),
    },
    stockMove: {
      create: jest.fn(({ data }: any) => {
        const move = { id: nextMoveId++, ...data, qtyIn: new Prisma.Decimal(data.qtyIn ?? 0), qtyOut: new Prisma.Decimal(data.qtyOut ?? 0) };
        stockMoves.push(move);
        return Promise.resolve(move);
      }),
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(stockMoves.filter((m) => m.itemId === where.itemId && m.warehouseId === where.warehouseId)),
      ),
      findFirst: jest.fn(() => Promise.resolve(null)),
    },
    stockLayer: {
      create: jest.fn(({ data }: any) => {
        const layer = { id: stockLayers.length + 1, ...data, qtyRemaining: new Prisma.Decimal(data.qtyRemaining) };
        stockLayers.push(layer);
        return Promise.resolve(layer);
      }),
      findMany: jest.fn(() => Promise.resolve([])),
      update: jest.fn(),
    },
    closedPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
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
    workOrder: {
      findFirst: jest.fn(({ where }: any) => Promise.resolve(workOrders.get(where.id) ?? null)),
      update: jest.fn(({ where, data }: any) => {
        const wo = workOrders.get(where.id)!;
        Object.assign(wo, data);
        return Promise.resolve(wo);
      }),
    },
    $transaction: (fn: (tx: any) => Promise<any>) => fn(db),
  };

  return {
    db,
    addItem(id: number, costingMethod: "average" | "fifo" = "average") {
      itemRows.set(id, { id, costingMethod, tracksExpiry: false, lastCost: null as bigint | null });
    },
    addWorkOrder(wo: any) {
      workOrders.set(wo.id, wo);
    },
  };
}

describe("WorkOrdersService — posting to done (BOM consumption + finished-goods costing)", () => {
  const numbering = { next: jest.fn().mockResolvedValue("WO-26-000001") };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    numbering.next.mockClear();
    auditLog.record.mockClear();
  });

  function makeServices(accountCodes: string[]) {
    const { db, addItem, addWorkOrder } = makeFakeDb(accountCodes);
    const costing = new CostingService(db as any);
    const journal = new JournalService(db as any, numbering as any);
    const service = new WorkOrdersService(db as any, numbering as any, journal as any, costing as any, auditLog as any);
    return { db, addItem, addWorkOrder, costing, service };
  }

  it("consumes BOM material at qtyPerUnit * plannedQty, valued at the material's moving-average cost", async () => {
    const { db, addItem, addWorkOrder, costing, service } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1); // bahan
    addItem(2); // barang jadi
    // 100 @ 1000 on hand -> average cost 1000
    await costing.stockIn(db, { itemId: 1, warehouseId: 1, qty: 100, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });

    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(10),
      warehouseId: 1,
      conversionCost: 5000n,
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(2) }] },
    });

    const result = await service.updateStatus(1, "done", 1);

    expect(result.status).toBe("done");
    // 2 * 10 = 20 units of material consumed @ 1000 = 20,000 material cost.
    const materialOut = db.stockMoves.find((m: any) => m.itemId === 1 && m.qtyOut.toNumber() === 20);
    expect(materialOut).toBeDefined();
    expect(materialOut.unitCost).toBe(1000n);
    // Finished good: (20,000 material + 5,000 conversion) / 10 planned = 2,500/unit.
    const fgIn = db.stockMoves.find((m: any) => m.itemId === 2 && m.qtyIn.toNumber() === 10);
    expect(fgIn).toBeDefined();
    expect(fgIn.unitCost).toBe(2500n);
  });

  it("posts a balanced production journal entry: Persediaan debit (material+conversion), Persediaan credit (material), Beban Konversi credit (conversion)", async () => {
    const { addItem, addWorkOrder, costing, service, db } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1);
    addItem(2);
    await costing.stockIn(db, { itemId: 1, warehouseId: 1, qty: 50, unitCost: 2000n, date: new Date("2026-01-01"), refType: "test" });

    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(5),
      warehouseId: 1,
      conversionCost: 10_000n,
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(1) }] },
    });

    await service.updateStatus(1, "done", 1);

    expect(db.journalEntries).toHaveLength(1);
    const entry = db.journalEntries[0];
    const byCode = (code: string) => entry.lines.filter((l: any) => db.accounts.find((a: any) => a.id === l.accountId)?.code === code);
    // material cost = 1 * 5 * 2000 = 10,000 ; conversion = 10,000 ; FG value = 20,000
    const persediaanLines = byCode(COA_CODE.PERSEDIAAN);
    expect(persediaanLines.find((l: any) => l.debit === 20_000n)).toBeDefined();
    expect(persediaanLines.find((l: any) => l.credit === 10_000n)).toBeDefined();
    expect(byCode(COA_CODE.BEBAN_KONVERSI)[0].credit).toBe(10_000n);
    const totalDebit = entry.lines.reduce((s: bigint, l: any) => s + l.debit, 0n);
    const totalCredit = entry.lines.reduce((s: bigint, l: any) => s + l.credit, 0n);
    expect(totalDebit).toBe(totalCredit);
  });

  it("omits the Beban Konversi line entirely when conversionCost is zero (no conversion cost incurred)", async () => {
    const { addItem, addWorkOrder, costing, service, db } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1);
    addItem(2);
    await costing.stockIn(db, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 500n, date: new Date("2026-01-01"), refType: "test" });

    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(2),
      warehouseId: 1,
      conversionCost: 0n,
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(1) }] },
    });

    await service.updateStatus(1, "done", 1);

    const entry = db.journalEntries[0];
    expect(entry.lines).toHaveLength(2); // only the two Persediaan lines, no Beban Konversi line
  });

  it("rounds the finished-goods unit cost down when material+conversion doesn't divide evenly by plannedQty", async () => {
    const { addItem, addWorkOrder, costing, service, db } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1);
    addItem(2);
    await costing.stockIn(db, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });

    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(3), // 1000*1*3=3000 material, no conversion -> 3000/3 exact... use conversion to force a remainder
      warehouseId: 1,
      conversionCost: 100n, // total 3100 / 3 = 1033.33... -> floors to 1033
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(1) }] },
    });

    await service.updateStatus(1, "done", 1);

    const fgIn = db.stockMoves.find((m: any) => m.itemId === 2);
    expect(fgIn.unitCost).toBe(1033n);
  });

  it("rejects consuming more material than is on hand (stock-minus guard applies through Work Order posting too)", async () => {
    const { addItem, addWorkOrder, service } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1);
    addItem(2);
    // No stock-in for item 1 at all -> 0 on hand.

    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(1),
      warehouseId: 1,
      conversionCost: 0n,
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(1) }] },
    });

    await expect(service.updateStatus(1, "done", 1)).rejects.toThrow(BadRequestException);
  });

  it("records an audit-log entry for the production posting with material/conversion/FG-unit-cost in `after`", async () => {
    const { addItem, addWorkOrder, costing, service, db } = makeServices([COA_CODE.PERSEDIAAN, COA_CODE.BEBAN_KONVERSI]);
    addItem(1);
    addItem(2);
    await costing.stockIn(db, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });
    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(2),
      warehouseId: 1,
      conversionCost: 0n,
      status: "draft",
      projectId: null,
      bom: { lines: [{ materialItemId: 1, qtyPerUnit: new Prisma.Decimal(1) }] },
    });

    await service.updateStatus(1, "done", 1);

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "post",
        entityType: "work_order",
        entityId: 1,
        after: expect.objectContaining({ status: "done", materialCost: 2000n, conversionCost: 0n, fgUnitCost: 1000n }),
      }),
      expect.anything(),
    );
  });

  it("rejects an invalid status transition (e.g. done -> cancelled) without touching stock or the journal", async () => {
    const { addWorkOrder, service, db } = makeServices([COA_CODE.PERSEDIAAN]);
    addWorkOrder({
      id: 1,
      no: "WO-26-000001",
      date: new Date("2026-01-05"),
      productItemId: 2,
      bomId: 1,
      plannedQty: new Prisma.Decimal(1),
      warehouseId: 1,
      conversionCost: 0n,
      status: "done",
      projectId: null,
      bom: { lines: [] },
    });

    await expect(service.updateStatus(1, "cancelled", 1)).rejects.toThrow(BadRequestException);
    expect(db.stockMoves).toHaveLength(0);
    expect(db.journalEntries).toHaveLength(0);
  });
});
