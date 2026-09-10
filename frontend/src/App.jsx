import { useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Placeholder from "./pages/Placeholder";
import Dashboard from "./pages/Dashboard";
import POList from "./pages/POList";
import InvoiceList from "./pages/InvoiceList";
import DataKaryawan from "./pages/DataKaryawan";
import AbsensiHarian from "./pages/AbsensiHarian";
import Penggajian from "./pages/Penggajian";
import DaftarAkun from "./pages/DaftarAkun";
import BuktiJurnal from "./pages/BuktiJurnal";
import BASTList from "./pages/BASTList";
import Laporan from "./pages/Laporan";
import SalesReturnList from "./pages/SalesReturnList";
import PurchaseReturnList from "./pages/PurchaseReturnList";
import Kasbon from "./pages/Kasbon";
import BankReconciliation from "./pages/BankReconciliation";
import Persediaan from "./pages/Persediaan";
import Pabrikasi from "./pages/Pabrikasi";
import Anggaran from "./pages/Anggaran";
import { labelPath } from "./menu";

function Shell() {
  const [active, setActive] = useState("beranda");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const render = () => {
    if (active === "beranda") return <Dashboard />;
    if (active === "pb-po") return <POList />;
    if (active === "pj-faktur") return <InvoiceList />;
    if (active === "ab-karyawan") return <DataKaryawan />;
    if (active === "ab-harian") return <AbsensiHarian />;
    if (active === "ab-gaji") return <Penggajian />;
    if (active === "bb-akun") return <DaftarAkun />;
    if (active === "bb-jurnal") return <BuktiJurnal />;
    if (active === "pr-bast") return <BASTList />;
    if (active === "laporan") return <Laporan />;
    if (active === "pj-retur") return <SalesReturnList />;
    if (active === "pb-retur") return <PurchaseReturnList />;
    if (active === "ab-kasbon") return <Kasbon />;
    if (active === "kb-rekonsiliasi") return <BankReconciliation />;
    if (active === "ps-gudang") return <Persediaan />;
    if (active === "pab-produksi") return <Pabrikasi />;
    if (active === "bb-anggaran") return <Anggaran />;
    const { crumbs, title } = labelPath(active);
    return <Placeholder title={title} crumbs={crumbs} />;
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar
        active={active}
        setActive={setActive}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-[68px]" : "lg:pl-64"}`}>
        <Topbar onBurger={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{render()}</main>
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400">Memuat…</div>;
  }
  return user ? <Shell /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
