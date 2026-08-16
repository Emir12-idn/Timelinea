import { CalendarDays } from "lucide-react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner } from "../components/ui";
import { useApi } from "../lib/useApi";
import { api } from "../api/client";

const AB_STATUS = ["hadir", "izin", "sakit", "alpha"];
const STATUS_LABEL = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpha: "Alpha" };

export default function AbsensiHarian() {
  const today = new Date().toISOString().slice(0, 10);
  const emp = useApi("/employees");
  const att = useApi(`/attendance?date=${today}`);

  if (emp.loading || att.loading) return <Spinner />;

  const byEmployee = new Map((att.data || []).map((a) => [a.employeeId, a]));
  const rows = (emp.data || []).map((e) => ({ employee: e, attendance: byEmployee.get(e.id) }));
  const count = (s) => rows.filter((r) => r.attendance?.status === s).length;

  const setStatus = async (employeeId, status) => {
    await api.post("/attendance", { employeeId, date: today, status });
    att.reload();
  };

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader crumbs={["Absensi & Gaji", "Absensi Harian"]} title="Absensi Harian" />
      <ErrorBanner message={emp.error || att.error} />
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <CalendarDays size={16} className="text-amber-500" /> {todayLabel}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AB_STATUS.map((s) => (
          <Card key={s} className="p-4">
            <div className="text-xs font-medium text-slate-500">{STATUS_LABEL[s]}</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{count(s)}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ubah</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, attendance }) => (
                <tr key={employee.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">{employee.name}</td>
                  <td className="px-4 py-3 text-slate-500">{employee.position}</td>
                  <td className="px-4 py-3">{attendance ? <Badge status={attendance.status} /> : <span className="text-xs text-slate-300">Belum diisi</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={attendance?.status ?? ""}
                      onChange={(e) => setStatus(employee.id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-600"
                    >
                      <option value="" disabled>Pilih…</option>
                      {AB_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada karyawan.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
