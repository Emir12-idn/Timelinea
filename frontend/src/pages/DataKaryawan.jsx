import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

const STATUS_LABEL = { tetap: "Tetap", harian: "Harian", kontrak: "Kontrak" };

function NewEmployeeForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ nik: "", name: "", position: "", employmentStatus: "tetap", baseSalary: "", joinDate: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/employees", { ...form, baseSalary: Number(form.baseSalary) });
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
        <div className="text-sm font-semibold text-slate-700">Karyawan Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="NIK"><input required value={form.nik} onChange={set("nik")} className={inputCls} /></Field>
        <Field label="Nama"><input required value={form.name} onChange={set("name")} className={inputCls} /></Field>
        <Field label="Jabatan"><input required value={form.position} onChange={set("position")} className={inputCls} /></Field>
        <Field label="Status">
          <select value={form.employmentStatus} onChange={set("employmentStatus")} className={selectCls}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Gaji Pokok"><input type="number" min="0" required value={form.baseSalary} onChange={set("baseSalary")} className={inputCls} /></Field>
        <Field label="Tanggal Masuk"><input type="date" required value={form.joinDate} onChange={set("joinDate")} className={inputCls} /></Field>
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

export default function DataKaryawan() {
  const emp = useApi("/employees");
  const [showForm, setShowForm] = useState(false);

  if (emp.loading) return <Spinner />;
  const rows = emp.data || [];
  const sum = (k) => rows.reduce((a, p) => a + Number(p[k]), 0);

  return (
    <>
      <PageHeader
        crumbs={["Absensi & Gaji", "Data Karyawan"]}
        title="Data Karyawan"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Karyawan Baru
          </button>
        }
      />
      <ErrorBanner message={emp.error} />
      {showForm && <NewEmployeeForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); emp.reload(); }} />}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4"><div className="text-xs text-slate-500">Jumlah Karyawan</div><div className="mt-1 text-2xl font-bold text-slate-800">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Total Gaji Pokok</div><div className="mt-1 text-xl font-bold text-blue-900">{rupiah(sum("baseSalary"))}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">NIK</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Tgl Masuk</th>
                <th className="px-4 py-3 text-right">Gaji Pokok</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 text-slate-500">{p.nik}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.position}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${p.employmentStatus === "tetap" ? "bg-blue-50 text-blue-700 ring-blue-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                      {STATUS_LABEL[p.employmentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{dateID(p.joinDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiah(p.baseSalary)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada karyawan.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
