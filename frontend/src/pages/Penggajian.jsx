import { useState } from "react";
import { Printer } from "lucide-react";
import { Card, PageHeader, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api, fetchPdfObjectUrl } from "../api/client";
import { rupiah } from "../lib/format";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export default function Penggajian() {
  const period = currentPeriod();
  const emp = useApi("/employees");
  const slips = useApi(`/payslips?period=${period}`);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  if (emp.loading || slips.loading) return <Spinner />;

  const byEmployee = new Map((slips.data || []).map((s) => [s.employeeId, s]));

  const generate = async (employeeId) => {
    setBusyId(employeeId);
    setError("");
    try {
      await api.post("/payslips/generate", { employeeId, period });
      slips.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const printSlip = async (payslipId) => {
    setBusyId(payslipId);
    setError("");
    try {
      const url = await fetchPdfObjectUrl(`/payslips/${payslipId}/print`);
      window.open(url, "_blank");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader crumbs={["Absensi & Gaji", "Penggajian"]} title={`Penggajian — Periode ${periodLabel(period)}`} />
      <ErrorBanner message={emp.error || slips.error || error} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3 text-right">Gaji Pokok</th>
                <th className="px-4 py-3 text-right">Potongan</th><th className="px-4 py-3 text-right">Terima Bersih</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(emp.data || []).map((p) => {
                const slip = byEmployee.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{rupiah(p.baseSalary)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">{slip ? rupiah(slip.deductionTotal) : "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-900">{slip ? rupiah(slip.netPay) : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {slip ? (
                        <button
                          onClick={() => printSlip(slip.id)}
                          disabled={busyId === slip.id}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                        >
                          <Printer size={13} /> Slip
                        </button>
                      ) : (
                        <button
                          onClick={() => generate(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-md bg-blue-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          {busyId === p.id ? "Memproses…" : "Generate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(emp.data || []).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada karyawan.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
