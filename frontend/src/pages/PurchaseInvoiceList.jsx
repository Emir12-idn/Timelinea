import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { ImportExportBar } from "../components/ImportExport";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";
import { rupiah, dateID } from "../lib/format";

/**
 * Faktur pembelian di sistem ini TIDAK punya baris item sendiri (lihat
 * `purchase_invoice` §3 data design — cuma header dpp/ppn/total) — kalau
 * ditautkan ke PO (`poId`), baris/stock-in datang OTOMATIS dari baris PO
 * tsb saat `POST /purchase-invoices` (backend/src/purchasing/purchase-invoices/
 * purchase-invoices.service.ts). Jadi form ini cuma header + pemilih PO
 * opsional (dengan preview baris PO read-only supaya user tahu apa yang
 * bakal masuk stok), bukan editor baris seperti PO/Faktur Penjualan.
 */
function NewPurchaseInvoiceForm({ suppliers, sentPOs, warehouses, onClose, onCreated }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [poId, setPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [total, setTotal] = useState("");
  const [dpp, setDpp] = useState("");
  const [ppn, setPpn] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // PO yang bisa difaktur untuk pemasok yang dipilih — backend sendiri tidak
  // mewajibkan po.supplierId === dto.supplierId, tapi UI mempersempit pilihan
  // supaya tidak salah tautkan PO pemasok lain (kesalahan input yang wajar
  // dicegah di form, bukan constraint data baru).
  const posForSupplier = useMemo(
    () => sentPOs.filter((po) => String(po.supplierId) === String(supplierId)),
    [sentPOs, supplierId],
  );
  const selectedPo = posForSupplier.find((po) => String(po.id) === String(poId));
  const poTotal = selectedPo ? (selectedPo.lines || []).reduce((s, l) => s + Number(l.amount), 0) : 0;

  const onPickPo = (value) => {
    setPoId(value);
    const po = posForSupplier.find((p) => String(p.id) === String(value));
    if (po) {
      const nilai = (po.lines || []).reduce((s, l) => s + Number(l.amount), 0);
      setTotal(String(nilai));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/purchase-invoices", {
        date,
        supplierId: Number(supplierId),
        poId: poId ? Number(poId) : undefined,
        warehouseId: poId && warehouseId ? Number(warehouseId) : undefined,
        total: Number(total),
        dpp: dpp === "" ? undefined : Number(dpp),
        ppn: ppn === "" ? undefined : Number(ppn),
        dueDate: dueDate || undefined,
        currency: currency !== "IDR" ? currency : undefined,
        exchangeRate: currency !== "IDR" ? Number(exchangeRate) : undefined,
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
        <div className="text-sm font-semibold text-slate-700">Faktur Pembelian Baru</div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tanggal">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pemasok">
            <select
              required
              value={supplierId}
              onChange={(e) => { setSupplierId(e.target.value); setPoId(""); }}
              className={selectCls}
            >
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Jatuh Tempo (opsional)">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Tautkan ke PO (opsional — sekaligus jadi bukti penerimaan barang)">
          <select value={poId} onChange={(e) => onPickPo(e.target.value)} className={selectCls}>
            <option value="">— Tanpa PO (faktur langsung) —</option>
            {posForSupplier.map((po) => <option key={po.id} value={po.id}>{po.no} — {rupiah(po.lines.reduce((s, l) => s + Number(l.amount), 0))}</option>)}
          </select>
          {supplierId && posForSupplier.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">Tidak ada PO berstatus "sent" untuk pemasok ini.</p>
          )}
        </Field>

        {selectedPo && (
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Baris PO {selectedPo.no} (otomatis jadi stock-in saat faktur disimpan)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500">
                    <th className="px-3 py-1.5">Barang</th>
                    <th className="px-3 py-1.5 text-right">Qty</th>
                    <th className="px-3 py-1.5 text-right">Harga Satuan</th>
                    <th className="px-3 py-1.5 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.lines.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-700">{l.item?.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{l.qty}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{rupiah(l.unitPrice)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{rupiah(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {warehouses.length > 0 && (
              <div className="border-t border-slate-100 px-3 py-2">
                <Field label="Gudang penerimaan (opsional — default gudang utama)">
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                    <option value="">— Gudang default —</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={`Total Faktur${currency !== "IDR" ? ` (${currency})` : " (Rp)"}`}>
            <input type="number" min="1" required value={total} onChange={(e) => setTotal(e.target.value)} className={inputCls} />
          </Field>
          <Field label="DPP (opsional — default 100/111 dari Total)">
            <input type="number" min="0" value={dpp} onChange={(e) => setDpp(e.target.value)} className={inputCls} />
          </Field>
          <Field label="PPN (opsional — default Total − DPP)">
            <input type="number" min="0" value={ppn} onChange={(e) => setPpn(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {selectedPo && Number(total) !== poTotal && (
          <p className="text-xs text-amber-600">Nilai PO {selectedPo.no} adalah {rupiah(poTotal)} — Total faktur boleh berbeda kalau harga di faktur pemasok memang berbeda.</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Mata Uang">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
              <option value="IDR">IDR — Rupiah</option>
              <option value="USD">USD — Dolar AS</option>
              <option value="SGD">SGD — Dolar Singapura</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </Field>
          {currency !== "IDR" && (
            <Field label="Kurs (Rp per 1 unit mata uang, manual)">
              <input type="number" min="0" step="any" required value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className={inputCls} />
            </Field>
          )}
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

export default function PurchaseInvoiceList() {
  const inv = useApi("/purchase-invoices");
  const suppliers = useApi("/partners?type=supplier");
  const sentPOs = useApi("/purchase-orders?status=sent");
  const warehouses = useApi("/warehouses");
  const [showForm, setShowForm] = useState(false);

  const ready = !suppliers.loading && !sentPOs.loading && !warehouses.loading;

  return (
    <>
      <PageHeader
        crumbs={["Pembelian", "Faktur Pembelian"]}
        title="Faktur Pembelian"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ImportExportBar exportPath="/purchase-invoices/export/csv" exportFilename="purchase-invoices.csv" />
            <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800">
              <Plus size={16} /> Faktur Baru
            </button>
          </div>
        }
      />
      <ErrorBanner message={inv.error || suppliers.error || sentPOs.error} />

      {showForm && ready && (
        <NewPurchaseInvoiceForm
          suppliers={suppliers.data || []}
          sentPOs={sentPOs.data || []}
          warehouses={warehouses.data || []}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            inv.reload();
            sentPOs.reload();
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
                  <th className="px-4 py-3">No Faktur</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pemasok</th>
                  <th className="px-4 py-3">No PO</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(inv.data || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-800">{r.no}</td>
                    <td className="px-4 py-3 text-slate-600">{dateID(r.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.supplier?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.po?.no || "-"}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(r.total)}</td>
                  </tr>
                ))}
                {(inv.data || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada Faktur Pembelian.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
