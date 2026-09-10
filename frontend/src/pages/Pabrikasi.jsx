import { useState } from "react";
import { Plus, X, Trash2, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

function NewBomForm({ items, onClose, onCreated }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [lines, setLines] = useState([{ materialItemId: items[0]?.id ?? "", qtyPerUnit: 1, uom: items[0]?.uom ?? "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { materialItemId: items[0]?.id ?? "", qtyPerUnit: 1, uom: "" }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/boms", {
        itemId: Number(itemId),
        lines: lines.map((l) => ({ materialItemId: Number(l.materialItemId), qtyPerUnit: Number(l.qtyPerUnit), uom: l.uom })),
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
        <div className="text-sm font-semibold text-slate-700">BOM Baru (Resep Produksi)</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <Field label="Barang Jadi (Produk)">
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={selectCls}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
          </select>
        </Field>
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500">Bahan Baku (per 1 unit produk)</div>
          {lines.map((l, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <select value={l.materialItemId} onChange={(e) => updateLine(i, { materialItemId: e.target.value })} className={selectCls}>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                </select>
              </div>
              <input type="number" min="0.0001" step="0.0001" value={l.qtyPerUnit} onChange={(e) => updateLine(i, { qtyPerUnit: e.target.value })} className={`${inputCls} w-28`} placeholder="Qty/unit" />
              <input value={l.uom} onChange={(e) => updateLine(i, { uom: e.target.value })} className={`${inputCls} w-20`} placeholder="Satuan" />
              <button type="button" onClick={() => removeLine(i)} className="rounded p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-xs font-medium text-blue-800 hover:underline">+ Tambah bahan</button>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan BOM"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function NewWorkOrderForm({ items, boms, warehouses, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productItemId, setProductItemId] = useState(boms[0]?.itemId ?? "");
  const bomsForProduct = boms.filter((b) => String(b.itemId) === String(productItemId) && b.isActive);
  const [bomId, setBomId] = useState(bomsForProduct[0]?.id ?? "");
  const [plannedQty, setPlannedQty] = useState(1);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [conversionCost, setConversionCost] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onProductChange = (val) => {
    setProductItemId(val);
    const opts = boms.filter((b) => String(b.itemId) === String(val) && b.isActive);
    setBomId(opts[0]?.id ?? "");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!bomId) { setError("Barang ini belum punya BOM aktif"); return; }
    setSaving(true);
    try {
      await api.post("/work-orders", {
        date,
        productItemId: Number(productItemId),
        bomId: Number(bomId),
        plannedQty: Number(plannedQty),
        warehouseId: Number(warehouseId),
        conversionCost: Number(conversionCost || 0),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const productOptions = [...new Map(boms.map((b) => [b.itemId, b.item])).values()];

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Perintah Produksi (Work Order) Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Barang Jadi (Produk)">
            <select value={productItemId} onChange={(e) => onProductChange(e.target.value)} className={selectCls}>
              {productOptions.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
            </select>
          </Field>
          <Field label="BOM Aktif">
            <select value={bomId} onChange={(e) => setBomId(e.target.value)} className={selectCls}>
              {bomsForProduct.map((b) => <option key={b.id} value={b.id}>Versi {b.version}</option>)}
              {bomsForProduct.length === 0 && <option value="">— tidak ada BOM aktif —</option>}
            </select>
          </Field>
          <Field label="Qty Rencana Produksi">
            <input type="number" min="0.001" step="0.001" required value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Gudang">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </Field>
          <Field label="Biaya Konversi (opsional)">
            <input type="number" min="0" value={conversionCost} onChange={(e) => setConversionCost(e.target.value)} className={inputCls} placeholder="tenaga kerja/overhead" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Work Order"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function WorkOrderRow({ wo, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setStatus = async (status) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/work-orders/${wo.id}/status`, { status });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2.5 font-medium text-blue-800">{wo.no}</td>
      <td className="px-4 py-2.5 text-slate-600">{dateID(wo.date)}</td>
      <td className="px-4 py-2.5 text-slate-700">{wo.productItem.code} — {wo.productItem.name}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">{wo.plannedQty}</td>
      <td className="px-4 py-2.5 text-slate-500">{wo.warehouse.name}</td>
      <td className="px-4 py-2.5"><Badge status={wo.status} /></td>
      <td className="px-4 py-2.5">
        {(wo.status === "draft" || wo.status === "in_progress") && (
          <div className="flex items-center gap-1.5">
            {wo.status === "draft" && (
              <button disabled={busy} onClick={() => setStatus("in_progress")} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                <PlayCircle size={13} /> Mulai
              </button>
            )}
            <button disabled={busy} onClick={() => setStatus("done")} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50">
              <CheckCircle2 size={13} /> Selesai
            </button>
            <button disabled={busy} onClick={() => setStatus("cancelled")} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50">
              <XCircle size={13} /> Batal
            </button>
          </div>
        )}
        {error && <div className="mt-1 text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  );
}

export default function Pabrikasi() {
  const items = useApi("/items");
  const boms = useApi("/boms");
  const warehouses = useApi("/warehouses");
  const workOrders = useApi("/work-orders");
  const [showBomForm, setShowBomForm] = useState(false);
  const [showWoForm, setShowWoForm] = useState(false);

  const stockItems = (items.data || []).filter((i) => i.type === "stock");

  const reloadAll = () => {
    boms.reload();
    workOrders.reload();
  };

  return (
    <>
      <PageHeader
        crumbs={["Pabrikasi", "BOM & Work Order"]}
        title="Pabrikasi / Produksi"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowBomForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100">
              <Plus size={16} /> BOM
            </button>
            <button onClick={() => setShowWoForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
              <Plus size={16} /> Work Order
            </button>
          </div>
        }
      />
      <ErrorBanner message={items.error || boms.error || warehouses.error || workOrders.error} />

      {showBomForm && (
        <NewBomForm items={stockItems} onClose={() => setShowBomForm(false)} onCreated={() => { setShowBomForm(false); reloadAll(); }} />
      )}
      {showWoForm && (boms.data || []).length > 0 && (warehouses.data || []).length > 0 && (
        <NewWorkOrderForm
          items={stockItems}
          boms={boms.data}
          warehouses={warehouses.data}
          onClose={() => setShowWoForm(false)}
          onCreated={() => { setShowWoForm(false); reloadAll(); }}
        />
      )}

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Perintah Produksi (Work Order)</div>
        {workOrders.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">No</th><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Produk</th>
                  <th className="px-4 py-2 text-right">Qty Rencana</th><th className="px-4 py-2">Gudang</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(workOrders.data || []).map((wo) => <WorkOrderRow key={wo.id} wo={wo} onChanged={reloadAll} />)}
                {(workOrders.data || []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada Work Order.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Bill of Material (BOM)</div>
        {boms.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Produk</th><th className="px-4 py-2">Versi</th><th className="px-4 py-2">Bahan</th><th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(boms.data || []).map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{b.item.code} — {b.item.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">v{b.version}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.lines.map((l) => `${l.materialItem.code} × ${l.qtyPerUnit}`).join(", ")}</td>
                    <td className="px-4 py-2.5">
                      {b.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">Nonaktif</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(boms.data || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada BOM.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
