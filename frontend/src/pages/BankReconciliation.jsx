import { useState } from "react";
import { Plus, X, Link2 } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

const BANK_ACCOUNT_CODES = ["1-1100", "1-1200"];

function NewStatementLineForm({ accountId, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/bank-statement-lines", { accountId: Number(accountId), date, description, amount: Number(amount) });
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
        <div className="text-sm font-semibold text-slate-700">Baris Rekening Koran Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Keterangan">
            <input required value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="sesuai teks di rekening koran" />
          </Field>
          <Field label="Jumlah (+ masuk / − keluar)">
            <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="mis. 1000000 atau -50000" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Baris"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function MatchRow({ line, candidates, onMatched }) {
  const [candidateId, setCandidateId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!candidateId) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/bank-statement-lines/${line.id}/match`, { cashTransactionId: Number(candidateId) });
      onMatched();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2.5 text-slate-600">{dateID(line.date)}</td>
      <td className="px-4 py-2.5 text-slate-700">{line.description}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(line.amount) >= 0 ? "text-green-700" : "text-rose-700"}`}>
        {rupiah(line.amount)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={selectCls}>
            <option value="">— pilih transaksi —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.no} · {c.type === "receipt" ? "+" : "-"}{rupiah(c.amount)} · {c.partner?.name || "-"}
              </option>
            ))}
          </select>
          <button
            disabled={!candidateId || busy}
            onClick={confirm}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
          >
            <Link2 size={13} /> Cocokkan
          </button>
        </div>
        {error && <div className="mt-1 text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  );
}

export default function BankReconciliation() {
  const accounts = useApi("/accounts");
  const bankAccounts = (accounts.data || []).filter((a) => BANK_ACCOUNT_CODES.includes(a.code));
  const [accountId, setAccountId] = useState("");
  const effectiveAccountId = accountId || bankAccounts[0]?.id || "";
  const [showForm, setShowForm] = useState(false);

  const summary = useApi(effectiveAccountId ? `/bank-statement-lines/summary?accountId=${effectiveAccountId}` : null);

  return (
    <>
      <PageHeader
        crumbs={["Kas & Bank", "Rekonsiliasi Bank"]}
        title="Rekonsiliasi Bank"
        actions={
          effectiveAccountId && (
            <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
              <Plus size={16} /> Baris Rekening Koran
            </button>
          )
        }
      />
      <ErrorBanner message={accounts.error || summary.error} />

      <div className="mb-4 max-w-xs">
        <Field label="Akun Kas/Bank">
          <select value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls}>
            {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </Field>
      </div>

      {showForm && effectiveAccountId && (
        <NewStatementLineForm
          accountId={effectiveAccountId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            summary.reload();
          }}
        />
      )}

      {summary.loading ? (
        <Spinner />
      ) : summary.data && (
        <>
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Saldo Buku (Jurnal) — {summary.data.account.name}</div>
              <div className="text-lg font-bold tabular-nums text-slate-800">{rupiah(summary.data.bookBalance)}</div>
            </div>
          </Card>

          <Card className="mb-4 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Belum Cocok di Rekening Koran ({summary.data.unmatchedStatementLines.length})
              <span className="ml-2 font-normal text-slate-400">— tercatat di bank, belum ada transaksi kas/bank yang cocok</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Keterangan</th>
                    <th className="px-4 py-2 text-right">Jumlah</th><th className="px-4 py-2">Cocokkan dengan</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.unmatchedStatementLines.map((line) => (
                    <MatchRow key={line.id} line={line} candidates={summary.data.unmatchedBookTransactions} onMatched={summary.reload} />
                  ))}
                  {summary.data.unmatchedStatementLines.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Semua baris rekening koran sudah cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Belum Cocok di Sistem ({summary.data.unmatchedBookTransactions.length})
              <span className="ml-2 font-normal text-slate-400">— sudah dicatat di sistem, belum kelihatan di rekening koran</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-2">No</th><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Mitra</th>
                    <th className="px-4 py-2 text-right">Jumlah</th><th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.unmatchedBookTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-blue-800">{tx.no}</td>
                      <td className="px-4 py-2.5 text-slate-600">{dateID(tx.date)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{tx.partner?.name || "-"}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${tx.type === "receipt" ? "text-green-700" : "text-rose-700"}`}>
                        {tx.type === "receipt" ? "+" : "-"}{rupiah(tx.amount)}
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  ))}
                  {summary.data.unmatchedBookTransactions.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Semua transaksi kas/bank sudah cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
