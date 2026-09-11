const BRAND = {
  name: "Emerald",
  nameAccent: "Duta Sejahtera",
  npwp: "01.060.100.3.092.000",
};

// Print-outs are strictly monochrome (no navy/gold brand colors) — official
// documents print on plain black & white office printers, and a colored
// logo/heading there reads as unprofessional rather than "branded".
const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12.5px; color: #000000; margin: 0; }
  .kop { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 16px; }
  .kop .wordmark { font-size: 22px; font-weight: 800; color: #000000; }
  .kop .wordmark .accent { font-weight: 400; color: #000000; }
  .kop .meta { font-size: 10.5px; color: #555555; margin-top: 3px; }
  .doc-title { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  table.items { font-size: 11.5px; }
  table.items th, table.items td { padding: 5px 6px; text-align: left; }
  table.items thead tr { border-top: 1px solid #000000; border-bottom: 1px solid #000000; }
  table.items tbody tr { border-bottom: 1px solid #cccccc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 10px; display: flex; justify-content: flex-end; }
  .totals table { width: auto; min-width: 260px; font-size: 12.5px; }
  .totals td { padding: 3px 0; }
  .totals td.label { color: #555555; padding-right: 24px; }
  .totals tr.grand td { border-top: 1px solid #000000; font-weight: 700; padding-top: 6px; }

  /* Wet-signature block — only for documents that legally need ink + company
     stamp (cap basah): BAST (both parties sign a handover). Everything else is
     issued electronically, no blank line. */
  .ttd { margin-top: 48px; display: flex; justify-content: space-between; text-align: center; }
  .ttd .slot { width: 45%; }
  .ttd .label { color: #555555; margin-bottom: 56px; }
  .ttd .line { border-top: 1px solid #000000; padding-top: 4px; }

  /* Digital-signature block — for documents that don't need ink: Slip Gaji,
     Surat Jalan, (future) Laporan Keuangan/Pajak. Shows the PIC's real name
     instead of a blank line. */
  .digisign { margin-top: 40px; display: flex; justify-content: flex-end; }
  .digisign .box { text-align: center; min-width: 220px; border-top: 1px solid #000000; padding-top: 6px; }
  .digisign .role { font-size: 10.5px; color: #555555; margin-bottom: 2px; }
  .digisign .name { font-weight: 700; font-size: 13px; }
  .digisign .note { margin-top: 4px; font-size: 9.5px; color: #777777; font-style: italic; }

  /* Preparer block — Faktur Penjualan. No line at all: the name comes straight
     from the account that created the invoice, nothing to hand-sign. */
  .preparer { margin-top: 40px; text-align: right; }
  .preparer .company { font-weight: 700; }
  .preparer .name { margin-top: 2px; }

  .highlight { background: #f2f2f2; border: 1px solid #000000; border-radius: 2px; padding: 8px 12px; font-weight: 700; color: #000000; display: flex; justify-content: space-between; margin-top: 16px; }
`;

/**
 * §11 data design, item 8 — Faktur Pajak (PER-11/PJ/2025) mewajibkan NPWP PENJUAL
 * yang MENERBITKAN faktur, bukan sekadar brand default. Sistem ini multi-company
 * (§9.6) — tiap `Company` punya `npwp` sendiri di skema — jadi print-out yang
 * ditautkan ke company tertentu (lihat faktur-penjualan.template.ts) harus
 * menampilkan NPWP company ITU, bukan selalu NPWP brand default yang di-hardcode.
 * `seller` opsional: kosongkan untuk dokumen yang memang bukan tersimpan per-
 * company (PO/BAST/Slip Gaji internal) — tetap pakai BRAND seperti semula.
 */
export function renderDocument(title: string, bodyHtml: string, seller?: { npwp: string | null }): string {
  const sellerNpwp = seller?.npwp ?? BRAND.npwp;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${BASE_CSS}</style>
</head>
<body>
  <div class="kop">
    <div>
      <div class="wordmark">${BRAND.name} <span class="accent">${BRAND.nameAccent}</span></div>
      <div class="meta">NPWP ${sellerNpwp ?? "-"}</div>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

/** Blank lines for wet ink + company stamp, one per party — BAST (both sides sign). */
export function ttdBlock(kiri: string, kanan: string): string {
  return `<div class="ttd">
    <div class="slot"><div class="label">${kiri}</div><div class="line">( .................... )</div></div>
    <div class="slot"><div class="label">${kanan}</div><div class="line">( .................... )</div></div>
  </div>`;
}

/** Faktur Penjualan's closing block — company name + the name of whoever created
 * the invoice (from the logged-in account), no signature line. An invoice is
 * billing, not a receipt: there's nothing here for either side to hand-sign. */
export function preparerBlock(salutation: string, companyName: string, preparedByName: string | null): string {
  return `<div class="preparer">
    <div>${salutation}</div>
    <div class="company">${companyName}</div>
    ${preparedByName ? `<div class="name">${preparedByName}</div>` : ""}
  </div>`;
}

/** Named PIC instead of a blank line — for documents issued electronically. */
export function digitalSignatureBlock(role: string, name: string | null): string {
  return `<div class="digisign">
    <div class="box">
      <div class="role">${role}</div>
      <div class="name">${name ?? "-"}</div>
      <div class="note">Diterbitkan secara elektronik &middot; sah tanpa tanda tangan basah</div>
    </div>
  </div>`;
}
