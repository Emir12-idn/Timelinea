import { Card, PageHeader, Badge, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";
import { rupiah } from "../lib/format";

export default function Dashboard() {
  const po = useApi("/purchase-orders");
  const inv = useApi("/sales-invoices");

  if (po.loading || inv.loading) return <Spinner />;
  const error = po.error || inv.error;

  const poRows = po.data || [];
  const invRows = inv.data || [];

  const poByStatus = ["draft", "sent", "received", "cancelled"].map((s) => [s, poRows.filter((r) => r.status === s).length]);
  const unpaidInvoices = invRows.filter((i) => i.status !== "paid");
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
  const salesThisMonthTotal = invRows
    .filter((i) => new Date(i.date).getMonth() === new Date().getMonth())
    .reduce((sum, i) => sum + Number(i.total), 0);

  const stats = [
    { label: "PO Aktif", value: String(poRows.filter((r) => r.status !== "cancelled").length), sub: "Total", color: "from-blue-800 to-blue-950" },
    { label: "Faktur Belum Lunas", value: rupiah(unpaidTotal), sub: `${unpaidInvoices.length} dokumen`, color: "from-amber-400 to-amber-500" },
    { label: "Penjualan Bulan Ini", value: rupiah(salesThisMonthTotal), sub: "Semua status", color: "from-blue-800 to-blue-950" },
  ];

  return (
    <>
      <PageHeader crumbs={["Home", "Beranda"]} title="Ringkasan" />
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${s.color}`} />
            <div className="p-4">
              <div className="text-xs font-medium text-slate-500">{s.label}</div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{s.value}</div>
              <div className="mt-1 text-xs text-slate-400">{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 inline-flex rounded bg-amber-400 px-2.5 py-1 text-xs font-bold text-blue-950">Status Pesanan Pembelian</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {poByStatus.map(([s, n]) => (
                  <tr key={s} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5"><Badge status={s} /></td>
                    <td className="py-2.5 text-right font-semibold text-slate-700 tabular-nums">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 inline-flex rounded bg-blue-900 px-2.5 py-1 text-xs font-bold text-white">Faktur Terbaru</div>
          <div className="space-y-2">
            {invRows.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{inv.no}</div>
                  <div className="text-xs text-slate-400">{inv.customer?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700 tabular-nums">{rupiah(inv.total)}</div>
                  <Badge status={inv.status} />
                </div>
              </div>
            ))}
            {invRows.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Belum ada faktur.</div>}
          </div>
        </Card>
      </div>
    </>
  );
}
