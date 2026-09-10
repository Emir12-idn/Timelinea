import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah } from "../lib/format";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SetBudgetForm({ accounts, period, onClose, onSaved }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/budgets", { accountId: Number(accountId), period, amount: Number(amount) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Atur Anggaran — {period}</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Akun">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </Field>
          <Field label="Jumlah Anggaran (Rp)">
            <input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Anggaran"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function Anggaran() {
  const [period, setPeriod] = useState(currentPeriod());
  const [showForm, setShowForm] = useState(false);
  const accounts = useApi("/accounts");
  const monitor = useApi(`/budgets/monitor?period=${period}`);

  return (
    <>
      <PageHeader
        crumbs={["Buku Besar", "Monitor Anggaran"]}
        title="Anggaran & Monitor Anggaran"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Atur Anggaran
          </button>
        }
      />
      <ErrorBanner message={accounts.error || monitor.error} />

      <div className="mb-4 max-w-xs">
        <Field label="Periode">
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {showForm && (
        <SetBudgetForm
          accounts={accounts.data || []}
          period={period}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); monitor.reload(); }}
        />
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Monitor Anggaran — {period}</div>
        {monitor.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Akun</th>
                  <th className="px-4 py-2 text-right">Anggaran</th>
                  <th className="px-4 py-2 text-right">Realisasi</th>
                  <th className="px-4 py-2 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {(monitor.data || []).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{row.accountCode} — {row.accountName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{rupiah(row.budget)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{rupiah(row.actual)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(row.variance) < 0 ? "text-rose-700" : "text-green-700"}`}>
                      {rupiah(row.variance)}
                    </td>
                  </tr>
                ))}
                {(monitor.data || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada anggaran untuk periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
