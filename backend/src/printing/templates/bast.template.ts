import { renderDocument, ttdBlock } from "../layout.util";
import { formatDate, qty } from "../format.util";

interface BastForPrint {
  no: string;
  date: Date;
  poRef: string | null;
  customer: { name: string };
  lines: { partNo: string | null; name: string; qty: unknown; uom: string }[];
}

export function bastHtml(bast: BastForPrint): string {
  const rows = bast.lines
    .map(
      (l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.partNo ?? "-"}</td>
      <td>${l.name}</td>
      <td class="num">${qty(l.qty)}</td>
      <td>${l.uom}</td>
    </tr>`,
    )
    .join("");

  const body = `
    <div class="doc-title" style="margin-bottom:2px;">BERITA ACARA SERAH TERIMA</div>
    <div style="text-align:center;color:#555555;font-size:11px;margin-bottom:16px;">No. ${bast.no} &middot; ${formatDate(bast.date)}</div>
    <p>Pada hari ini, telah dilakukan serah terima barang/pekerjaan${bast.poRef ? ` sesuai Pesanan Pembelian (PO) <b>${bast.poRef}</b>` : ""} dengan rincian sebagai berikut:</p>
    <table style="margin:12px 0;font-size:12.5px;">
      <tr>
        <td>Pihak Pertama : <b>Emerald Duta Sejahtera</b> (yang menyerahkan)</td>
        <td>Pihak Kedua : <b>${bast.customer.name}</b> (yang menerima)</td>
      </tr>
    </table>
    <table class="items">
      <thead>
        <tr><th>No</th><th>Part No</th><th>Nama Barang</th><th class="num">Qty</th><th>Unit</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:12px;">Barang/pekerjaan di atas telah diterima dalam kondisi baik dan sesuai spesifikasi. Berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
    ${ttdBlock("Pihak Kedua (Penerima),", "Pihak Pertama (Emerald DS),")}
  `;

  return renderDocument(`BAST ${bast.no}`, body);
}
