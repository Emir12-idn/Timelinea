import { useState } from "react";
import { Plus, Trash2, X, CheckCircle2, XCircle, ArrowRightCircle } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { dateID } from "../lib/format";

function NewPRForm({ departments, items, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? "", qty: 1, estimatedUnitPrice: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: items[0]?.id ?? "", qty: 1, estimatedUnitPrice: "" }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/purchase-requests", {
        date,
        departmentId: departmentId ? Number(departmentId) : undefined,
        note: note || undefined,
        lines: lines.map((l) => ({
          itemId: Number(l.itemId),
          qty: Number(l.qty),
          estimatedUnitPrice: l.estimatedUnitPrice === "" ? undefined : Number(l.estimatedUnitPrice),
        })),
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
        <div className="text-sm font-semibold text-slate-700">Permintaan Pembelian Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Departemen (opsional)">
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectCls}>
              <option value="">—</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Catatan (opsional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </Field>

        <div className="rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-3 py-2">Barang</th>
                  <th className="px-3 py-2 w-24">Qty</th>
                  <th className="px-3 py-2 w-44">Estimasi Harga (opsional)</th>
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
                      <input type="number" min="0" placeholder="—" value={l.estimatedUnitPrice} onChange={(e) => updateLine(i, { estimatedUnitPrice: e.target.value })} className={inputCls} />
                    </td>
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
          <div className="border-t border-slate-100 px-3 py-2">
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
              <Plus size={14} /> Tambah baris
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan PR"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function PurchaseRequestRow({ pr, suppliers, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");

  const decide = async (action) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/purchase-requests/${pr.id}/${action}`, {});
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!supplierId) { setError("Pilih pemasok dulu"); return; }
    setBusy(true);
    setError("");
    try {
      await api.patch(`/purchase-requests/${pr.id}/convert-to-po`, { supplierId: Number(supplierId) });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50 align-top">
      <td className="px-4 py-3 font-medium text-blue-800">{pr.no}</td>
      <td className="px-4 py-3 text-slate-600">{dateID(pr.date)}</td>
      <td className="px-4 py-3 text-slate-700">{pr.department?.name || "-"}</td>
      <td className="px-4 py-3 text-slate-600">{(pr.lines || []).length} barang</td>
      <td className="px-4 py-3"><Badge status={pr.status} /></td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {pr.status === "draft" && (
            <>
              <button disabled={busy} onClick={() => decide("approve")} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50">
                <CheckCircle2 size={13} /> Setujui
              </button>
              <button disabled={busy} onClick={() => decide("reject")} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50">
                <XCircle size={13} /> Tolak
              </button>
            </>
          )}
          {pr.status === "approved" && !converting && (
            <button disabled={busy} onClick={() => setConverting(true)} className="inline-flex items-center gap-1 rounded-md bg-blue-900 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              <ArrowRightCircle size={13} /> Konversi ke PO
            </button>
          )}
          {pr.status === "approved" && converting && (
            <div className="flex items-center gap-1.5">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button disabled={busy} onClick={convert} className="rounded-md bg-blue-900 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">Konversi</button>
              <button disabled={busy} onClick={() => setConverting(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Batal</button>
            </div>
          )}
          {pr.convertedPoId && (
            <span className="text-xs text-slate-500">→ PO {pr.convertedPo?.no}</span>
          )}
        </div>
        {error && <div className="mt-1 text-right text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  );
}

export default function PurchaseRequestList() {
  const pr = useApi("/purchase-requests");
  const departments = useApi("/departments");
  const suppliers = useApi("/partners?type=supplier");
  const items = useApi("/items");
  const [showForm, setShowForm] = useState(false);

  const ready = !pr.loading && !departments.loading && !items.loading;

  return (
    <>
      <PageHeader
        crumbs={["Pembelian", "Permintaan Pembelian"]}
        title="Permintaan Pembelian (PR)"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
            <Plus size={16} /> PR Baru
          </button>
        }
      />
      <ErrorBanner message={pr.error || departments.error || items.error} />

      {showForm && ready && (
        <NewPRForm
          departments={departments.data || []}
          items={items.data}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            pr.reload();
          }}
        />
      )}

      {pr.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No PR</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Departemen</th>
                  <th className="px-4 py-3">Barang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(pr.data || []).map((r) => (
                  <PurchaseRequestRow key={r.id} pr={r} suppliers={suppliers.data || []} onChanged={pr.reload} />
                ))}
                {(pr.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada PR.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
