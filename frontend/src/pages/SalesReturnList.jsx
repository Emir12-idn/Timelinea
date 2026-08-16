import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

function NewSalesReturnForm({ invoices, items, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [salesInvoiceId, setSalesInvoiceId] = useState(invoices[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? "", qty: 1, unitPrice: 0 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: items[0]?.id ?? "", qty: 1, unitPrice: 0 }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const dpp = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);
  const ppn = Math.round(dpp * 0.11);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/sales-returns", {
        date,
        salesInvoiceId: Number(salesInvoiceId),
        reason: reason || undefined,
        lines: lines.map((l) => ({ itemId: Number(l.itemId), qty: Number(l.qty), unitPrice: Number(l.unitPrice) })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Retur Penjualan Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Faktur Penjualan">
            <select required value={salesInvoiceId} onChange={(e) => setSalesInvoiceId(e.target.value)} className={selectCls}>
              {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.no} — {inv.customer?.name}</option>)}
            </select>
          </Field>
          <Field label="Alasan (opsional)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="mis. barang cacat / salah kirim" />
          </Field>
        </div>

        <div className="rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">Barang</th>
                <th className="px-3 py-2 w-24">Qty</th>
                <th className="px-3 py-2 w-40">Harga Satuan</th>
                <th className="px-3 py-2 w-32 text-right">Jumlah</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <select value={l.itemId} onChange={(e) => updateLine(i, { itemId: e.target.value })} className={selectCls}>
                      {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="any" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} className={inputCls} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{rupiah(Number(l.qty || 0) * Number(l.unitPrice || 0))}</td>
                  <td className="px-3 py-2 text-right">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
              <Plus size={14} /> Tambah baris
            </button>
            <div className="text-right text-sm text-slate-600">
              <div>Subtotal: {rupiah(dpp)}</div>
              <div>PPN 11%: {rupiah(ppn)}</div>
              <div className="font-semibold text-slate-800">Total: {rupiah(dpp + ppn)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Retur"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function SalesReturnList() {
  const returns = useApi("/sales-returns");
  const invoices = useApi("/sales-invoices");
  const items = useApi("/items");
  const [showForm, setShowForm] = useState(false);

  const ready = !invoices.loading && !items.loading && (invoices.data || []).length > 0;

  return (
    <>
      <PageHeader
        crumbs={["Penjualan", "Retur Penjualan"]}
        title="Retur Penjualan"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Retur Baru
          </button>
        }
      />
      <ErrorBanner message={returns.error || invoices.error || items.error} />
      {!invoices.loading && (invoices.data || []).length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Belum ada Faktur Penjualan untuk diretur — buat faktur dulu di menu Faktur Penjualan.
        </div>
      )}

      {showForm && ready && (
        <NewSalesReturnForm
          invoices={invoices.data}
          items={items.data}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            returns.reload();
          }}
        />
      )}

      {returns.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No Retur</th><th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Faktur Asal</th><th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Alasan</th><th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(returns.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-800">{r.no}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.salesInvoice?.no}</td>
                    <td className="px-4 py-3 text-slate-700">{r.salesInvoice?.customer?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.reason || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(r.total)}</td>
                  </tr>
                ))}
                {(returns.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada retur penjualan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
