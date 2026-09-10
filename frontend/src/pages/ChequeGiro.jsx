import { useState } from "react";
import { Plus, X, CheckCircle2, XCircle } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

const BANK_ACCOUNT_CODES = ["1-1100", "1-1200"];

function NewChequeGiroForm({ accounts, partners, salesInvoices, purchaseInvoices, onClose, onCreated }) {
  const [type, setType] = useState("giro");
  const [direction, setDirection] = useState("outgoing");
  const [bankAccount, setBankAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [partnerId, setPartnerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const invoiceOptions = direction === "incoming" ? salesInvoices : purchaseInvoices;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!invoiceId) { setError(direction === "incoming" ? "Pilih faktur penjualan yang dilunasi" : "Pilih faktur pembelian yang dilunasi"); return; }
    setSaving(true);
    try {
      await api.post("/cheque-giros", {
        type,
        direction,
        bankAccount,
        amount: Number(amount),
        dueDate,
        accountId: Number(accountId),
        partnerId: partnerId ? Number(partnerId) : undefined,
        salesInvoiceId: direction === "incoming" ? Number(invoiceId) : undefined,
        purchaseInvoiceId: direction === "outgoing" ? Number(invoiceId) : undefined,
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
        <div className="text-sm font-semibold text-slate-700">Cek/Giro Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Jenis">
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
              <option value="cek">Cek</option>
              <option value="giro">Giro</option>
            </select>
          </Field>
          <Field label="Arah">
            <select value={direction} onChange={(e) => { setDirection(e.target.value); setInvoiceId(""); }} className={selectCls}>
              <option value="incoming">Masuk (dari pelanggan)</option>
              <option value="outgoing">Keluar (ke pemasok)</option>
            </select>
          </Field>
          <Field label={direction === "incoming" ? "Faktur Penjualan" : "Faktur Pembelian"}>
            <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className={selectCls}>
              <option value="">— pilih —</option>
              {invoiceOptions.map((inv) => <option key={inv.id} value={inv.id}>{inv.no} · {rupiah(inv.total)}</option>)}
            </select>
          </Field>
          <Field label="Bank / No Rekening (fisik)">
            <input required value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputCls} placeholder="mis. BCA 123-456" />
          </Field>
          <Field label="Jumlah (Rp)">
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Jatuh Tempo">
            <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Akun Kas/Bank (saat cair)">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </Field>
          <Field label="Mitra (opsional)">
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={selectCls}>
              <option value="">—</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Cek/Giro"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function ChequeGiroRow({ cg, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const act = async (action) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/cheque-giros/${cg.id}/${action}`, {});
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2.5 font-medium text-blue-800">{cg.no}</td>
      <td className="px-4 py-2.5 text-slate-600">{cg.type === "cek" ? "Cek" : "Giro"}</td>
      <td className="px-4 py-2.5 text-slate-600">{cg.direction === "incoming" ? "Masuk" : "Keluar"}</td>
      <td className="px-4 py-2.5 text-slate-700">{cg.partner?.name || "-"}</td>
      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{rupiah(cg.amount)}</td>
      <td className="px-4 py-2.5 text-slate-600">{dateID(cg.dueDate)}</td>
      <td className="px-4 py-2.5"><Badge status={cg.status} /></td>
      <td className="px-4 py-2.5">
        {cg.status === "pending" && (
          <div className="flex items-center gap-1.5">
            <button disabled={busy} onClick={() => act("clear")} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50">
              <CheckCircle2 size={13} /> Cair
            </button>
            <button disabled={busy} onClick={() => act("bounce")} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50">
              <XCircle size={13} /> Tolak
            </button>
          </div>
        )}
        {error && <div className="mt-1 text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  );
}

export default function ChequeGiro() {
  const chequeGiros = useApi("/cheque-giros");
  const accountsApi = useApi("/accounts");
  const partners = useApi("/partners");
  const salesInvoicesApi = useApi("/sales-invoices");
  const purchaseInvoicesApi = useApi("/purchase-invoices");
  const [showForm, setShowForm] = useState(false);

  const bankAccounts = (accountsApi.data || []).filter((a) => BANK_ACCOUNT_CODES.includes(a.code));
  const openSalesInvoices = (salesInvoicesApi.data || []).filter((i) => i.status !== "paid");
  const openPurchaseInvoices = (purchaseInvoicesApi.data || []).filter((i) => i.status !== "paid");

  return (
    <>
      <PageHeader
        crumbs={["Kas & Bank", "Cek/Giro"]}
        title="Cek / Giro"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Cek/Giro
          </button>
        }
      />
      <ErrorBanner message={chequeGiros.error || accountsApi.error || partners.error} />

      {showForm && (
        <NewChequeGiroForm
          accounts={bankAccounts}
          partners={partners.data || []}
          salesInvoices={openSalesInvoices}
          purchaseInvoices={openPurchaseInvoices}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); chequeGiros.reload(); }}
        />
      )}

      <Card className="overflow-hidden">
        {chequeGiros.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">No</th><th className="px-4 py-2">Jenis</th><th className="px-4 py-2">Arah</th>
                  <th className="px-4 py-2">Mitra</th><th className="px-4 py-2 text-right">Jumlah</th>
                  <th className="px-4 py-2">Jatuh Tempo</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(chequeGiros.data || []).map((cg) => <ChequeGiroRow key={cg.id} cg={cg} onChanged={chequeGiros.reload} />)}
                {(chequeGiros.data || []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada Cek/Giro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
