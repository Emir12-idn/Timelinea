import { Check } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";
import { rupiah, dateID } from "../lib/format";

export default function BuktiJurnal() {
  const je = useApi("/journal-entries?pageSize=50");
  if (je.loading) return <Spinner />;

  const entries = je.data?.data || [];

  return (
    <>
      <PageHeader crumbs={["Buku Besar", "Bukti Jurnal"]} title="Bukti Jurnal (Otomatis)" />
      <ErrorBanner message={je.error} />
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 ring-1 ring-inset ring-blue-600/15">
        <Check size={14} /> Jurnal dibuat otomatis dari setiap transaksi — tanpa input manual. Debit selalu sama dengan kredit.
      </div>
      <div className="space-y-3">
        {entries.map((e) => {
          const totD = e.lines.reduce((a, l) => a + Number(l.debit), 0);
          const totK = e.lines.reduce((a, l) => a + Number(l.credit), 0);
          return (
            <Card key={e.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-sm">
                <span className="font-mono font-semibold text-blue-800">{e.no}</span>
                <span className="text-slate-500">{dateID(e.date)}</span>
                <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{e.type}</span>
                <span className="ml-auto text-xs text-slate-400">Ref: {e.refNo || `${e.refType}#${e.refId}`}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {e.lines.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{l.account?.code}</td>
                      <td className={`py-2 pr-4 ${Number(l.debit) ? "text-slate-700" : "pl-6 text-slate-600"}`}>{l.account?.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{Number(l.debit) ? rupiah(l.debit) : ""}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{Number(l.credit) ? rupiah(l.credit) : ""}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-right text-xs text-slate-500">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-800">{rupiah(totD)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-800">{rupiah(totK)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          );
        })}
        {entries.length === 0 && (
          <Card className="p-10 text-center text-sm text-slate-400">Belum ada jurnal — jurnal muncul otomatis begitu ada transaksi (faktur, pembayaran, dst).</Card>
        )}
      </div>
    </>
  );
}
