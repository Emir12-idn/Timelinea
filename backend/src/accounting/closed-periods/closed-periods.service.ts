import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log/audit-log.service";
import { ClosePeriodDto } from "./dto/close-period.dto";

/**
 * Buku Besar — tutup buku periode (§10 data design, item 6). Menutup sebuah
 * periode (YYYY-MM) mencegah JournalService.postEntry()/reverseEntry() memposting
 * entry baru bertanggal di periode itu — lihat pengecekannya di sana, ini modul
 * hanya CRUD sederhana atas daftar periode yang ditutup.
 */
@Injectable()
export class ClosedPeriodsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll(companyId?: number) {
    return this.prisma.closedPeriod.findMany({
      where: companyId !== undefined ? { companyId } : {},
      orderBy: { period: "desc" },
    });
  }

  async close(dto: ClosePeriodDto, closedBy?: number) {
    const companyId = dto.companyId ?? 0;
    const existing = await this.prisma.closedPeriod.findUnique({
      where: { companyId_period: { companyId, period: dto.period } },
    });
    if (existing) {
      throw new BadRequestException(`Periode ${dto.period} sudah ditutup sebelumnya`);
    }
    const created = await this.prisma.closedPeriod.create({ data: { companyId, period: dto.period, closedBy } });
    await this.auditLog.record({
      actorId: closedBy,
      action: "close",
      entityType: "closed_period",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  /** Buka kembali (reopen) — hanya untuk koreksi; dipakai jarang dan sengaja tidak dibatasi role di sini selain guard controller. */
  async reopen(id: number, actorId?: number) {
    const row = await this.prisma.closedPeriod.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Periode tertutup tidak ditemukan");
    await this.prisma.closedPeriod.delete({ where: { id } });
    await this.auditLog.record({
      actorId,
      action: "reopen",
      entityType: "closed_period",
      entityId: id,
      before: row,
    });
    return { ok: true };
  }
}
