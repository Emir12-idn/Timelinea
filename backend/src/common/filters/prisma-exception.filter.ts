import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@prisma/client";

const STATUS_TEXT: Record<number, string> = {
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.BAD_REQUEST]: "Bad Request",
};

/** Friendlier Indonesian labels for the field names Prisma reports in P2002/P2003 errors. */
const FIELD_LABEL: Record<string, string> = {
  code: "Kode",
  email: "Email",
  nik: "NIK",
  no: "Nomor",
  name: "Nama",
};

function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

/** Prisma's error.meta.target is an array of column names on Postgres, but the
 * type is officially JsonValue — normalize whatever shape shows up. */
function targetFields(target: unknown): string[] {
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}

/**
 * Without this, any unique/FK constraint hit at the DB layer (e.g. duplicate
 * NIK on POST /employees) bubbles up as a bare 500 "Internal server error" —
 * registered globally in main.ts so every module gets a real error message
 * for free, not just the ones with an explicit pre-check.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.mapException(exception);
    response.status(status).json({ statusCode: status, message, error: STATUS_TEXT[status] ?? "Error" });
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    switch (exception.code) {
      case "P2002": {
        const fields = targetFields(exception.meta?.target).map(fieldLabel);
        const label = fields.length > 0 ? fields.join(", ") : "data";
        return { status: HttpStatus.CONFLICT, message: `${label} sudah dipakai, tidak boleh duplikat` };
      }
      case "P2025":
        return { status: HttpStatus.NOT_FOUND, message: "Data tidak ditemukan" };
      case "P2003":
        // meta.field_name is a raw constraint name (e.g. "purchase_order_lines_item_id_fkey"),
        // not reliably parseable into a clean field label — keep the message generic.
        return { status: HttpStatus.BAD_REQUEST, message: "Data terkait tidak valid atau tidak ditemukan (referensi salah)" };
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}: ${exception.message}`);
        return { status: HttpStatus.BAD_REQUEST, message: "Permintaan tidak valid" };
    }
  }
}
