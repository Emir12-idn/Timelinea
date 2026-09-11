/**
 * §11 data design, item 4 — import/export CSV. Tidak ada dependency CSV di
 * `package.json` (dicek dulu sebelum menulis ini) dan cakupan kebutuhannya
 * sederhana (baris flat, tanpa nested), jadi parser/writer tulisan tangan RFC
 * 4180-ringan ini cukup — tidak perlu menambah dependency baru untuk kebutuhan
 * sesederhana ini (lihat instruksi tugas).
 */

/** Parse CSV text (header row + data rows) menjadi array of objects keyed by header. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      // diabaikan — akhir baris ditangani di \n (mendukung CRLF & LF)
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  // Baris/field terakhir kalau file tidak diakhiri newline.
  if (field.length > 0 || row.length > 0) pushRow();

  // Baris kosong tunggal dari trailing newline di akhir file — bukan data.
  const cleaned = rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
  if (cleaned.length === 0) return [];

  const header = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

/** Serialize rows (array of plain objects) + daftar kolom eksplisit menjadi CSV text (CRLF, RFC 4180 quoting). */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "bigint" ? v.toString() : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(escape).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(","));
  }
  return lines.join("\r\n");
}
