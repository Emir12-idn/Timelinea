import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { api, downloadCsv } from "../api/client";

/**
 * §11 data design, item 4 — tombol Import/Export CSV generik dipakai di
 * beberapa halaman list (Barang & Jasa, Pemasok/Pelanggan, dan tombol export
 * saja di InvoiceList/Persediaan). `importPath` opsional — kosongkan untuk
 * halaman yang cuma perlu export (faktur, mutasi stok — bukan master data
 * yang wajar diimpor massal).
 */
export function ImportExportBar({ exportPath, exportFilename, importPath, onImported }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleExport = async () => {
    setError("");
    try {
      await downloadCsv(exportPath, exportFilename);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.postForm(importPath, formData);
      const errorNote = result.errors?.length ? `, ${result.errors.length} baris gagal (lihat detail di bawah)` : "";
      setMessage(`${result.created} dibuat, ${result.updated} diperbarui${errorNote}`);
      if (result.errors?.length) {
        setError(result.errors.map((er) => `Baris ${er.row}: ${er.message}`).join("; "));
      }
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {importPath && (
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={handleImportClick}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <Upload size={15} /> {busy ? "Mengimpor…" : "Import CSV"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
      {message && <div className="max-w-xs text-right text-xs text-emerald-700">{message}</div>}
      {error && <div className="max-w-xs text-right text-xs text-rose-600">{error}</div>}
    </div>
  );
}
