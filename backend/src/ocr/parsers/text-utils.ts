/**
 * Nota lokal pakai format Indonesia (titik ribuan, koma desimal — "Rp
 * 1.000.000,00"), tapi nota dari vendor asing/multinasional (PO Shangri-La
 * yang pernah kelihatan di Drive, misalnya) pakai format Inggris ("IDR
 * 7,920,000.00" — koma ribuan, titik desimal). Fungsi ini mendeteksi mana yang
 * dipakai: pemisah terakhir dianggap desimal HANYA kalau diikuti 1-2 digit
 * (kayaknya sen), kalau diikuti 3 digit dianggap pemisah ribuan (tidak ada
 * nota yang punya 3 digit desimal). Uang di seluruh sistem ini integer
 * rupiah, jadi bagian desimal selalu dibuang.
 */
export function parseIndonesianAmount(raw: string): number | null {
  const cleaned = raw.replace(/rp\.?/i, "").replace(/idr/i, "").trim();
  const match = cleaned.match(/-?[\d.,]+/);
  if (!match) return null;
  const numStr = match[0];
  const lastComma = numStr.lastIndexOf(",");
  const lastDot = numStr.lastIndexOf(".");
  const lastSepIdx = Math.max(lastComma, lastDot);

  let integerPart: string;
  if (lastSepIdx === -1) {
    integerPart = numStr;
  } else {
    const trailingDigits = numStr.length - lastSepIdx - 1;
    const looksLikeDecimal = trailingDigits === 1 || trailingDigits === 2;
    integerPart = looksLikeDecimal ? numStr.slice(0, lastSepIdx) : numStr;
  }
  const n = Number(integerPart.replace(/[.,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Semua kemunculan "Rp .../IDR ..." di teks, sudah diparse jadi integer rupiah. */
export function findAllAmounts(text: string): number[] {
  const matches = text.match(/(?:Rp|IDR)\.?\s?[\d.,]+/gi) ?? [];
  return matches.map(parseIndonesianAmount).filter((n): n is number => n !== null && n > 0);
}

/**
 * Cari nominal yang berdekatan dengan label tertentu (mis. "Total", "Grand
 * Total", "Jumlah Bayar") — baik di baris yang sama maupun 1-2 baris
 * setelahnya (format nota sering pisah label & nilai per baris/kolom).
 */
export function findAmountNearLabel(text: string, labels: string[]): number | null {
  const lines = splitLines(text);
  const labelRe = new RegExp(labels.join("|"), "i");
  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;
    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
      const amounts = findAllAmounts(lines[j]);
      if (amounts.length > 0) return Math.max(...amounts);
      const plain = lines[j].match(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b/);
      if (plain) return parseIndonesianAmount(plain[0]);
    }
  }
  return null;
}

/** Tanggal format DD/MM/YYYY atau DD-MM-YYYY (umum di struk & rekening koran Indonesia). */
export function findDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (!match) return null;
  const [, d, m, y] = match;
  const dd = d.padStart(2, "0");
  const mm = m.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** Semua tanggal DD/MM/YYYY yang muncul di teks, urut sesuai kemunculan. */
export function findAllDates(text: string): { iso: string; index: number }[] {
  const out: { iso: string; index: number }[] = [];
  const re = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [, d, mo, y] = m;
    out.push({ iso: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, index: m.index });
  }
  return out;
}

const BANKS = ["BCA", "MANDIRI", "BNI", "BRI", "CIMB", "PERMATA", "BSI", "DANAMON", "OCBC", "MAYBANK"];

export function findBank(text: string): string | null {
  const upper = text.toUpperCase();
  return BANKS.find((b) => upper.includes(b)) ?? null;
}

export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
