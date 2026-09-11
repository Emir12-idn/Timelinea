import { useState } from "react";
import { Plus, Trash2, X, Send, CheckCircle2, XCircle, Clock, ArrowRightCircle } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

function NewSQForm({ customers, items, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? "", qty: 1, unitPrice: 0 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: items[0]?.id ?? "", qty: 1, unitPrice: 0 }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const total = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/sales-quotations", {
        date,
        customerId: Number(customerId),
        validUntil: validUntil || undefined,
        note: note || undefined,
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
        <div className="text-sm font-semibold text-slate-700">Penawaran Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pelanggan">
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectCls}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Berlaku Sampai (opsional)">
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Catatan (opsional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </Field>

        <div className="rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
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
                        <button type="button" onClick={() => removeLine(i)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
              <Plus size={14} /> Tambah baris
            </button>
            <div className="text-sm font-semibold text-slate-700">Total: {rupiah(total)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Penawaran"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function SalesQuotationRow({ sq, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nilai = (sq.lines || []).reduce((s, l) => s + Number(l.amount), 0);

  const setStatus = async (status) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/sales-quotations/${sq.id}/status`, { status });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/sales-quotations/${sq.id}/convert-to-so`, {});
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
      <td className="px-4 py-3 font-medium text-blue-800">{sq.no}</td>
      <td className="px-4 py-3 text-slate-600">{dateID(sq.date)}</td>
      <td className="px-4 py-3 text-slate-700">{sq.customer?.name}</td>
      <td className="px-4 py-3"><Badge status={sq.status} /></td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(nilai)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {sq.status === "draft" && (
            <button disabled={busy} onClick={() => setStatus("sent")} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <Send size={13} /> Kirim
            </button>
          )}
          {sq.status === "sent" && (
            <>
              <button disabled={busy} onClick={() => setStatus("accepted")} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50">
                <CheckCircle2 size={13} /> Diterima
              </button>
              <button disabled={busy} onClick={() => setStatus("rejected")} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50">
                <XCircle size={13} /> Ditolak
              </button>
              <button disabled={busy} onClick={() => setStatus("expired")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                <Clock size={13} /> Kedaluwarsa
              </button>
            </>
          )}
          {sq.status === "accepted" && !sq.convertedSoId && (
            <button disabled={busy} onClick={convert} className="inline-flex items-center gap-1 rounded-md bg-blue-900 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              <ArrowRightCircle size={13} /> Konversi ke SO
            </button>
          )}
          {sq.convertedSoId && (
            <span className="text-xs text-slate-500">→ SO {sq.convertedSo?.no}</span>
          )}
        </div>
        {error && <div className="mt-1 text-right text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  );
}

export default function SalesQuotationList() {
  const sq = useApi("/sales-quotations");
  const customers = useApi("/partners?type=customer");
  const items = useApi("/items");
  const [showForm, setShowForm] = useState(false);

  const ready = !sq.loading && !customers.loading && !items.loading;

  return (
    <>
      <PageHeader
        crumbs={["Penjualan", "Penawaran"]}
        title="Penawaran (Quotation)"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
            <Plus size={16} /> Penawaran Baru
          </button>
        }
      />
      <ErrorBanner message={sq.error || customers.error || items.error} />

      {showForm && ready && (
        <NewSQForm
          customers={customers.data}
          items={items.data}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            sq.reload();
          }}
        />
      )}

      {sq.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No Penawaran</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(sq.data || []).map((r) => <SalesQuotationRow key={r.id} sq={r} onChanged={sq.reload} />)}
                {(sq.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada Penawaran.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
