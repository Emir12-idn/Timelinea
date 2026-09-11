import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

export interface RecordAuditParams {
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId: number;
  before?: unknown;
  after?: unknown;
}

/**
 * §11 data design, item 6 — audit trail. Satu titik tulis dipanggil dari tiap
 * service (bukan interceptor ORM generik) di titik status dokumen berubah:
 * post/void/approve/reject/cancel/confirm/close/reopen/clear/bounce, dst.
 * Terima `db` opsional (PrismaService atau Prisma.TransactionClient, pola yang
 * sama dengan JournalService/CostingService) supaya baris audit bisa ditulis
 * ATOMIK di transaksi yang sama dengan perubahan dokumennya — kalau transaksinya
 * rollback, baris audit ikut rollback, tidak ada audit "hantu" untuk perubahan
 * yang sebenarnya gagal.
 */
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Domain objects di sistem ini penuh BigInt (uang, §3 data design) dan Date —
   * keduanya BUKAN tipe JSON valid buat Prisma.Json langsung (BigInt bahkan
   * membuat JSON.stringify error tanpa replacer). Serialize lewat
   * JSON.stringify+parse dengan replacer BigInt->string supaya `before`/`after`
   * selalu JSON murni yang aman disimpan, apapun bentuk objek yang dikirim
   * pemanggil (row Prisma langsung, tanpa perlu di-map manual tiap kali).
   */
  private toJsonSafe(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)));
  }

  record(params: RecordAuditParams, db: Db = this.prisma) {
    return db.auditLog.create({
      data: {
        actorId: params.actorId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: this.toJsonSafe(params.before),
        after: this.toJsonSafe(params.after),
      },
    });
  }

  findAll(entityType?: string, entityId?: number) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId !== undefined ? { entityId } : {}),
      },
      orderBy: { at: "desc" },
    });
  }
}
