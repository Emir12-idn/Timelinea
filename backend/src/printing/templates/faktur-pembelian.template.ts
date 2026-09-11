import { renderDocument, preparerBlock } from "../layout.util";
import { formatDate, qty, rupiah } from "../format.util";

interface PurchaseInvoiceForPrint {
  no: string;
  date: Date;
  dueDate: Date | null;
  dpp: bigint;
  ppn: bigint;
  total: bigint;
  supplier: { name: string; address: string | null; npwp: string | null };
  po: { no: string; lines: { item: { code: string; name: string; uom: string } | null; qty: unknown; unitPrice: bigint; amount: bigint }[] } | null;
  preparedByName: string | null;
  /** NPWP perusahaan (badan usaha) yang mencatat faktur ini — lihat catatan di layout.util.ts renderDocument(). */
  sellerNpwp: string | null;
}

/**
 * Faktur Pembelian — mengikuti pola struktural fakturPenjualanHtml() persis
 * (kop perusahaan, info pemasok, baris item, DPP/PPN/Total, blok penanda
 * tangan) TAPI TIDAK punya field Faktur Pajak/NSFP sendiri — ini dokumen
 * bisnis pembelian standar, bukan dokumen pajak yang diterbitkan sistem ini
 * (NSFP itu urusan Faktur Pajak pemasok, di luar sistem ini).
 *
 * `purchase_invoice` tidak punya tabel baris sendiri (§3 data design) —
 * baris item di sini SELALU berasal dari `po.lines` (PO yang ditautkan).
 * Kalau faktur ini dibuat tanpa PO (poId null), tabel item ditampilkan
 * kosong dengan catatan, dan DPP/PPN/Total dari header tetap dicetak
 * (satu-satunya sumber angka yang ada untuk faktur langsung).
 */
export function fakturPembelianHtml(invoice: PurchaseInvoiceForPrint): string {
  const lines = invoice.po?.lines ?? [];
  const rows = lines
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

  const body = `
    <div class="doc-title">FAKTUR PEMBELIAN / PURCHASE INVOICE</div>
    <table style="margin-bottom:14px;">
      <tr>
        <td style="width:55%">
          <div style="color:#555555">Dari:</div>
          <div style="font-weight:600">${invoice.supplier.name}</div>
          <div style="color:#555555">${invoice.supplier.address ?? ""}</div>
          <div style="color:#555555">NPWP: ${invoice.supplier.npwp ?? "-"}</div>
        </td>
        <td>
          <div>No. Faktur : <b>${invoice.no}</b></div>
          <div>Tanggal : ${formatDate(invoice.date)}</div>
          ${invoice.po ? `<div>No. PO : ${invoice.po.no}</div>` : ""}
          ${invoice.dueDate ? `<div>Jatuh Tempo : ${formatDate(invoice.dueDate)}</div>` : ""}
        </td>
      </tr>
    </table>
    ${
      lines.length > 0
        ? `<table class="items">
      <thead>
        <tr>
          <th>No</th><th>Part No</th><th>Nama Barang</th>
          <th class="num">Qty</th><th>Unit</th>
          <th class="num">Harga</th><th class="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p style="font-size:11.5px;color:#555555;">Faktur langsung tanpa PO tertaut — tidak ada rincian baris barang, lihat DPP/PPN/Total di bawah.</p>`
    }
    <div class="totals">
      <table>
        <tr><td class="label">DPP</td><td class="num">${rupiah(invoice.dpp)}</td></tr>
        <tr><td class="label">PPN</td><td class="num">${rupiah(invoice.ppn)}</td></tr>
        <tr class="grand"><td>Total</td><td class="num">${rupiah(invoice.total)}</td></tr>
      </table>
    </div>
    <table style="margin-top:24px;">
      <tr>
        <td style="width:60%;"></td>
        <td style="width:40%;vertical-align:top;">
          ${preparerBlock("Diterima oleh,", "Emerald Duta Sejahtera", invoice.preparedByName)}
        </td>
      </tr>
    </table>
  `;

  return renderDocument(`Faktur Pembelian ${invoice.no}`, body, { npwp: invoice.sellerNpwp });
}
