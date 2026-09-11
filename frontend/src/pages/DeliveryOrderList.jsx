import { useState } from "react";
import { Plus, Printer, Trash2, X } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api, fetchPdfObjectUrl } from "../api/client";
import { dateID } from "../lib/format";

/**
 * §13 data design — Surat Jalan (Delivery Order) sebelumnya sama sekali
 * tidak punya halaman/form di frontend (menu "Surat Jalan" jatuh ke
 * Placeholder), padahal backend-nya (`POST /delivery-orders`) sudah lengkap
 * sejak Persediaan §1: terima `warehouseId` opsional (default gudang utama
 * kalau kosong — CostingService.getDefaultWarehouseId), stock-out per baris
 * lewat CostingService, dan posting HPP otomatis. Form ini pola gabungan
 * NewInvoiceForm (editor baris: pilih barang + qty) dan NewPurchaseInvoiceForm
 * (pemilih gudang dari GET /warehouses) — beda dari Faktur Pembelian, baris
 * Surat Jalan TIDAK auto-derive dari SO di backend (skema `delivery_order_line`
 * berdiri sendiri, lihat §3 data design), jadi tombol "Isi dari SO" di sini
 * cuma PRE-FILL baris di form (kenyamanan UI), bukan sumber kebenaran.
 */
function PrintDoButton({ id }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const openPdf = async () => {
    setBusy(true);
    setError("");
    try {
      const url = await fetchPdfObjectUrl(`/delivery-orders/${id}/print`);
      window.open(url, "_blank");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={openPdf}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        <Printer size={13} /> {busy ? "…" : "PDF"}
      </button>
      {error && <div className="max-w-[10rem] text-right text-[10px] text-rose-600">{error}</div>}
    </div>
  );
}

function NewDeliveryOrderForm({ salesOrders, items, warehouses, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [soId, setSoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? "", qty: 1 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: items[0]?.id ?? "", qty: 1 }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const usableSOs = salesOrders.filter((so) => so.status !== "cancelled");

  const onPickSo = (value) => {
    setSoId(value);
    const so = usableSOs.find((s) => String(s.id) === String(value));
    if (so && (so.lines || []).length > 0) {
      setLines(so.lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty) })));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/delivery-orders", {
        date,
        soId: soId ? Number(soId) : undefined,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        lines: lines.map((l) => ({ itemId: Number(l.itemId), qty: Number(l.qty) })),
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
        <div className="text-sm font-semibold text-slate-700">Surat Jalan Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tautkan ke SO (opsional — isi baris otomatis dari SO)">
            <select value={soId} onChange={(e) => onPickSo(e.target.value)} className={selectCls}>
              <option value="">— Tanpa SO —</option>
              {usableSOs.map((so) => <option key={so.id} value={so.id}>{so.no} — {so.customer?.name}</option>)}
            </select>
          </Field>
          <Field label="Gudang pengiriman (opsional — default gudang utama)">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
              <option value="">— Gudang default —</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-3 py-2">Barang</th>
                  <th className="px-3 py-2 w-28">Qty</th>
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
            {saving ? "Menyimpan…" : "Simpan Surat Jalan"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function DeliveryOrderList() {
  const dos = useApi("/delivery-orders");
  const salesOrders = useApi("/sales-orders");
  const items = useApi("/items");
  const warehouses = useApi("/warehouses");
  const [showForm, setShowForm] = useState(false);

  const ready = !salesOrders.loading && !items.loading && !warehouses.loading;

  return (
    <>
      <PageHeader
        crumbs={["Penjualan", "Surat Jalan"]}
        title="Surat Jalan"
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
            <Plus size={16} /> Surat Jalan Baru
          </button>
        }
      />
      <ErrorBanner message={dos.error || salesOrders.error || items.error || warehouses.error} />

      {showForm && ready && (
        <NewDeliveryOrderForm
          salesOrders={salesOrders.data || []}
          items={items.data || []}
          warehouses={warehouses.data || []}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            dos.reload();
          }}
        />
      )}

      {dos.loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">No Surat Jalan</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">No SO</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Baris</th>
                  <th className="px-4 py-3 text-right">Cetak</th>
                </tr>
              </thead>
              <tbody>
                {(dos.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-800">{r.no}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.so?.customer?.name || r.project?.customer?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{r.so?.no || "-"}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{(r.lines || []).length}</td>
                    <td className="px-4 py-3 text-right"><PrintDoButton id={r.id} /></td>
                  </tr>
                ))}
                {(dos.data || []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada Surat Jalan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
