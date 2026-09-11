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

/**
 * Multi-currency §2 (gap module) — konversi nilai dalam mata uang asing ke Rupiah
 * (mata uang pelaporan) pada `rate` (Rupiah per 1 unit mata uang asing), dibulatkan
 * ke rupiah penuh. `rate` 1 untuk IDR artinya konversi ini no-op (amount balik apa
 * adanya), jadi aman dipanggil tanpa cek currency di pemanggilnya.
 */
export function convertToBase(amount: bigint, rate: number | Prisma.Decimal): bigint {
  const r = rate instanceof Prisma.Decimal ? rate : new Prisma.Decimal(rate);
  const converted = new Prisma.Decimal(amount.toString()).mul(r).toDecimalPlaces(0);
  return BigInt(converted.toFixed(0));
}
