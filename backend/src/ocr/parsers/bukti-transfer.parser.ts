import { findAllAmounts, findBank, findDate, splitLines } from "./text-utils";

export interface BuktiTransferParsed {
  date: string | null;
  amount: number | null;
  bank: string | null;
  recipientAccount: string | null;
  recipientName: string | null;
  success: boolean;
}

/**
 * Struk m-transfer mobile banking (format BCA/Mandiri/dsb mirip semua):
 *   m-Transfer: BERHASIL
 *   18/04/2026 15:46:12
 *   Ke 5445250845
 *   OMA
 *   Rp 1.000.000,00
 *   BCA
 * Nomor rekening tujuan biasanya baris setelah "Ke "/"Kepada", nama penerima
 * baris setelahnya lagi. Nominal transfer diambil sebagai jumlah Rp terbesar
 * (biaya admin kalau ada biasanya jauh lebih kecil dari nominal transfernya).
 */
export function parseBuktiTransfer(text: string): BuktiTransferParsed {
  const lines = splitLines(text);
  const success = /berhasil|success|sukses/i.test(text);

  let recipientAccount: string | null = null;
  let recipientName: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:ke|kepada|tujuan)\s*:?\s*(\d{6,})?/i);
    if (m) {
      recipientAccount = m[1] ?? null;
      if (!recipientAccount) {
        const digitsOnly = lines[i].match(/\d{6,}/);
        recipientAccount = digitsOnly?.[0] ?? null;
      }
      recipientName = lines[i + 1] && !/^rp/i.test(lines[i + 1]) ? lines[i + 1] : null;
      break;
    }
  }

  const amounts = findAllAmounts(text);
  const amount = amounts.length > 0 ? Math.max(...amounts) : null;

  return {
    date: findDate(text),
    amount,
    bank: findBank(text),
    recipientAccount,
    recipientName,
    success,
  };
}
