/**
 * Account codes used by the auto-journal engine. Matches docs/DATA_DESIGN.md §5,
 * plus four accounts that §5's table doesn't list but §4's posting rules require
 * (fixed asset value, accumulated depreciation, BPJS payable, depreciation expense).
 * These extra four are seeded in prisma/seed.ts and called out there — the COA is
 * meant to be edited per company (§5 note), this is just what makes double-entry
 * balance out of the box.
 */
export const COA_CODE = {
  KAS: "1-1100",
  BANK: "1-1200",
  PIUTANG_USAHA: "1-1300",
  PERSEDIAAN: "1-1400",
  PIUTANG_KARYAWAN: "1-1500",
  PPN_MASUKAN: "1-1600",
  AKTIVA_TETAP: "1-1700",
  AKUMULASI_PENYUSUTAN: "1-1750",
  UTANG_USAHA: "2-2100",
  PPN_KELUARAN: "2-2200",
  UTANG_PPH21: "2-2300",
  UTANG_PPH23: "2-2400",
  UTANG_PPH_BADAN: "2-2500",
  UTANG_BPJS: "2-2600",
  MODAL: "3-3100",
  PENJUALAN: "4-4100",
  // §11 data design, item 2 — multi-currency: selisih kurs terealisasi (laba/rugi
  // kurs) saat faktur mata uang asing dilunasi pada rate berbeda dari saat
  // dibooking. Satu akun untuk laba maupun rugi (bisa didebit atau dikredit
  // tergantung arah selisihnya) — lihat seed.ts.
  SELISIH_KURS: "4-4200",
  HPP: "5-5100",
  BEBAN_GAJI: "6-6100",
  BEBAN_PENYUSUTAN: "6-6200",
  // Pabrikasi §2 (gap module) — biaya konversi (tenaga kerja/overhead) manual yang
  // diserap ke biaya barang jadi saat Work Order selesai. Lihat seed.ts.
  BEBAN_KONVERSI: "6-6300",
} as const;
