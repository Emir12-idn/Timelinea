import { Global, Module } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { AuditLogController } from "./audit-log.controller";

/**
 * @Global() — AuditLogService is injected from many otherwise-unrelated feature
 * modules (purchase orders, invoices, kasbon, cheque/giro, closed periods, work
 * orders, recurring templates...). Making the module global means each of those
 * just injects the service in its constructor without also having to list
 * AuditLogModule in its own `imports` array — keeps the "single shared service
 * call" wiring simple, per §11 data design, item 6's explicit guidance.
 */
@Global()
@Module({
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
