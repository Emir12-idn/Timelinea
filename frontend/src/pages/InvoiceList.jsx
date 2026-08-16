import { useState } from "react";
import { Plus, Trash2, X, ChevronLeft, Printer } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api, fetchPdfObjectUrl } from "../api/client";
import { rupiah, dateID } from "../lib/format";

function NewInvoiceForm({ customers, items, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [poRef, setPoRef] = useState("");
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? "", name: items[0]?.name ?? "", uom: items[0]?.uom ?? "PCS", qty: 1, unitPrice: 0, poRef: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const onPickItem = (i, itemId) => {
    const it = items.find((x) => String(x.id) === String(itemId));
    updateLine(i, { itemId, name: it?.name ?? "", uom: it?.uom ?? "PCS" });
  };
  const addLine = () => setLines((ls) => [...ls, { itemId: items[0]?.id ?? "", name: items[0]?.name ?? "", uom: items[0]?.uom ?? "PCS", qty: 1, unitPrice: 0, poRef: "" }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const dpp = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);
  const ppn = Math.round(dpp * 0.11);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/sales-invoices", {
        date,
        customerId: Number(customerId),
        poRef: poRef || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId ? Number(l.itemId) : undefined,
          name: l.name,
          uom: l.uom,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          poRef: l.poRef || undefined,
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
        <div className="text-sm font-semibold text-slate-700">Faktur Penjualan Baru</div>
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
          <Field label="No PO default (opsional)">
            <input value={poRef} onChange={(e) => setPoRef(e.target.value)} className={inputCls} placeholder="dipakai kalau baris tidak isi No PO sendiri" />
          </Field>
        </div>

        <div className="rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">Barang</th>
                <th className="px-3 py-2 w-24">Qty</th>
                <th className="px-3 py-2 w-24">Unit</th>
                <th className="px-3 py-2 w-32">No PO</th>
                <th className="px-3 py-2 w-40">Harga Satuan</th>
                <th className="px-3 py-2 w-32 text-right">Jumlah</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <select value={l.itemId} onChange={(e) => onPickItem(i, e.target.value)} className={selectCls}>
                      {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="any" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.uom} onChange={(e) => updateLine(i, { uom: e.target.value })} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.poRef} onChange={(e) => updateLine(i, { poRef: e.target.value })} className={inputCls} placeholder={poRef || "-"} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} className={inputCls} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{rupiah(Number(l.qty || 0) * Number(l.unitPrice || 0))}</td>
                  <td className="px-3 py-2 text-right">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
              <Plus size={14} /> Tambah baris
            </button>
            <div className="text-right text-sm text-slate-600">
              <div>Subtotal: {rupiah(dpp)}</div>
              <div>PPN 11%: {rupiah(ppn)}</div>
              <div className="font-semibold text-slate-800">Total: {rupiah(dpp + ppn)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Faktur"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function PrintButton({ path, filename }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const openPdf = async () => {
    setBusy(true);
    setError("");
    try {
      const url = await fetchPdfObjectUrl(path);
      window.open(url, "_blank");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={openPdf} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60">
        <Printer size={16} /> {busy ? "Membuat PDF…" : "PDF / Cetak"}
      </button>
      {error && <div className="max-w-xs text-right text-xs text-rose-600">{error}</div>}
    </div>
  );
}

function InvoiceDetail({ id, onBack }) {
  const inv = useApi(`/sales-invoices/${id}`);
  if (inv.loading) return <Spinner />;
  if (inv.error) return <ErrorBanner message={inv.error} />;
  const d = inv.data;

  return (
    <>
      <PageHeader
        crumbs={["Penjualan", "Faktur Penjualan", "Detail"]}
        title={`Faktur ${d.no}`}
        actions={
          <div className="flex gap-2">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <ChevronLeft size={16} /> Kembali
            </button>
            <PrintButton path={`/sales-invoices/${id}/print`} />
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-slate-500">Status</dt><dd className="col-span-2"><Badge status={d.status} /></dd>
            <dt className="text-slate-500">Pelanggan</dt><dd className="col-span-2 font-medium text-slate-700">{d.customer?.name}</dd>
            <dt className="text-slate-500">No PO</dt><dd className="col-span-2 text-slate-700">{d.poRef || "-"}</dd>
            <dt className="text-slate-500">Tanggal</dt><dd className="col-span-2 text-slate-700">{dateID(d.date)}</dd>
          </dl>
        </Card>
        <Card className="p-4">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Subtotal</dt><dd className="text-right font-medium tabular-nums text-slate-700">{rupiah(d.dpp)}</dd>
            <dt className="text-slate-500">PPN 11%</dt><dd className="text-right font-medium tabular-nums text-slate-700">{rupiah(d.ppn)}</dd>
            {Number(d.pph) > 0 && (
              <>
                <dt className="text-slate-500">PPh (dipotong pembeli)</dt>
                <dd className="text-right font-medium tabular-nums text-slate-700">{rupiah(d.pph)}</dd>
              </>
            )}
            <dt className="border-t border-slate-100 pt-2 font-semibold text-slate-700">Total</dt>
            <dd className="border-t border-slate-100 pt-2 text-right text-base font-bold tabular-nums text-blue-900">{rupiah(d.total)}</dd>
          </dl>
        </Card>
      </div>

      {d.lines?.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Rincian Item</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Part No</th><th className="px-4 py-2">No PO</th><th className="px-4 py-2">Nama Barang</th>
                  <th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">Harga</th><th className="px-4 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-500">{it.partNo || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{it.poRef || d.poRef || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{it.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{it.qty}</td>
                    <td className="px-4 py-2.5 text-slate-500">{it.uom}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{rupiah(it.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-700">{rupiah(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function InvoiceList() {
  const inv = useApi("/sales-invoices");
  const customers = useApi("/partners?type=customer");
  const items = useApi("/items");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  if (selected) return <InvoiceDetail id={selected} onBack={() => { setSelected(null); inv.reload(); }} />;

  const ready = !customers.loading && !items.loading;

  return (
    <>
      <PageHeader
        crumbs={["Penjualan", "Faktur Penjualan"]}
        title="Faktur Penjualan"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Plus size={16} /> Faktur Baru
          </button>
        }
      />
      <ErrorBanner message={inv.error || customers.error || items.error} />

      {showForm && ready && (
        <NewInvoiceForm
          customers={customers.data}
          items={items.data}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            inv.reload();
          }}
        />
      )}

      {inv.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No Faktur</th><th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">No PO</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(inv.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-800">{r.no}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.customer?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.poRef || "-"}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(r.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(r.id)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100">
                        Lihat
                      </button>
                    </td>
                  </tr>
                ))}
                {(inv.data || []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada faktur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
