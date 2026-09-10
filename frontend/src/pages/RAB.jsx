import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah } from "../lib/format";

function RabEditor({ projectId, initialLines, onSaved }) {
  const [lines, setLines] = useState(initialLines.length ? initialLines : [{ category: "", description: "", plannedAmount: 0 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { category: "", description: "", plannedAmount: 0 }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const total = lines.reduce((sum, l) => sum + Number(l.plannedAmount || 0), 0);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.post("/project-budgets", {
        projectId: Number(projectId),
        lines: lines
          .filter((l) => l.description)
          .map((l) => ({ category: l.category || undefined, description: l.description, plannedAmount: Number(l.plannedAmount || 0) })),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">RAB (Rencana Anggaran Biaya)</div>
      <ErrorBanner message={error} />
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="flex items-end gap-2">
            <input value={l.category || ""} onChange={(e) => updateLine(i, { category: e.target.value })} className={`${inputCls} w-32`} placeholder="Kategori" />
            <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} className={`${inputCls} flex-1`} placeholder="Deskripsi" />
            <input type="number" min="0" value={l.plannedAmount} onChange={(e) => updateLine(i, { plannedAmount: e.target.value })} className={`${inputCls} w-40`} placeholder="Jumlah (Rp)" />
            <button type="button" onClick={() => removeLine(i)} className="rounded p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
          </div>
        ))}
        <button type="button" onClick={addLine} className="text-xs font-medium text-blue-800 hover:underline">+ Tambah baris</button>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="text-sm font-semibold text-slate-700">Total RAB: {rupiah(total)}</div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
          <Save size={15} /> {saving ? "Menyimpan…" : "Simpan RAB"}
        </button>
      </div>
    </Card>
  );
}

export default function RAB() {
  const projects = useApi("/projects");
  const [projectId, setProjectId] = useState("");
  const effectiveProjectId = projectId || projects.data?.[0]?.id || "";
  const realization = useApi(effectiveProjectId ? `/project-budgets/${effectiveProjectId}/realization` : null);

  return (
    <>
      <PageHeader crumbs={["Proyek", "RAB & Realisasi Biaya"]} title="RAB (Rencana Anggaran Biaya)" />
      <ErrorBanner message={projects.error} />

      <div className="mb-4 max-w-sm">
        <Field label="Proyek">
          <select value={effectiveProjectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
            {(projects.data || []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </Field>
      </div>

      {effectiveProjectId && (realization.loading ? <Spinner /> : realization.data && (
        <>
          <RabEditor projectId={effectiveProjectId} initialLines={realization.data.lines} onSaved={() => realization.reload()} />

          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Realisasi Biaya Proyek</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Total RAB (Rencana)</div>
                <div className="mt-1 text-lg font-bold text-slate-800">{rupiah(realization.data.plannedTotal)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Realisasi Biaya (Aktual)</div>
                <div className="mt-1 text-lg font-bold text-slate-800">{rupiah(realization.data.actual.total)}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Pembelian {rupiah(realization.data.actual.purchaseCost)} · Bahan {rupiah(realization.data.actual.materialCost)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Selisih (Sisa Anggaran)</div>
                <div className={`mt-1 text-lg font-bold ${Number(realization.data.variance) < 0 ? "text-rose-700" : "text-green-700"}`}>
                  {rupiah(realization.data.variance)}
                </div>
              </div>
            </div>
          </Card>
        </>
      ))}
    </>
  );
}
