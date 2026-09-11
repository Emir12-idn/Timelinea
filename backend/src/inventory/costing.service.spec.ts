import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CostingService } from "./costing.service";

/**
 * §13 data design — baseline test suite, pass 5, item 4. CostingService is the
 * engine behind every stock movement in the system (§9.1/§10.3 data design):
 * moving-average valuation, FIFO/FEFO layer consumption, and the "stock can
 * never go negative" guard. These are exactly the scenarios verified manually
 * against a live Postgres instance in §11.7 (FEFO) and §10.3 (stock-minus
 * guard) — this suite automates them instead of relying on manual re-checks
 * in future passes.
 *
 * Uses a small in-memory fake standing in for the Prisma calls CostingService
 * makes (item/stockMove/stockLayer/warehouse), exercising the real averaging
 * and FIFO/FEFO consumption math rather than mocking those calculations away.
 */
function makeFakeDb(items: Record<number, { costingMethod: "average" | "fifo"; tracksExpiry?: boolean }>) {
  const itemRows = new Map(
    Object.entries(items).map(([id, cfg]) => [Number(id), { id: Number(id), costingMethod: cfg.costingMethod, tracksExpiry: cfg.tracksExpiry ?? false, lastCost: null as bigint | null }]),
  );
  const stockMoves: any[] = [];
  const stockLayers: any[] = [];
  const warehouses = [{ id: 1, isDefault: true, deletedAt: null }, { id: 2, isDefault: false, deletedAt: null }];
  let nextMoveId = 1;
  let nextLayerId = 1;

  return {
    stockMoves,
    stockLayers,
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
        const move = {
          id: nextMoveId++,
          ...data,
          qtyIn: new Prisma.Decimal(data.qtyIn ?? 0),
          qtyOut: new Prisma.Decimal(data.qtyOut ?? 0),
        };
        stockMoves.push(move);
        return Promise.resolve(move);
      }),
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(stockMoves.filter((m) => m.itemId === where.itemId && m.warehouseId === where.warehouseId)),
      ),
      findFirst: jest.fn(({ where }: any) => {
        const matches = stockMoves
          .filter((m) => m.itemId === where.itemId && m.warehouseId === where.warehouseId && m.qtyOut.gt(0) && m.date <= where.date.lte)
          .sort((a, b) => (b.date.getTime() - a.date.getTime()) || (b.id - a.id));
        return Promise.resolve(matches[0] ?? null);
      }),
    },
    stockLayer: {
      create: jest.fn(({ data }: any) => {
        const layer = { id: nextLayerId++, ...data, qtyRemaining: new Prisma.Decimal(data.qtyRemaining) };
        stockLayers.push(layer);
        return Promise.resolve(layer);
      }),
      findMany: jest.fn(({ where, orderBy }: any) => {
        let layers = stockLayers.filter((l) => l.itemId === where.itemId && l.warehouseId === where.warehouseId && l.qtyRemaining.gt(0));
        const tracksExpiry = Array.isArray(orderBy) && orderBy.length === 3;
        if (tracksExpiry) {
          layers = [...layers].sort((a, b) => {
            const ea = a.expiryDate ? a.expiryDate.getTime() : Infinity;
            const eb = b.expiryDate ? b.expiryDate.getTime() : Infinity;
            if (ea !== eb) return ea - eb;
            if (a.inDate.getTime() !== b.inDate.getTime()) return a.inDate.getTime() - b.inDate.getTime();
            return a.id - b.id;
          });
        } else {
          layers = [...layers].sort((a, b) => a.inDate.getTime() - b.inDate.getTime() || a.id - b.id);
        }
        return Promise.resolve(layers);
      }),
      update: jest.fn(({ where, data }: any) => {
        const layer = stockLayers.find((l) => l.id === where.id)!;
        Object.assign(layer, data);
        return Promise.resolve(layer);
      }),
    },
    warehouse: {
      findFirst: jest.fn(({ where }: any) => {
        if (where.isDefault) return Promise.resolve(warehouses.find((w) => w.isDefault) ?? null);
        return Promise.resolve(warehouses[0] ?? null);
      }),
    },
  };
}

describe("CostingService", () => {
  describe("moving-average costing", () => {
    it("computes on-hand value as a weighted average across multiple stock-ins", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);

      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 2000n, date: new Date("2026-01-02"), refType: "test" });

      // (10*1000 + 10*2000) / 20 = 1500
      expect(await service.averageCost(db as any, 1, 1)).toBe(1500n);
    });

    it("stock-out consumes at the current moving average and reduces on-hand", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 2000n, date: new Date("2026-01-02"), refType: "test" });

      const { unitCost, move } = await service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 5, date: new Date("2026-01-03"), refType: "test" });

      expect(unitCost).toBe(1500n);
      expect(move.qtyOut.toNumber()).toBe(5);
      expect(await service.averageCost(db as any, 1, 1)).toBe(1500n); // average unaffected by an out-move at the same cost
    });
  });

  describe("FIFO costing", () => {
    it("consumes the oldest layer first, weighting cost across layers when a stock-out spans more than one", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "fifo" } });
      const service = new CostingService(db as any);
      // Batch A: 10 @ 100 (in first). Batch B: 10 @ 200 (in second).
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 100n, date: new Date("2026-01-01"), refType: "test" });
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 200n, date: new Date("2026-01-02"), refType: "test" });

      // Consumes all 10 of Batch A (1000) + 5 of Batch B (1000) = 2000 / 15 = 133.33 -> 133
      const { unitCost } = await service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 15, date: new Date("2026-01-03"), refType: "test" });

      expect(unitCost).toBe(133n);
      // Batch B should have 5 remaining.
      const remainingLayers = db.stockLayers.filter((l) => l.qtyRemaining.gt(0));
      expect(remainingLayers).toHaveLength(1);
      expect(remainingLayers[0].unitCost).toBe(200n);
      expect(remainingLayers[0].qtyRemaining.toNumber()).toBe(5);
    });

    it("FEFO: for an expiry-tracked item, consumes the soonest-to-expire layer first even if it arrived later", async () => {
      // §11.7 data design — this is the exact scenario verified manually against
      // Postgres in the third pass: Batch A arrives first but expires later
      // (cost 1000); Batch B arrives second but expires sooner (cost 2000).
      // FEFO must pick Batch B; plain FIFO would have picked Batch A.
      const db = makeFakeDb({ 1: { costingMethod: "fifo", tracksExpiry: true } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, {
        itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n,
        date: new Date("2026-01-01"), refType: "test", expiryDate: new Date("2026-12-31"),
      });
      await service.stockIn(db as any, {
        itemId: 1, warehouseId: 1, qty: 10, unitCost: 2000n,
        date: new Date("2026-01-02"), refType: "test", expiryDate: new Date("2026-03-31"),
      });

      const { unitCost } = await service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 5, date: new Date("2026-01-03"), refType: "test" });

      expect(unitCost).toBe(2000n); // Batch B (soonest expiry), not Batch A (FIFO order)
    });

    it("plain FIFO (tracksExpiry false) ignores expiry and consumes strictly by arrival order", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "fifo", tracksExpiry: false } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, {
        itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n,
        date: new Date("2026-01-01"), refType: "test", expiryDate: new Date("2026-12-31"),
      });
      await service.stockIn(db as any, {
        itemId: 1, warehouseId: 1, qty: 10, unitCost: 2000n,
        date: new Date("2026-01-02"), refType: "test", expiryDate: new Date("2026-03-31"),
      });

      const { unitCost } = await service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 5, date: new Date("2026-01-03"), refType: "test" });

      expect(unitCost).toBe(1000n); // Batch A (arrived first), expiry ignored
    });
  });

  describe("negative-stock guard", () => {
    it("rejects a stock-out that would take on-hand below zero", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 5, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });

      await expect(
        service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 10, date: new Date("2026-01-02"), refType: "test" }),
      ).rejects.toThrow(BadRequestException);

      // Nothing should have been written for the rejected stock-out.
      expect(db.stockMoves.filter((m) => m.qtyOut.gt(0))).toHaveLength(0);
    });

    it("allows a stock-out that exactly exhausts on-hand", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 5, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });

      const { unitCost } = await service.stockOut(db as any, { itemId: 1, warehouseId: 1, qty: 5, date: new Date("2026-01-02"), refType: "test" });
      expect(unitCost).toBe(1000n);
    });
  });

  describe("transfer", () => {
    it("moves stock between warehouses at the source's costed unit price", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);
      await service.stockIn(db as any, { itemId: 1, warehouseId: 1, qty: 10, unitCost: 1000n, date: new Date("2026-01-01"), refType: "test" });

      const { unitCost } = await service.transfer(db as any, {
        itemId: 1, fromWarehouseId: 1, toWarehouseId: 2, qty: 4, date: new Date("2026-01-02"), refType: "transfer",
      });

      expect(unitCost).toBe(1000n);
      expect(await service.averageCost(db as any, 1, 1)).toBe(1000n); // 6 left @ 1000
      expect(await service.averageCost(db as any, 1, 2)).toBe(1000n); // 4 arrived @ 1000
    });

    it("rejects a transfer to the same warehouse", async () => {
      const db = makeFakeDb({ 1: { costingMethod: "average" } });
      const service = new CostingService(db as any);

      await expect(
        service.transfer(db as any, { itemId: 1, fromWarehouseId: 1, toWarehouseId: 1, qty: 1, date: new Date("2026-01-02"), refType: "transfer" }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
