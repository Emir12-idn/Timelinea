import { findAllAmounts, splitLines } from "./text-utils";

export interface RekeningKoranLine {
  date: string | null;
  description: string;
  amount: number | null;
}

const DEBIT_HINTS = /\b(db|debit|keluar|withdraw|payment|transfer\s*keluar)\b/i;
const CREDIT_HINTS = /\b(cr|kredit|masuk|deposit|transfer\s*masuk)\b/i;

/**
 * Rekening koran adalah tabel (tanggal, keterangan, mutasi, saldo) — OCR PDF/foto
 * tabel begini gampang miring/berantakan, jadi ini best-effort per baris: cari
 * tanggal di awal baris, ambil nominal terbesar di baris itu sebagai mutasi
 * (bukan saldo berjalan), tebak arah dari kata kunci DB/CR kalau ada. Hasilnya
 * SELALU untuk direview manual dulu sebelum jadi BankStatementLine — bukan
 * auto-import langsung, akurasi OCR tabel tidak bisa dijamin.
 */
export function parseRekeningKoran(text: string): RekeningKoranLine[] {
  const lines = splitLines(text);
  const out: RekeningKoranLine[] = [];

  for (const line of lines) {
    const dateMatch = line.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (!dateMatch) continue;

    const amounts = findAllAmounts(line);
    const digitAmounts = amounts.length > 0 ? amounts : extractPlainNumbers(line);
    if (digitAmounts.length === 0) continue;

    // Baris tabel biasanya [mutasi, saldo] atau cuma [mutasi] — mutasi hampir selalu
    // lebih kecil dari saldo berjalan kalau keduanya ada, kecuali baris pertama.
    const amount = digitAmounts.length >= 2 ? Math.min(...digitAmounts) : digitAmounts[0];

    let signed = amount;
    if (DEBIT_HINTS.test(line)) signed = -Math.abs(amount);
    else if (CREDIT_HINTS.test(line)) signed = Math.abs(amount);

    const [, d, m, yRaw] = dateMatch;
    const year = yRaw ? (yRaw.length === 2 ? `20${yRaw}` : yRaw) : null;
    const iso = year ? `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : null;

    const description = line
      .replace(dateMatch[0], "")
      .replace(/rp\.?\s?[\d.,]+/gi, "")
      .trim();

    out.push({ date: iso, description: description || line, amount: signed });
  }

  return out;
}

function extractPlainNumbers(line: string): number[] {
  const matches = line.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?/g) ?? [];
  return matches
    .map((m) => {
      const lastComma = m.lastIndexOf(",");
      const lastDot = m.lastIndexOf(".");
      const cleaned = lastComma > lastDot ? m.slice(0, lastComma).replace(/\./g, "") : m.replace(/[.,]/g, "");
      return Number(cleaned);
    })
    .filter((n) => Number.isFinite(n) && n > 0);
}
