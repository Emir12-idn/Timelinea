import { useState } from "react";
import { Card, PageHeader, Badge, Spinner, ErrorBanner, Field, inputCls, selectCls } from "../components/ui";
import { useApi } from "../lib/useApi";
import { rupiah, dateID } from "../lib/format";

const TODAY = new Date().toISOString().slice(0, 10);
const START_OF_YEAR = `${new Date().getFullYear()}-01-01`;

const TABS = [
  { id: "laba-rugi", label: "Laba Rugi" },
  { id: "neraca", label: "Neraca" },
  { id: "buku-besar", label: "Buku Besar" },
  { id: "aging", label: "Aging Piutang/Hutang" },
  { id: "konsolidasi", label: "Konsolidasi Multi-Company" },
];

function TabBar({ active, setActive }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium ${
            active === t.id ? "border-blue-800 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function AccountTable({ title, rows, totalLabel, total }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.code + i} className="border-b border-slate-50">
                <td className="py-1.5 text-slate-500">{a.name}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-700">{rupiah(a.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} className="py-3 text-center text-xs text-slate-300">Tidak ada data</td></tr>
            )}
            <tr className="font-semibold text-slate-800">
              <td className="py-2">{totalLabel}</td>
              <td className="py-2 text-right tabular-nums">{rupiah(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LabaRugi() {
  const [from, setFrom] = useState(START_OF_YEAR);
  const [to, setTo] = useState(TODAY);
  const r = useApi(`/reports/laba-rugi?from=${from}&to=${to}`);
  const bersih = r.data ? Number(r.data.labaRugiBersih) : 0;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Dari Tanggal"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
        <Field label="Sampai Tanggal"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
      </div>
      <ErrorBanner message={r.error} />
      {r.loading ? <Spinner /> : r.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AccountTable title="Pendapatan" rows={r.data.pendapatan} totalLabel="Total Pendapatan" total={r.data.totalPendapatan} />
          <AccountTable title="Beban" rows={r.data.beban} totalLabel="Total Beban" total={r.data.totalBeban} />
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Laba (Rugi) Bersih</div>
              <div className={`text-lg font-bold tabular-nums ${bersih >= 0 ? "text-green-700" : "text-rose-700"}`}>
                {rupiah(r.data.labaRugiBersih)}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Neraca() {
  const [asOf, setAsOf] = useState(TODAY);
  const r = useApi(`/reports/neraca?asOf=${asOf}`);
  const totalKE = r.data ? BigInt(r.data.totalKewajiban) + BigInt(r.data.totalEkuitas) : 0n;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Per Tanggal"><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} /></Field>
      </div>
      <ErrorBanner message={r.error} />
      {r.loading ? <Spinner /> : r.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AccountTable title="Aset" rows={r.data.aset} totalLabel="Total Aset" total={r.data.totalAset} />
          <div className="space-y-4">
            <AccountTable title="Kewajiban" rows={r.data.kewajiban} totalLabel="Total Kewajiban" total={r.data.totalKewajiban} />
            <AccountTable title="Ekuitas" rows={r.data.ekuitas} totalLabel="Total Ekuitas" total={r.data.totalEkuitas} />
          </div>
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold text-slate-700">Total Kewajiban + Ekuitas</div>
              <div className="font-bold tabular-nums text-slate-800">{rupiah(totalKE)}</div>
            </div>
            <div className="mt-1 text-xs">
              {r.data.balanced ? (
                <span className="text-green-700">Neraca seimbang (Aset = Kewajiban + Ekuitas) ✓</span>
              ) : (
                <span className="text-rose-700">Neraca tidak seimbang — periksa jurnal ✗</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function BukuBesar() {
  const accounts = useApi("/accounts");
  const [code, setCode] = useState("");
  const [from, setFrom] = useState(START_OF_YEAR);
  const [to, setTo] = useState(TODAY);

  const effectiveCode = code || accounts.data?.[0]?.code || "";
  const r = useApi(effectiveCode ? `/reports/buku-besar/${effectiveCode}?from=${from}&to=${to}` : null);

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Akun">
          <select value={effectiveCode} onChange={(e) => setCode(e.target.value)} className={selectCls}>
            {(accounts.data || []).map((a) => (
              <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Dari Tanggal"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
        <Field label="Sampai Tanggal"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
      </div>
      <ErrorBanner message={r.error} />
      {r.loading ? <Spinner /> : r.data && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            {r.data.account.code} — {r.data.account.name}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">No Bukti</th><th className="px-4 py-2">Referensi</th>
                  <th className="px-4 py-2 text-right">Debit</th><th className="px-4 py-2 text-right">Kredit</th><th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-500" colSpan={5}>Saldo Awal</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-700">{rupiah(r.data.openingBalance)}</td>
                </tr>
                {r.data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-600">{dateID(row.date)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.no}</td>
                    <td className="px-4 py-2.5 text-slate-500">{row.refType}{row.refNo ? ` (${row.refNo})` : ""}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{Number(row.debit) > 0 ? rupiah(row.debit) : "-"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{Number(row.credit) > 0 ? rupiah(row.credit) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-700">{rupiah(row.balance)}</td>
                  </tr>
                ))}
                {r.data.rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada transaksi pada periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Aging() {
  const [type, setType] = useState("piutang");
  const [asOf, setAsOf] = useState(TODAY);
  const r = useApi(`/reports/aging?type=${type}&asOf=${asOf}`);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Jenis">
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="piutang">Piutang (AR)</option>
            <option value="hutang">Hutang (AP)</option>
          </select>
        </Field>
        <Field label="Per Tanggal"><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} /></Field>
      </div>
      <ErrorBanner message={r.error} />
      {r.loading ? <Spinner /> : r.data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {r.data.bucketTotals.map((b) => (
              <Card key={b.bucket} className="p-3">
                <div className="text-xs text-slate-500">{b.bucket}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{rupiah(b.amount)}</div>
              </Card>
            ))}
            <div className="rounded-xl border border-blue-900 bg-blue-900 p-3 shadow-sm">
              <div className="text-xs text-blue-200">Total</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-white">{rupiah(r.data.grandTotal)}</div>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3">No Faktur</th>
                    <th className="px-4 py-3">{type === "piutang" ? "Pelanggan" : "Pemasok"}</th>
                    <th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Jatuh Tempo</th>
                    <th className="px-4 py-3">Umur</th><th className="px-4 py-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.rows.map((row) => (
                    <tr key={row.no} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-blue-800">{row.no}</td>
                      <td className="px-4 py-3 text-slate-700">{row.partnerName}</td>
                      <td className="px-4 py-3 text-slate-600">{dateID(row.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{dateID(row.dueDate)}</td>
                      <td className="px-4 py-3"><Badge status={row.bucket} /></td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{rupiah(row.amount)}</td>
                    </tr>
                  ))}
                  {r.data.rows.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada {type === "piutang" ? "piutang" : "hutang"} terbuka.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function Konsolidasi() {
  const [from, setFrom] = useState(START_OF_YEAR);
  const [to, setTo] = useState(TODAY);
  const r = useApi(`/reports/konsolidasi?from=${from}&to=${to}`);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Dari Tanggal"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
        <Field label="Sampai Tanggal"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
      </div>
      <ErrorBanner message={r.error} />
      {r.loading ? <Spinner /> : r.data && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-blue-900 px-4 py-3 text-sm font-semibold text-white">
              Gabungan Seluruh Badan Usaha
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-slate-500">Total Pendapatan</div>
                <div className="mt-1 text-base font-bold tabular-nums text-slate-800">{rupiah(r.data.combined.labaRugi.totalPendapatan)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Beban</div>
                <div className="mt-1 text-base font-bold tabular-nums text-slate-800">{rupiah(r.data.combined.labaRugi.totalBeban)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Laba (Rugi) Bersih</div>
                <div className={`mt-1 text-base font-bold tabular-nums ${Number(r.data.combined.labaRugi.labaRugiBersih) >= 0 ? "text-green-700" : "text-rose-700"}`}>
                  {rupiah(r.data.combined.labaRugi.labaRugiBersih)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Aset</div>
                <div className="mt-1 text-base font-bold tabular-nums text-slate-800">{rupiah(r.data.combined.neraca.totalAset)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Kewajiban</div>
                <div className="mt-1 text-base font-bold tabular-nums text-slate-800">{rupiah(r.data.combined.neraca.totalKewajiban)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Ekuitas</div>
                <div className="mt-1 text-base font-bold tabular-nums text-slate-800">{rupiah(r.data.combined.neraca.totalEkuitas)}</div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Per Badan Usaha</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-2">Perusahaan</th>
                    <th className="px-4 py-2 text-right">Pendapatan</th>
                    <th className="px-4 py-2 text-right">Beban</th>
                    <th className="px-4 py-2 text-right">Laba (Rugi)</th>
                    <th className="px-4 py-2 text-right">Total Aset</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.companies.map((c) => (
                    <tr key={c.companyId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 text-slate-700">{c.companyCode} — {c.companyName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{rupiah(c.labaRugi.totalPendapatan)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{rupiah(c.labaRugi.totalBeban)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(c.labaRugi.labaRugiBersih) >= 0 ? "text-green-700" : "text-rose-700"}`}>
                        {rupiah(c.labaRugi.labaRugiBersih)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{rupiah(c.neraca.totalAset)}</td>
                    </tr>
                  ))}
                  {r.data.companies.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada badan usaha lain selain default.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default function Laporan() {
  const [tab, setTab] = useState("laba-rugi");

  return (
    <>
      <PageHeader crumbs={["Laporan"]} title="Laporan Keuangan" />
      <TabBar active={tab} setActive={setTab} />
      {tab === "laba-rugi" && <LabaRugi />}
      {tab === "neraca" && <Neraca />}
      {tab === "buku-besar" && <BukuBesar />}
      {tab === "aging" && <Aging />}
      {tab === "konsolidasi" && <Konsolidasi />}
    </>
  );
}
