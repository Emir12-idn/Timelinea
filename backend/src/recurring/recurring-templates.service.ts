import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Prisma, RecurringDocType, RecurringDraftStatus, RecurringFrequency } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SalesInvoicesService } from "../sales/sales-invoices/sales-invoices.service";
import { PurchaseInvoicesService } from "../purchasing/purchase-invoices/purchase-invoices.service";
import { CreateSalesInvoiceDto } from "../sales/sales-invoices/dto/create-sales-invoice.dto";
import { CreatePurchaseInvoiceDto } from "../purchasing/purchase-invoices/dto/create-purchase-invoice.dto";
import { CreateRecurringTemplateDto } from "./dto/create-recurring-template.dto";
import { UpdateRecurringTemplateDto } from "./dto/update-recurring-template.dto";

/**
 * §11 data design, item 3 — transaksi berulang. Lihat catatan panjang di
 * schema.prisma (model RecurringTemplate) untuk kenapa generateDue() TIDAK
 * langsung memanggil SalesInvoicesService.create()/PurchaseInvoicesService
 * .create() (keduanya SELALU memposting jurnal seketika di sistem ini, tidak
 * ada konsep "draft belum diposting" pada invoice manapun) — ringkasnya: draft
 * hasil generate cuma baris `RecurringGeneratedDraft` sampai manusia menekan
 * confirm, baru di situ dokumen sungguhan (dan jurnalnya) dibuat.
 */
@Injectable()
export class RecurringTemplatesService {
  constructor(
    private prisma: PrismaService,
    private salesInvoices: SalesInvoicesService,
    private purchaseInvoices: PurchaseInvoicesService,
  ) {}

  findAll(isActive?: boolean) {
    return this.prisma.recurringTemplate.findMany({
      where: { deletedAt: null, ...(isActive !== undefined ? { isActive } : {}) },
      orderBy: { nextRunDate: "asc" },
    });
  }

  async findOne(id: number) {
    const tpl = await this.prisma.recurringTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!tpl) throw new NotFoundException("Template transaksi berulang tidak ditemukan");
    return tpl;
  }

  /**
   * Validasi struktur payload terhadap DTO create sales/purchase invoice yang
   * sesungguhnya (class-validator, sama seperti yang dijalankan ValidationPipe di
   * endpoint aslinya) — dipanggil dengan `date` dummy/sungguhan disisipkan
   * sementara (payload tersimpan sendiri TIDAK menyimpan `date`, lihat DTO).
   * Menangkap template yang salah bentuk saat dibuat/diubah, bukan baru gagal
   * nanti pas di-generate atau di-confirm.
   */
  private async assertValidPayload(
    type: RecurringDocType,
    payloadWithDate: Record<string, unknown>,
  ): Promise<CreateSalesInvoiceDto | CreatePurchaseInvoiceDto> {
    const instance: CreateSalesInvoiceDto | CreatePurchaseInvoiceDto =
      type === "sales_invoice"
        ? plainToInstance(CreateSalesInvoiceDto, payloadWithDate)
        : plainToInstance(CreatePurchaseInvoiceDto, payloadWithDate);
    const errors = await validate(instance);
    if (errors.length) {
      const msg = errors.map((e) => Object.values(e.constraints ?? {}).join(", ")).join("; ");
      throw new BadRequestException(`Payload template tidak valid: ${msg}`);
    }
    return instance;
  }

  async create(dto: CreateRecurringTemplateDto, createdBy?: number) {
    await this.assertValidPayload(dto.type, { ...dto.payload, date: dto.nextRunDate });
    return this.prisma.recurringTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        frequency: dto.frequency,
        nextRunDate: new Date(dto.nextRunDate),
        createdBy,
      },
    });
  }

  async update(id: number, dto: UpdateRecurringTemplateDto) {
    const tpl = await this.findOne(id);
    const type = dto.type ?? tpl.type;
    const payload = dto.payload ?? (tpl.payload as Record<string, unknown>);
    const nextRunDate = dto.nextRunDate ?? tpl.nextRunDate.toISOString().slice(0, 10);
    if (dto.type || dto.payload) {
      await this.assertValidPayload(type, { ...payload, date: nextRunDate });
    }
    return this.prisma.recurringTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue | undefined,
        frequency: dto.frequency,
        nextRunDate: dto.nextRunDate ? new Date(dto.nextRunDate) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.recurringTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }

  private advance(date: Date, frequency: RecurringFrequency): Date {
    const next = new Date(date);
    if (frequency === "weekly") {
      next.setUTCDate(next.getUTCDate() + 7);
    } else {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next;
  }

  /**
   * Endpoint/job terjadwal: generate satu draft untuk tiap template aktif yang
   * `nextRunDate` sudah lewat/hari ini, lalu majukan `nextRunDate` sesuai
   * `frequency` — SATU draft per panggilan per template (bukan mengejar ketinggalan
   * semua periode yang terlewat sekaligus), supaya template yang lama tidak
   * dijalankan tiba-tiba menghasilkan banyak draft sekaligus; panggilan berulang
   * (harian, atau manual) otomatis mengejar satu-satu.
   */
  async generateDue() {
    const due = await this.prisma.recurringTemplate.findMany({
      where: { isActive: true, deletedAt: null, nextRunDate: { lte: new Date() } },
    });

    const drafts = [];
    for (const tpl of due) {
      const payload = { ...(tpl.payload as Record<string, unknown>), date: tpl.nextRunDate.toISOString().slice(0, 10) };
      const draft = await this.prisma.$transaction(async (tx) => {
        const created = await tx.recurringGeneratedDraft.create({
          data: {
            templateId: tpl.id,
            type: tpl.type,
            payload: payload as Prisma.InputJsonValue,
            templateRunDate: tpl.nextRunDate,
          },
        });
        await tx.recurringTemplate.update({
          where: { id: tpl.id },
          data: { nextRunDate: this.advance(tpl.nextRunDate, tpl.frequency) },
        });
        return created;
      });
      drafts.push(draft);
    }
    return { generated: drafts.length, drafts };
  }

  findDrafts(status?: RecurringDraftStatus) {
    return this.prisma.recurringGeneratedDraft.findMany({
      where: status ? { status } : {},
      include: { template: true },
      orderBy: { generatedAt: "desc" },
    });
  }

  /**
   * Manusia me-review draft, lalu confirm — BARU DI SINI dokumen sungguhan
   * dibuat (lewat service create() aslinya, jadi posting jurnal/numbering/dll
   * mengikuti alur normal apa adanya, tidak ada jalur pintas).
   */
  async confirmDraft(id: number, confirmedBy?: number) {
    const draft = await this.prisma.recurringGeneratedDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException("Draft transaksi berulang tidak ditemukan");
    if (draft.status !== "pending") throw new BadRequestException(`Draft ini sudah berstatus "${draft.status}"`);

    const payload = draft.payload as Record<string, unknown>;
    const instance = await this.assertValidPayload(draft.type, payload);

    const document =
      draft.type === "sales_invoice"
        ? await this.salesInvoices.create(instance as CreateSalesInvoiceDto, confirmedBy)
        : await this.purchaseInvoices.create(instance as CreatePurchaseInvoiceDto, confirmedBy);
    // (instance's runtime shape already matches draft.type from assertValidPayload above — the
    // `as` here is just narrowing the union type back down, not an unchecked cast.)

    await this.prisma.recurringGeneratedDraft.update({
      where: { id },
      data: { status: "confirmed", confirmedRefId: document.id, confirmedAt: new Date(), confirmedBy },
    });
    return document;
  }

  async discardDraft(id: number) {
    const draft = await this.prisma.recurringGeneratedDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException("Draft transaksi berulang tidak ditemukan");
    if (draft.status !== "pending") throw new BadRequestException(`Draft ini sudah berstatus "${draft.status}"`);
    return this.prisma.recurringGeneratedDraft.update({ where: { id }, data: { status: "discarded" } });
  }
}
