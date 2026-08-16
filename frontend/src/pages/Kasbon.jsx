import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { rupiah, dateID } from "../lib/format";

function NewKasbonForm({ onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/cash-advances", { date, amount: Number(amount), reason });
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
        <div className="text-sm font-semibold text-slate-700">Pengajuan Kasbon Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Jumlah">
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Alasan">
          <input required value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="mis. biaya operasional proyek" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Mengirim…" : "Ajukan Kasbon"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function DecisionButtons({ row, canDecideTier1, canDecideFinal, onDecided }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (path, decision) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/cash-advances/${row.id}/${path}`, { decision });
      onDecided();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const showTier1 = row.status === "pending" && canDecideTier1;
  const showFinal = row.status === "tier1_approved" && canDecideFinal;

  if (!showTier1 && !showFinal) return <span className="text-xs text-slate-300">—</span>;

  const path = showTier1 ? "tier1-decision" : "decision";
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          disabled={busy}
          onClick={() => decide(path, "approved")}
          className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          {showTier1 ? "Setujui (Atasan)" : "Setujui (HRD)"}
        </button>
        <button
          disabled={busy}
          onClick={() => decide(path, "rejected")}
          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          Tolak
        </button>
      </div>
      {error && <div className="max-w-[12rem] text-right text-[10px] text-rose-600">{error}</div>}
    </div>
  );
}

const STATUS_LABEL = {
  pending: "Menunggu Atasan",
  tier1_approved: "Menunggu HRD",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export default function Kasbon() {
  const { user } = useAuth();
  const list = useApi("/cash-advances");
  const [showForm, setShowForm] = useState(false);

  const canDecideTier1 = user?.role === "admin" || user?.role === "pic_proyek";
  const canDecideFinal = user?.role === "admin" || user?.role === "hrd_keuangan";

  return (
    <>
      <PageHeader
        crumbs={["Absensi & Gaji", "Kasbon"]}
        title="Kasbon"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Ajukan Kasbon
          </button>
        }
      />
      <ErrorBanner message={list.error} />

      {showForm && (
        <NewKasbonForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            list.reload();
          }}
        />
      )}

      {list.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Karyawan</th><th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Alasan</th><th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(list.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 text-slate-700">{r.employee?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.reason}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(r.amount)}</td>
                    <td className="px-4 py-3"><Badge status={STATUS_LABEL[r.status] || r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <DecisionButtons row={r} canDecideTier1={canDecideTier1} canDecideFinal={canDecideFinal} onDecided={list.reload} />
                    </td>
                  </tr>
                ))}
                {(list.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada pengajuan kasbon.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
