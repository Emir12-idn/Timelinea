import { Prisma } from "@prisma/client";

/** qty * unitPrice, rounded to whole rupiah (money is always an integer — see schema.prisma header). */
export function lineAmount(unitPrice: bigint, qty: number): bigint {
  const amount = new Prisma.Decimal(unitPrice.toString()).mul(qty).toDecimalPlaces(0);
  return BigInt(amount.toFixed(0));
}

/** DPP (harga sebelum pajak) dari total termasuk PPN 11%, dibulatkan ke rupiah. */
export function dppFromTotal(total: bigint, ppnRate = 0.11): bigint {
  const dpp = new Prisma.Decimal(total.toString()).div(1 + ppnRate).toDecimalPlaces(0);
  return BigInt(dpp.toFixed(0));
}

/** base * rate, dibulatkan ke rupiah (mis. BPJS 3% dari gaji pokok). */
export function percentOf(base: bigint, rate: number): bigint {
  const amount = new Prisma.Decimal(base.toString()).mul(rate).toDecimalPlaces(0);
  return BigInt(amount.toFixed(0));
}

/** Ambil nilai terkecil dari dua BigInt. */
export function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
