import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { Readable } from "stream";

/**
 * OCR gratis lewat Google Drive — teknik yang sama dengan Apps Script lama
 * (`Script_OCR_v2`): upload file sebagai Google Doc (mimeType target
 * `application/vnd.google-apps.document`), Drive otomatis OCR isinya saat
 * konversi, lalu kita export hasilnya sebagai teks polos dan hapus dokumen
 * sementara itu. Butuh OAuth2 (bukan service account) karena berjalan atas
 * nama akun Google pemilik Drive — lihat scripts/get-google-refresh-token.ts
 * untuk cara dapat GOOGLE_OAUTH_REFRESH_TOKEN sekali di awal.
 */
@Injectable()
export class DriveOcrService {
  private readonly logger = new Logger(DriveOcrService.name);

  private getClient() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new InternalServerErrorException(
        "OCR belum dikonfigurasi — set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, dan GOOGLE_OAUTH_REFRESH_TOKEN di .env (lihat scripts/get-google-refresh-token.ts)",
      );
    }
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth });
  }

  /** OCR satu file (gambar/PDF) dan kembalikan teks hasil bacanya. */
  async extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const drive = this.getClient();
    let tempFileId: string | undefined;
    try {
      const created = await drive.files.create({
        requestBody: { name: filename, mimeType: "application/vnd.google-apps.document" },
        media: { mimeType, body: Readable.from(buffer) },
        fields: "id",
      });
      tempFileId = created.data.id ?? undefined;
      if (!tempFileId) throw new Error("Drive tidak mengembalikan id dokumen hasil OCR");

      const exported = await drive.files.export(
        { fileId: tempFileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return String(exported.data ?? "");
    } catch (err) {
      this.logger.error(`OCR gagal untuk ${filename}: ${(err as Error).message}`);
      throw new InternalServerErrorException(
        `Gagal membaca dokumen lewat Google Drive OCR: ${(err as Error).message}`,
      );
    } finally {
      if (tempFileId) {
        await drive.files.delete({ fileId: tempFileId }).catch(() => {
          this.logger.warn(`Gagal menghapus dokumen sementara ${tempFileId} di Drive`);
        });
      }
    }
  }
}
