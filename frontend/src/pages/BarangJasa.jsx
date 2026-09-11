import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { ImportExportBar } from "../components/ImportExport";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah } from "../lib/format";

const TYPE_LABEL = { stock: "Barang (Stok)", service: "Jasa" };
const COSTING_LABEL = { average: "Rata-rata", fifo: "FIFO" };

function NewItemForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ code: "", name: "", uom: "", type: "stock", costingMethod: "average", tracksExpiry: false, barcode: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/items", { ...form, tracksExpiry: form.tracksExpiry === true || form.tracksExpiry === "true", barcode: form.barcode || undefined });
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
        <div className="text-sm font-semibold text-slate-700">Barang/Jasa Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Kode"><input required value={form.code} onChange={set("code")} className={inputCls} /></Field>
        <Field label="Nama"><input required value={form.name} onChange={set("name")} className={inputCls} /></Field>
        <Field label="Satuan (UOM)"><input required value={form.uom} onChange={set("uom")} className={inputCls} placeholder="PCS, LS, KG…" /></Field>
        <Field label="Tipe">
          <select value={form.type} onChange={set("type")} className={selectCls}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Metode Costing">
          <select value={form.costingMethod} onChange={set("costingMethod")} className={selectCls}>
            {Object.entries(COSTING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Barcode (opsional)"><input value={form.barcode} onChange={set("barcode")} className={inputCls} /></Field>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="tracksExpiry"
            type="checkbox"
            checked={!!form.tracksExpiry}
            onChange={(e) => setForm((f) => ({ ...f, tracksExpiry: e.target.checked }))}
          />
          <label htmlFor="tracksExpiry" className="text-sm text-slate-600">Lacak kedaluwarsa (FEFO, khusus item FIFO)</label>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function BarangJasa() {
  const items = useApi("/items");
  const [showForm, setShowForm] = useState(false);

  if (items.loading) return <Spinner />;
  const rows = items.data || [];

  return (
    <>
      <PageHeader
        crumbs={["Persediaan", "Barang & Jasa"]}
        title="Barang & Jasa"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ImportExportBar exportPath="/items/export/csv" exportFilename="items.csv" importPath="/items/import" onImported={items.reload} />
            <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
              <Plus size={16} /> Barang/Jasa Baru
            </button>
          </div>
        }
      />
      <ErrorBanner message={items.error} />
      {showForm && <NewItemForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); items.reload(); }} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Costing</th>
                <th className="px-4 py-3 text-right">Biaya Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-medium text-blue-800">{it.code}</td>
                  <td className="px-4 py-3 text-slate-700">{it.name}</td>
                  <td className="px-4 py-3 text-slate-500">{it.uom}</td>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[it.type] ?? it.type}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {COSTING_LABEL[it.costingMethod] ?? it.costingMethod}
                    {it.tracksExpiry && <span className="ml-1 text-[10px] text-amber-600">(FEFO)</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{it.lastCost ? rupiah(it.lastCost) : "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada barang/jasa.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
