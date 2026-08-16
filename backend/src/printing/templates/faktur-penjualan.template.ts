import { renderDocument, ttdBlock } from "../layout.util";
import { formatDate, qty, rupiah } from "../format.util";

interface SalesInvoiceForPrint {
  no: string;
  date: Date;
  poRef: string | null;
  dpp: bigint;
  ppn: bigint;
  total: bigint;
  customer: { name: string; address: string | null };
  lines: { partNo: string | null; name: string; qty: unknown; uom: string; unitPrice: bigint; amount: bigint }[];
}

export function fakturPenjualanHtml(invoice: SalesInvoiceForPrint): string {
  const rows = invoice.lines
    .map(
      (l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.partNo ?? "-"}</td>
      <td>${l.name}</td>
      <td class="num">${qty(l.qty)}</td>
      <td>${l.uom}</td>
      <td class="num">${rupiah(l.unitPrice)}</td>
      <td class="num">${rupiah(l.amount)}</td>
    </tr>`,
    )
    .join("");

  const body = `
    <div class="doc-title">FAKTUR PENJUALAN / SALES INVOICE</div>
    <table style="margin-bottom:14px;">
      <tr>
        <td style="width:55%">
          <div style="color:#64748b">Kepada:</div>
          <div style="font-weight:600">${invoice.customer.name}</div>
          <div style="color:#64748b">${invoice.customer.address ?? ""}</div>
        </td>
        <td style="text-align:right">
          <div>No. Faktur : <b>${invoice.no}</b></div>
          <div>Tanggal : ${formatDate(invoice.date)}</div>
          <div>No. PO : ${invoice.poRef ?? "-"}</div>
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
        <tr><td class="label">DPP</td><td class="num">${rupiah(invoice.dpp)}</td></tr>
        <tr><td class="label">PPN 11%</td><td class="num">${rupiah(invoice.ppn)}</td></tr>
        <tr class="grand"><td>Total</td><td class="num">${rupiah(invoice.total)}</td></tr>
      </table>
    </div>
    ${ttdBlock("Penerima,", "Hormat kami, Emerald Duta Sejahtera")}
  `;

  return renderDocument(`Faktur ${invoice.no}`, body);
}
