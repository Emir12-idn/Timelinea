import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { ImportExportBar } from "../components/ImportExport";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";

function NewPartnerForm({ defaultType, onClose, onCreated }) {
  const [form, setForm] = useState({ code: "", name: "", type: defaultType, npwp: "", address: "", phone: "", email: "", termDays: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/partners", {
        ...form,
        termDays: form.termDays ? Number(form.termDays) : undefined,
        npwp: form.npwp || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
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
        <div className="text-sm font-semibold text-slate-700">Mitra Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Kode"><input required value={form.code} onChange={set("code")} className={inputCls} /></Field>
        <Field label="Nama"><input required value={form.name} onChange={set("name")} className={inputCls} /></Field>
        <Field label="Tipe">
          <select value={form.type} onChange={set("type")} className={selectCls}>
            <option value="customer">Pelanggan</option>
            <option value="supplier">Pemasok</option>
            <option value="both">Keduanya</option>
          </select>
        </Field>
        <Field label="Termin (hari)"><input type="number" min="0" value={form.termDays} onChange={set("termDays")} className={inputCls} /></Field>
        <Field label="NPWP"><input value={form.npwp} onChange={set("npwp")} className={inputCls} /></Field>
        <Field label="Telepon"><input value={form.phone} onChange={set("phone")} className={inputCls} /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set("email")} className={inputCls} /></Field>
        <Field label="Alamat"><input value={form.address} onChange={set("address")} className={inputCls} /></Field>
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

const TYPE_LABEL = { customer: "Pelanggan", supplier: "Pemasok", both: "Keduanya" };

/**
 * Satu komponen dipakai untuk menu "Pemasok" dan "Pelanggan" (§11 data design,
 * item 4) — dibedakan lewat prop `type`, mengikuti pola filter yang sudah dipakai
 * halaman lain (mis. POList memfilter /partners?type=supplier).
 */
export default function Mitra({ type, title, crumbs }) {
  const partners = useApi(`/partners?type=${type}`);
  const [showForm, setShowForm] = useState(false);

  if (partners.loading) return <Spinner />;
  const rows = partners.data || [];

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={title}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ImportExportBar
              exportPath={`/partners/export/csv?type=${type}`}
              exportFilename={`${type}.csv`}
              importPath="/partners/import"
              onImported={partners.reload}
            />
            <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
              <Plus size={16} /> Mitra Baru
            </button>
          </div>
        }
      />
      <ErrorBanner message={partners.error} />
      {showForm && <NewPartnerForm defaultType={type} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); partners.reload(); }} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">NPWP</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3 text-right">Termin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-medium text-blue-800">{p.code}</td>
                  <td className="px-4 py-3 text-slate-700">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[p.type] ?? p.type}</td>
                  <td className="px-4 py-3 text-slate-500">{p.npwp || "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.phone || "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.termDays ? `${p.termDays} hari` : "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada mitra.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
