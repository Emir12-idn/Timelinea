import { renderDocument, digitalSignatureBlock } from "../layout.util";
import { formatDate, qty } from "../format.util";

interface DeliveryOrderForPrint {
  no: string;
  date: Date;
  customerName: string;
  lines: { item: { code: string; name: string; uom: string } | null; qty: unknown }[];
  issuedByName?: string | null;
}

export function suratJalanHtml(deliveryOrder: DeliveryOrderForPrint): string {
  const rows = deliveryOrder.lines
    .map(
      (l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.item?.code ?? "-"}</td>
      <td>${l.item?.name ?? "-"}</td>
      <td class="num">${qty(l.qty)}</td>
      <td>${l.item?.uom ?? "-"}</td>
    </tr>`,
    )
    .join("");

  const body = `
    <div class="doc-title" style="margin-bottom:2px;">SURAT JALAN / DELIVERY NOTE</div>
    <div style="text-align:center;color:#555555;font-size:11px;margin-bottom:16px;">No. ${deliveryOrder.no} &middot; ${formatDate(deliveryOrder.date)}</div>
    <table style="margin-bottom:14px;font-size:12.5px;">
      <tr><td>Kepada : <b>${deliveryOrder.customerName}</b></td></tr>
    </table>
    <table class="items">
      <thead>
        <tr><th>No</th><th>Part No</th><th>Nama Barang</th><th class="num">Qty</th><th>Unit</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:14px;">Barang tersebut di atas telah dikirim dalam kondisi baik.</p>
    ${digitalSignatureBlock("Diterbitkan oleh", deliveryOrder.issuedByName ?? null)}
  `;

  return renderDocument(`Surat Jalan ${deliveryOrder.no}`, body);
}
