import { Card, PageHeader, Badge, Spinner, ErrorBanner } from "../components/ui";
import { ImportExportBar } from "../components/ImportExport";
import { useApi } from "../lib/useApi";
import { rupiah, dateID } from "../lib/format";

/**
 * Read-only list + export — §11 data design, item 4 (purchase_invoice adalah
 * salah satu daftar transaksi yang wajib punya export CSV). Belum ada halaman
 * pembuatan Faktur Pembelian di frontend sama sekali sebelum pass ini (faktur
 * pembelian di sistem ini dibuat lewat POST /purchase-invoices, biasanya
 * ditautkan ke PO — lihat backend/README.md); membangun form pembuatan penuh
 * di luar cakupan "basic Import/Export button" item ini, jadi halaman ini
 * sengaja read-only (judgment call, lihat laporan akhir tugas).
 */
export default function PurchaseInvoiceList() {
  const inv = useApi("/purchase-invoices");

  return (
    <>
      <PageHeader
        crumbs={["Pembelian", "Faktur Pembelian"]}
        title="Faktur Pembelian"
        actions={<ImportExportBar exportPath="/purchase-invoices/export/csv" exportFilename="purchase-invoices.csv" />}
      />
      <ErrorBanner message={inv.error} />

      {inv.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No Faktur</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pemasok</th>
                  <th className="px-4 py-3">No PO</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(inv.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-800">{r.no}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.supplier?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.po?.no || "-"}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(r.total)}</td>
                  </tr>
                ))}
                {(inv.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada Faktur Pembelian.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
