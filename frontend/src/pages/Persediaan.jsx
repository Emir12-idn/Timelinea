import { useState } from "react";
import { Plus, X, ArrowRightLeft, Warehouse as WarehouseIcon } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { ImportExportBar } from "../components/ImportExport";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";

function NewWarehouseForm({ onClose, onCreated }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/warehouses", { code, name, address: address || undefined, isDefault });
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
        <div className="text-sm font-semibold text-slate-700">Gudang Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Kode">
            <input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="mis. GD-01" />
          </Field>
          <Field label="Nama Gudang">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Alamat">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Jadikan gudang default
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Gudang"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function NewTransferForm({ items, warehouses, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? warehouses[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/stock-moves/transfers", {
        date,
        itemId: Number(itemId),
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        qty: Number(qty),
        note: note || undefined,
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
        <div className="text-sm font-semibold text-slate-700">Transfer Barang Antar Gudang</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Barang">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={selectCls}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
            </select>
          </Field>
          <Field label="Dari Gudang">
            <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </Field>
          <Field label="Ke Gudang">
            <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </Field>
          <Field label="Qty">
            <input type="number" min="0.001" step="0.001" required value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Catatan">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="opsional" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Memproses…" : "Transfer"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function Persediaan() {
  const warehousesApi = useApi("/warehouses");
  const items = useApi("/items");
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");

  const warehouses = warehousesApi.data || [];
  const allItems = (items.data || []).filter((i) => i.type === "stock");
  const effectiveItemId = selectedItemId || allItems[0]?.id || "";
  const byWarehouse = useApi(effectiveItemId ? `/stock-moves/by-warehouse/${effectiveItemId}` : null);

  const reloadAll = () => {
    warehousesApi.reload();
    byWarehouse.reload();
  };

  return (
    <>
      <PageHeader
        crumbs={["Persediaan", "Gudang & Transfer"]}
        title="Gudang & Transfer Barang"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ImportExportBar exportPath="/stock-moves/export/csv" exportFilename="stock-moves.csv" />
            <button onClick={() => setShowTransferForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100">
              <ArrowRightLeft size={16} /> Transfer Barang
            </button>
            <button onClick={() => setShowWarehouseForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800">
              <Plus size={16} /> Gudang
            </button>
          </div>
        }
      />
      <ErrorBanner message={warehousesApi.error || items.error} />

      {showWarehouseForm && (
        <NewWarehouseForm onClose={() => setShowWarehouseForm(false)} onCreated={() => { setShowWarehouseForm(false); reloadAll(); }} />
      )}
      {showTransferForm && warehouses.length >= 1 && allItems.length >= 1 && (
        <NewTransferForm
          items={allItems}
          warehouses={warehouses}
          onClose={() => setShowTransferForm(false)}
          onCreated={() => { setShowTransferForm(false); reloadAll(); }}
        />
      )}

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">Daftar Gudang</div>
          <ImportExportBar exportPath="/warehouses/export/csv" exportFilename="warehouses.csv" />
        </div>
        {warehousesApi.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Kode</th><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Alamat</th><th className="px-4 py-2">Default</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-blue-800">{w.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">{w.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{w.address || "-"}</td>
                    <td className="px-4 py-2.5">{w.isDefault ? <WarehouseIcon size={14} className="text-amber-600" /> : ""}</td>
                  </tr>
                ))}
                {warehouses.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada gudang. Tambahkan gudang untuk mulai mencatat stok per lokasi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">Stok per Gudang</div>
          <select value={effectiveItemId} onChange={(e) => setSelectedItemId(e.target.value)} className={`${selectCls} max-w-xs`}>
            {allItems.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
          </select>
        </div>
        {byWarehouse.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Gudang</th><th className="px-4 py-2 text-right">Stok On-Hand</th>
                </tr>
              </thead>
              <tbody>
                {(byWarehouse.data || []).map((row) => (
                  <tr key={row.warehouseId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{row.warehouseCode} — {row.warehouseName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800">{row.onHand}</td>
                  </tr>
                ))}
                {(byWarehouse.data || []).length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
