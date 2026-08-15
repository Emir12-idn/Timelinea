import { Injectable, NotFoundException } from "@nestjs/common";
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
        bookValue: cost,
        companyId: dto.companyId,
      },
    });
  }

  /**
   * Penyusutan garis lurus bulanan (§4: Penyusutan). Idempotent per (aset, periode) —
   * aset yang sudah disusutkan pada periode ini dilewati, dan aset yang sudah
   * habis (bookValue = 0) juga dilewati.
   */
  async runDepreciation(period: string, createdBy?: number) {
    const assets = await this.prisma.fixedAsset.findMany({
      where: { bookValue: { gt: 0 }, lastDepreciatedPeriod: { not: period } },
    });

    const results = [];
    for (const asset of assets) {
      const monthly = asset.cost / BigInt(asset.usefulLifeMonths);
      const amount = minBigInt(monthly, asset.bookValue);
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
