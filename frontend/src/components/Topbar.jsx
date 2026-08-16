import { useEffect, useState } from "react";
import { Menu, User, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Topbar({ onBurger }) {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tgl = now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const jam = now.toLocaleTimeString("id-ID", { hour12: false });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button onClick={onBurger} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu size={20} />
      </button>
      <span className="hidden text-sm font-semibold text-slate-700 sm:block">Business Portal</span>

      <div className="ml-auto hidden items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1.5 text-right lg:flex">
        <div className="leading-tight">
          <div className="text-[11px] font-medium text-slate-600">{tgl}</div>
          <div className="text-[11px] tabular-nums text-slate-500">{jam}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 border-l border-slate-200 pl-3 lg:ml-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-900">
          <User size={16} />
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-xs font-semibold text-slate-700">{user?.displayName}</div>
          <div className="text-[10px] text-slate-400">{user?.email}</div>
        </div>
        <button onClick={logout} title="Keluar" className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
