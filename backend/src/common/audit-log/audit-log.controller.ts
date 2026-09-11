import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditLogService } from "./audit-log.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";

/** §11 data design, item 6 — riwayat perubahan status dokumen apapun (PO/faktur/kasbon/dll). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.hrd_keuangan)
@Controller("audit-log")
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get()
  findAll(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string) {
    return this.service.findAll(entityType, entityId ? Number(entityId) : undefined);
  }
}
