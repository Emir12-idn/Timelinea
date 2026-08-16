import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronsLeft } from "lucide-react";
import { MENU } from "../menu";

const WORDMARK_FONT = { fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif" };

export default function Sidebar({ active, setActive, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const [open, setOpen] = useState({ pembelian: true, penjualan: true });
  const parentOf = (id) => MENU.find((m) => m.children?.some((c) => c.id === id))?.id;

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const hasChildren = !!item.children;
    const isActiveParent = active === item.id || parentOf(active) === item.id;
    const expanded = open[item.id];
    return (
      <div>
        <button
          onClick={() => {
            if (hasChildren) setOpen((o) => ({ ...o, [item.id]: !o[item.id] }));
            else {
              setActive(item.id);
              setMobileOpen(false);
            }
          }}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
            ${isActiveParent && !hasChildren ? "bg-amber-400 text-blue-950 shadow-sm"
              : isActiveParent ? "bg-white/10 text-white"
              : "text-blue-100/80 hover:bg-white/10 hover:text-white"}`}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          {!collapsed && hasChildren && (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {!collapsed && hasChildren && expanded && (
          <div className="mt-0.5 space-y-0.5 pl-6">
            {item.children.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActive(c.id);
                  setMobileOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-[13px] transition
                  ${active === c.id ? "bg-amber-400 text-blue-950 font-semibold"
                    : "text-blue-100/70 hover:bg-white/10 hover:text-white"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={`fixed z-40 flex h-full flex-col bg-blue-950 transition-all duration-200
          ${collapsed ? "w-[68px]" : "w-64"}
          ${mobileOpen ? "left-0" : "-left-64 lg:left-0"}`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-4">
          {collapsed ? (
            <span style={WORDMARK_FONT} className="mx-auto text-2xl font-extrabold text-amber-300">E</span>
          ) : (
            <div className="leading-none" style={WORDMARK_FONT}>
              <div className="text-xl font-bold tracking-tight text-white">Emerald</div>
              <div className="mt-0.5 text-[13px] font-semibold text-amber-300">Duta Sejahtera</div>
            </div>
          )}
          <button onClick={() => setCollapsed((c) => !c)} className="ml-auto hidden rounded p-1 text-blue-200 hover:bg-white/10 lg:block">
            <ChevronsLeft size={18} className={collapsed ? "rotate-180 transition" : "transition"} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {MENU.map((m) => <NavItem key={m.id} item={m} />)}
        </nav>
        {!collapsed && (
          <div className="border-t border-white/10 p-3 text-[10px] text-blue-200/60">
            v1.0 · © Emerald Duta Sejahtera
          </div>
        )}
      </aside>
    </>
  );
}
