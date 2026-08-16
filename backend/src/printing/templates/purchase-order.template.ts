import { renderDocument, digitalSignatureBlock } from "../layout.util";
import { formatDate, qty, rupiah } from "../format.util";

interface PurchaseOrderForPrint {
  no: string;
  date: Date;
  note: string | null;
  supplier: { name: string; address: string | null };
  lines: { item: { code: string; name: string; uom: string } | null; qty: unknown; unitPrice: bigint; amount: bigint }[];
  issuedByName: string | null;
}

export function purchaseOrderHtml(po: PurchaseOrderForPrint): string {
  const rows = po.lines
    .map(
      (l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.item?.code ?? "-"}</td>
      <td>${l.item?.name ?? "-"}</td>
      <td class="num">${qty(l.qty)}</td>
      <td>${l.item?.uom ?? "-"}</td>
      <td class="num">${rupiah(l.unitPrice)}</td>
      <td class="num">${rupiah(l.amount)}</td>
    </tr>`,
    )
    .join("");

  const total = po.lines.reduce((sum, l) => sum + l.amount, 0n);

  const body = `
    <div class="doc-title">PESANAN PEMBELIAN / PURCHASE ORDER</div>
    <table style="margin-bottom:14px;">
      <tr>
        <td style="width:55%">
          <div style="color:#555555">Kepada:</div>
          <div style="font-weight:600">${po.supplier.name}</div>
          <div style="color:#555555">${po.supplier.address ?? ""}</div>
        </td>
        <td>
          <div>No. PO : <b>${po.no}</b></div>
          <div>Tanggal : ${formatDate(po.date)}</div>
        </td>
      </tr>
    </table>
    <table class="items">
      <thead>
        <tr>
          <th>No</th><th>Part No</th><th>Nama Barang</th>
          <th class="num">Qty</th><th>Unit</th>
          <th class="num">Harga</th><th class="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr class="grand"><td>Total</td><td class="num">${rupiah(total)}</td></tr>
      </table>
    </div>
    ${po.note ? `<p style="margin-top:14px;font-size:11.5px;"><span style="color:#555555;">Catatan:</span> ${po.note}</p>` : ""}
    ${digitalSignatureBlock("Dipesan oleh", po.issuedByName)}
  `;

  return renderDocument(`PO ${po.no}`, body);
}
