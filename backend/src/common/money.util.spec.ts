import { convertToBase, dppFromTotal, lineAmount, minBigInt, percentOf } from "./money.util";

/**
 * §13 data design — baseline test suite, pass 5, item 4. Uang di sistem ini
 * SELALU BigInt rupiah (schema.prisma header) — tempat paling gampang salah
 * adalah pembulatan di titik konversi Decimal->BigInt, jadi kasus tepi
 * ".5" (setengah rupiah) sengaja diuji eksplisit di tiap fungsi: §10.2 data
 * design menegaskan aturan resmi PPN (PER-11/PJ/2025) memakai half-up
 * (bulat ke atas kalau desimal >= 0,50), sama seperti default Prisma.Decimal
 * (`ROUND_HALF_UP`) yang sudah dipakai fungsi-fungsi ini.
 */
describe("money.util", () => {
  describe("lineAmount", () => {
    it("multiplies unitPrice by qty and rounds to whole rupiah", () => {
      expect(lineAmount(10_000n, 3)).toBe(30_000n);
    });

    it("rounds a .5 rupiah result half-up", () => {
      // 333 * 1.5 = 499.5 -> half-up -> 500
      expect(lineAmount(333n, 1.5)).toBe(500n);
    });

    it("rounds down below .5", () => {
      // 100 * 1.004 = 100.4 -> 100
      expect(lineAmount(100n, 1.004)).toBe(100n);
    });

    it("returns 0 for zero qty", () => {
      expect(lineAmount(10_000n, 0)).toBe(0n);
    });
  });

  describe("dppFromTotal", () => {
    it("backs out DPP from a total that includes 11% PPN", () => {
      // 111 total / 1.11 = 100 exactly
      expect(dppFromTotal(111n)).toBe(100n);
    });

    it("rounds a fractional DPP half-up", () => {
      // 100 / 1.11 = 90.09... -> 90
      expect(dppFromTotal(100n)).toBe(90n);
    });

    it("honors a custom PPN rate", () => {
      expect(dppFromTotal(110n, 0.1)).toBe(100n);
    });
  });

  describe("percentOf", () => {
    it("computes a percentage of a base amount, rounded half-up", () => {
      // 12,345 * 0.03 (BPJS 3%) = 370.35 -> 370
      expect(percentOf(12_345n, 0.03)).toBe(370n);
    });

    it("rounds an exact .5 rupiah half-up", () => {
      // 50 * 0.01 = 0.5 exactly -> half-up -> 1
      expect(percentOf(50n, 0.01)).toBe(1n);
    });

    it("returns 0 for a 0 rate", () => {
      expect(percentOf(1_000_000n, 0)).toBe(0n);
    });
  });

  describe("minBigInt", () => {
    it("returns the smaller of two positive values", () => {
      expect(minBigInt(5n, 10n)).toBe(5n);
      expect(minBigInt(10n, 5n)).toBe(5n);
    });

    it("handles equal values", () => {
      expect(minBigInt(7n, 7n)).toBe(7n);
    });

    it("handles negative values", () => {
      expect(minBigInt(-5n, 3n)).toBe(-5n);
    });
  });

  describe("convertToBase", () => {
    it("is a no-op for rate 1 (plain IDR invoices)", () => {
      expect(convertToBase(55_000n, 1)).toBe(55_000n);
    });

    it("converts a foreign-currency amount to Rupiah at the given rate", () => {
      // USD 100 at Rp 15,750/USD = Rp 1,575,000
      expect(convertToBase(100n, 15_750)).toBe(1_575_000n);
    });

    it("rounds an exact .5 converted rupiah half-up", () => {
      // 2 * 0.25 = 0.5 exactly -> half-up -> 1
      expect(convertToBase(2n, 0.25)).toBe(1n);
    });

    it("accepts a Prisma.Decimal rate (as stored in the invoice)", () => {
      const { Prisma } = require("@prisma/client");
      expect(convertToBase(100n, new Prisma.Decimal("15750.5"))).toBe(1_575_050n);
    });
  });
});
