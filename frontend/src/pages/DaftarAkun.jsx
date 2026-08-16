import { Card, PageHeader, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";

const TYPE_LABEL = { aset: "Aset", kewajiban: "Kewajiban", ekuitas: "Ekuitas", pendapatan: "Pendapatan", beban: "Beban" };

export default function DaftarAkun() {
  const acc = useApi("/accounts");
  if (acc.loading) return <Spinner />;

  return (
    <>
      <PageHeader crumbs={["Buku Besar", "Daftar Akun"]} title="Daftar Akun (COA)" />
      <ErrorBanner message={acc.error} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama Akun</th>
                <th className="px-4 py-3">Tipe</th><th className="px-4 py-3">Kode Akun Pajak (Coretax)</th>
              </tr>
            </thead>
            <tbody>
              {(acc.data || []).map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-800">{a.code}</td>
                  <td className="px-4 py-3 text-slate-700">{a.name}</td>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[a.type]}</td>
                  <td className="px-4 py-3">
                    {a.taxCode ? (
                      <span className="inline-flex items-center gap-1.5 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        <span className="font-mono font-semibold">{a.taxCode}</span> {a.taxName}
                      </span>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
