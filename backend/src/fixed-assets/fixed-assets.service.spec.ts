import { FixedAssetsService } from "./fixed-assets.service";

/**
 * §13 data design — baseline test suite, pass 5, item 4. Covers the three
 * depreciation methods added in the third pass (§11.1 data design): Garis
 * Lurus (straight line), Saldo Menurun Ganda (double declining balance, with
 * its switch-to-straight-line tail so book value hits exactly zero), and
 * Jumlah Angka Tahun (sum-of-years-digits, generalized to months).
 *
 * computeMonthlyAmount() is a private pure method — accessed here via a cast
 * to `any` rather than changing its visibility in production code, since it
 * has no side effects and no dependency on the injected services. runDepreciation()
 * itself (the DB-touching orchestration) is intentionally left to integration-level
 * verification (already done manually against Postgres in the third pass, per
 * §11.1) — this suite targets the calculation, the highest-risk part per the task.
 */
describe("FixedAssetsService — computeMonthlyAmount", () => {
  // No dependency is actually used by the pure calculation, so empty stand-ins suffice.
  const service = new FixedAssetsService({} as any, {} as any, {} as any) as any;

  describe("straight_line", () => {
    it("is a flat cost/usefulLifeMonths amount regardless of months elapsed", () => {
      const asset = { cost: 1_200_000n, usefulLifeMonths: 12, bookValue: 1_200_000n };
      expect(service.computeMonthlyAmount("straight_line", asset, 0)).toBe(100_000n);
      expect(service.computeMonthlyAmount("straight_line", { ...asset, bookValue: 700_000n }, 5)).toBe(100_000n);
    });

    it("truncates (integer BigInt division) when cost doesn't divide evenly", () => {
      const asset = { cost: 100n, usefulLifeMonths: 3, bookValue: 100n };
      // 100n / 3n as BigInt division truncates toward zero -> 33n, not a rounded 33.33.
      expect(service.computeMonthlyAmount("straight_line", asset, 0)).toBe(33n);
    });
  });

  describe("double_declining_balance", () => {
    it("charges 2x the straight-line rate against current book value in the first month", () => {
      const asset = { cost: 1_200_000n, usefulLifeMonths: 12, bookValue: 1_200_000n };
      // rate = 2/12 = 1/6; 1,200,000 * 1/6 = 200,000
      expect(service.computeMonthlyAmount("double_declining_balance", asset, 0)).toBe(200_000n);
    });

    it("charges 2x rate against the (lower) book value in a later month, not the original cost", () => {
      const asset = { cost: 1_200_000n, usefulLifeMonths: 12, bookValue: 1_000_000n };
      // monthsElapsed=1 -> remainingMonths=11; ddb = 1,000,000*2/12 = 166,667 (rounded);
      // straight-line-on-remainder = 1,000,000/11 = 90,909 -> ddb wins (larger).
      expect(service.computeMonthlyAmount("double_declining_balance", asset, 1)).toBe(166_667n);
    });

    it("switches to straight-line-on-remainder in the final month so book value reaches exactly zero", () => {
      // Last month: remainingMonths = 1 -> straight-line-on-remainder = bookValue itself,
      // which is always >= the (much smaller) pure-DDB amount by then.
      const asset = { cost: 1_200_000n, usefulLifeMonths: 12, bookValue: 150_000n };
      expect(service.computeMonthlyAmount("double_declining_balance", asset, 11)).toBe(150_000n);
    });

    it("returns 0 once the asset is past its useful life", () => {
      const asset = { cost: 1_200_000n, usefulLifeMonths: 12, bookValue: 0n };
      expect(service.computeMonthlyAmount("double_declining_balance", asset, 12)).toBe(0n);
    });
  });

  describe("sum_of_years_digits", () => {
    it("weights each month by (N-m+1)/(N(N+1)/2) so the three months of a 3-month life sum to cost exactly", () => {
      const asset = { cost: 600_000n, usefulLifeMonths: 3, bookValue: 600_000n };
      const m1 = service.computeMonthlyAmount("sum_of_years_digits", asset, 0); // weight 3/6
      const m2 = service.computeMonthlyAmount("sum_of_years_digits", asset, 1); // weight 2/6
      const m3 = service.computeMonthlyAmount("sum_of_years_digits", asset, 2); // weight 1/6
      expect(m1).toBe(300_000n);
      expect(m2).toBe(200_000n);
      expect(m3).toBe(100_000n);
      expect(m1 + m2 + m3).toBe(asset.cost);
    });

    it("returns 0 once monthsElapsed reaches the useful life", () => {
      const asset = { cost: 600_000n, usefulLifeMonths: 3, bookValue: 0n };
      expect(service.computeMonthlyAmount("sum_of_years_digits", asset, 3)).toBe(0n);
    });

    it("front-loads more expense in early months than straight-line would", () => {
      const asset = { cost: 600_000n, usefulLifeMonths: 3, bookValue: 600_000n };
      const sydFirstMonth = service.computeMonthlyAmount("sum_of_years_digits", asset, 0);
      const slFirstMonth = service.computeMonthlyAmount("straight_line", asset, 0);
      expect(sydFirstMonth).toBeGreaterThan(slFirstMonth);
    });
  });
});
