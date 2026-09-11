import { useState } from "react";
import { Printer } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api, fetchPdfObjectUrl } from "../api/client";
import { dateID } from "../lib/format";

export default function BASTList() {
  const bast = useApi("/basts");
  const invoices = useApi("/sales-invoices");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  if (bast.loading || invoices.loading) return <Spinner />;

  const bastByInvoice = new Set((bast.data || []).map((b) => b.sourceInvoice?.id).filter(Boolean));

  const createFromInvoice = async (invoice) => {
    setBusyId(invoice.id);
    setError("");
    try {
      await api.post("/basts", {
        date: new Date().toISOString().slice(0, 10),
        customerId: invoice.customer?.id ?? invoice.customerId,
        poRef: invoice.poRef || undefined,
        sourceInvoiceId: invoice.id,
      });
      bast.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const printBast = async (id) => {
    setBusyId(id);
    setError("");
    try {
      const url = await fetchPdfObjectUrl(`/basts/${id}/print`);
      window.open(url, "_blank");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader crumbs={["Proyek & Departemen", "Berita Acara Serah Terima"]} title="Berita Acara Serah Terima" />
      <ErrorBanner message={bast.error || invoices.error || error} />

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Buat dari Faktur Penjualan</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">No Faktur</th><th className="px-4 py-2">Pelanggan</th><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(invoices.data || []).map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-medium text-blue-800">{v.no}</td>
                  <td className="px-4 py-3 text-slate-700">{v.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{dateID(v.date)}</td>
                  <td className="px-4 py-3 text-right">
                    {bastByInvoice.has(v.id) ? (
                      <span className="text-xs text-slate-400">Sudah dibuat</span>
                    ) : (
                      <button
                        onClick={() => createFromInvoice(v)}
                        disabled={busyId === v.id}
                        className="min-h-[36px] rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                      >
                        {busyId === v.id ? "Memproses…" : "Buat BAST"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(invoices.data || []).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada faktur.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Daftar BAST</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">No BAST</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(bast.data || []).map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-medium text-blue-800">{b.no}</td>
                  <td className="px-4 py-3 text-slate-700">{b.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{dateID(b.date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => printBast(b.id)}
                      disabled={busyId === b.id}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-rose-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                    >
                      <Printer size={13} /> Cetak
                    </button>
                  </td>
                </tr>
              ))}
              {(bast.data || []).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada BAST.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
