import { FileText } from "lucide-react";
import { Card, PageHeader } from "../components/ui";

export default function Placeholder({ title, crumbs }) {
  return (
    <>
      <PageHeader crumbs={crumbs} title={title} />
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-800">
          <FileText size={24} />
        </div>
        <div className="text-sm font-medium text-slate-600">Modul "{title}" belum tersambung di frontend</div>
        <div className="max-w-sm text-xs text-slate-400">
          API-nya sudah ada di backend — halaman ini menyusul mengikuti pola yang sama seperti Pesanan Pembelian & Faktur Penjualan.
        </div>
      </Card>
    </>
  );
}
