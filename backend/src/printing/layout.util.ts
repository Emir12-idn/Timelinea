const BRAND = {
  name: "Emerald",
  nameAccent: "Duta Sejahtera",
  address: "Link. Cipayung RT.03/09, Cipayung, Depok 16437",
  npwp: "01.060.100.3.092.000",
};

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12.5px; color: #1e293b; margin: 0; }
  .kop { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a6e; padding-bottom: 10px; margin-bottom: 16px; }
  .kop .wordmark { font-size: 22px; font-weight: 800; color: #1e3a6e; }
  .kop .wordmark .accent { color: #c7a24a; }
  .kop .meta { font-size: 10.5px; color: #64748b; margin-top: 3px; }
  .doc-title { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  table.items { font-size: 11.5px; }
  table.items th, table.items td { padding: 5px 6px; text-align: left; }
  table.items thead tr { border-top: 1px solid #334155; border-bottom: 1px solid #334155; }
  table.items tbody tr { border-bottom: 1px solid #e2e8f0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 10px; display: flex; justify-content: flex-end; }
  .totals table { width: auto; min-width: 260px; font-size: 12.5px; }
  .totals td { padding: 3px 0; }
  .totals td.label { color: #64748b; padding-right: 24px; }
  .totals tr.grand td { border-top: 1px solid #334155; font-weight: 700; padding-top: 6px; }
  .ttd { margin-top: 48px; display: flex; justify-content: space-between; text-align: center; }
  .ttd .slot { width: 45%; }
  .ttd .label { color: #64748b; margin-bottom: 56px; }
  .ttd .line { border-top: 1px solid #64748b; padding-top: 4px; }
  .highlight { background: #eef4ff; border-radius: 4px; padding: 8px 12px; font-weight: 700; color: #1e3a6e; display: flex; justify-content: space-between; margin-top: 16px; }
`;

export function renderDocument(title: string, bodyHtml: string): string {
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
      <div class="meta">${BRAND.address} &middot; NPWP ${BRAND.npwp}</div>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

export function ttdBlock(kiri: string, kanan: string): string {
  return `<div class="ttd">
    <div class="slot"><div class="label">${kiri}</div><div class="line">( .................... )</div></div>
    <div class="slot"><div class="label">${kanan}</div><div class="line">( .................... )</div></div>
  </div>`;
}
