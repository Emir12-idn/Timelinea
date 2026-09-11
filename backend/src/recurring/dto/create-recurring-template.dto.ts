import { IsDateString, IsEnum, IsObject, IsString } from "class-validator";
import { RecurringDocType, RecurringFrequency } from "@prisma/client";

export class CreateRecurringTemplateDto {
  @IsString()
  name: string;

  @IsEnum(RecurringDocType)
  type: RecurringDocType;

  /**
   * Body DTO create sales/purchase invoice APA ADANYA (sama field-nya dengan
   * POST /sales-invoices atau POST /purchase-invoices), TANPA field `date` —
   * itu selalu diisi dari `nextRunDate` template tiap kali di-generate, jangan
   * kirim di sini (akan diabaikan/ditimpa).
   */
  @IsObject()
  payload: Record<string, unknown>;

  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  /** Tanggal generate berikutnya (juga dipakai sebagai `date` dokumen yang dihasilkan). */
  @IsDateString()
  nextRunDate: string;
}
