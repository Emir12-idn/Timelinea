import { Injectable, NotFoundException } from "@nestjs/common";
import { DepreciationMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { JournalService } from "../accounting/journal/journal.service";
import { minBigInt } from "../common/money.util";
import { CreateFixedAssetDto } from "./dto/create-fixed-asset.dto";

@Injectable()
export class FixedAssetsService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  findAll() {
    return this.prisma.fixedAsset.findMany({ orderBy: { code: "asc" } });
  }

  async findOne(id: number) {
    const asset = await this.prisma.fixedAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Aktiva tetap tidak ditemukan");
    return asset;
  }

  create(dto: CreateFixedAssetDto, createdBy?: number) {
    const cost = BigInt(dto.cost);
    return this.prisma.fixedAsset.create({
      data: {
        code: dto.code,
        name: dto.name,
        acquisitionDate: new Date(dto.acquisitionDate),
        cost,
        usefulLifeMonths: dto.usefulLifeMonths,
        method: dto.method ?? "straight_line",
        bookValue: cost,
        companyId: dto.companyId,
      },
    });
  }

  /**
   * §11 data design, item 1 — jumlah periode yang SUDAH disusutkan untuk aset ini,
   * diturunkan dari riwayat jurnal (refType "fixed_asset", type "Penyusutan") —
   * bukan angka tersimpan terpisah, konsisten dengan prinsip "turunan dari mutasi/
   * riwayat" yang sudah dipakai di modul lain (stok dari stock_move, dst). Dipakai
   * double_declining_balance (sisa umur untuk switch ke garis lurus) dan
   * sum_of_years_digits (bobot bulan ke-m) — straight_line tidak butuh ini sama
   * sekali (bunganya tetap flat per bulan seperti semula).
   * `type: "Penyusutan"` sengaja mengecualikan entry pembalik ("Pembalik
   * Penyusutan") supaya void (kalau ada di masa depan) tidak ikut kehitung.
   */
  private async periodsDepreciated(assetId: number): Promise<number> {
    return this.prisma.journalEntry.count({
      where: { refType: "fixed_asset", refId: assetId, type: "Penyusutan" },
    });
  }

  /**
   * Menghitung besar penyusutan bulan ini sebelum di-cap ke bookValue — satu
   * fungsi per metode, dipanggil dari runDepreciation(). `monthsElapsed` = jumlah
   * periode yang SUDAH disusutkan sebelum bulan ini (0 di bulan pertama).
   */
  private computeMonthlyAmount(
    method: DepreciationMethod,
    asset: { cost: bigint; usefulLifeMonths: number; bookValue: bigint },
    monthsElapsed: number,
  ): bigint {
    const usefulLifeMonths = asset.usefulLifeMonths;

    if (method === "straight_line") {
      // Garis Lurus — flat tiap bulan, tidak tergantung sisa umur (perilaku asli).
      return asset.cost / BigInt(usefulLifeMonths);
    }

    if (method === "double_declining_balance") {
      // Saldo Menurun Ganda — tarif = 2x tarif garis lurus, diterapkan ke NILAI
      // BUKU BERJALAN (bukan cost) tiap bulan: monthly = bookValue * (2 /
      // usefulLifeMonths). DDB murni tidak pernah mencapai nol tepat di akhir umur
      // (mendekati asimtotik) — standar akuntansi mengatasi ini dengan "switch ke
      // garis lurus" begitu penyusutan garis-lurus-atas-sisa-nilai-buku lebih besar
      // dari DDB; itu juga otomatis menghabiskan bookValue persis di bulan
      // terakhir. `monthsElapsed` dari riwayat jurnal (lihat periodsDepreciated).
      const remainingMonths = usefulLifeMonths - monthsElapsed;
      if (remainingMonths <= 0) return 0n;
      const ddb = new Prisma.Decimal(asset.bookValue.toString())
        .mul(2)
        .div(usefulLifeMonths)
        .toDecimalPlaces(0);
      const slRemaining = new Prisma.Decimal(asset.bookValue.toString()).div(remainingMonths).toDecimalPlaces(0);
      const amount = Prisma.Decimal.max(ddb, slRemaining);
      return BigInt(amount.toFixed(0));
    }

    // sum_of_years_digits (Jumlah Angka Tahun) — generalisasi bulanan dari metode
    // SYD standar (biasanya per tahun: cost * (N-k+1)/(N(N+1)/2) untuk tahun ke-k
    // dari N tahun). Di sini N = usefulLifeMonths (satuan bulan, bukan tahun) supaya
    // job bulanan yang sudah ada bisa langsung dipakai tanpa mengubah frekuensi
    // posting: bobot bulan ke-m (m = monthsElapsed+1, 1-indexed) = (N-m+1), dibagi
    // SYD_total = N(N+1)/2. Sum_{m=1..N} bobot = SYD_total persis, jadi totalnya
    // otomatis pas sama dengan `cost` di akhir umur (tidak ada sisa pembulatan
    // sistemik selain pembulatan rupiah per bulan yang wajar).
    const m = monthsElapsed + 1;
    if (m > usefulLifeMonths) return 0n;
    const weight = usefulLifeMonths - m + 1;
    const sydTotal = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;
    const amount = new Prisma.Decimal(asset.cost.toString()).mul(weight).div(sydTotal).toDecimalPlaces(0);
    return BigInt(amount.toFixed(0));
  }

  /**
   * Penyusutan bulanan (§4: Penyusutan) — sekarang mendukung tiga metode (§11 data
   * design, item 1: Garis Lurus, Saldo Menurun Ganda, Jumlah Angka Tahun), semuanya
   * memposting aturan jurnal §4 yang SAMA ("Beban Penyusutan / Akumulasi
   * Penyusutan") terlepas dari metodenya — bedanya cuma cara `amount` dihitung.
   * Idempotent per (aset, periode) — aset yang sudah disusutkan pada periode ini
   * dilewati, dan aset yang sudah habis (bookValue = 0) juga dilewati.
   */
  async runDepreciation(period: string, createdBy?: number) {
    // Bug found while verifying §11, item 1 against local Postgres: Prisma's
    // `lastDepreciatedPeriod: { not: period }` compiles to plain SQL inequality
    // (`<> period`), which is NULL/false — and so excludes — for rows where the
    // column is NULL. That silently skipped EVERY asset that had never been
    // depreciated yet (lastDepreciatedPeriod starts out null), so runDepreciation
    // never picked up a brand-new asset on its first run. Explicit `OR` below
    // covers both "never depreciated" and "depreciated, but not THIS period".
    const assets = await this.prisma.fixedAsset.findMany({
      where: {
        bookValue: { gt: 0 },
        OR: [{ lastDepreciatedPeriod: null }, { lastDepreciatedPeriod: { not: period } }],
      },
    });

    const results = [];
    for (const asset of assets) {
      const monthsElapsed = await this.periodsDepreciated(asset.id);
      const raw = this.computeMonthlyAmount(asset.method, asset, monthsElapsed);
      const amount = minBigInt(raw, asset.bookValue);
      if (amount <= 0n) continue;

      const updated = await this.prisma.$transaction(async (tx) => {
        const asset2 = await tx.fixedAsset.update({
          where: { id: asset.id },
          data: {
            accumulatedDepreciation: asset.accumulatedDepreciation + amount,
            bookValue: asset.bookValue - amount,
            lastDepreciatedPeriod: period,
          },
        });
        await this.journal.postDepreciation(
          { id: asset.id, code: asset.code, companyId: asset.companyId },
          amount,
          period,
          tx,
          createdBy,
        );
        return asset2;
      });
      results.push(updated);
    }
    return { period, depreciated: results.length, assets: results };
  }
}
