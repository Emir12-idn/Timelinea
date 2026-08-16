import { ChevronRight } from "lucide-react";

export const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

export const PageHeader = ({ crumbs, title, actions }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} />}
            <span className={i === crumbs.length - 1 ? "text-slate-600" : ""}>{c}</span>
          </span>
        ))}
      </div>
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
    </div>
    {actions}
  </div>
);

const STATUS_STYLE = {
  diterima: "bg-green-100 text-green-700 ring-green-600/20",
  lunas: "bg-green-100 text-green-700 ring-green-600/20",
  accepted: "bg-green-100 text-green-700 ring-green-600/20",
  paid: "bg-green-100 text-green-700 ring-green-600/20",
  received: "bg-green-100 text-green-700 ring-green-600/20",
  approved: "bg-green-100 text-green-700 ring-green-600/20",
  hadir: "bg-green-100 text-green-700 ring-green-600/20",
  proses: "bg-amber-100 text-amber-700 ring-amber-600/20",
  sent: "bg-amber-100 text-amber-700 ring-amber-600/20",
  pending: "bg-amber-100 text-amber-700 ring-amber-600/20",
  izin: "bg-amber-100 text-amber-700 ring-amber-600/20",
  terkirim: "bg-sky-100 text-sky-700 ring-sky-600/20",
  delivered: "bg-sky-100 text-sky-700 ring-sky-600/20",
  open: "bg-sky-100 text-sky-700 ring-sky-600/20",
  sakit: "bg-sky-100 text-sky-700 ring-sky-600/20",
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-600/20",
  batal: "bg-rose-100 text-rose-700 ring-rose-600/20",
  rejected: "bg-rose-100 text-rose-700 ring-rose-600/20",
  alpha: "bg-rose-100 text-rose-700 ring-rose-600/20",
};

export const Badge = ({ status }) => {
  const key = String(status || "").toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[key] || STATUS_STYLE.draft}`}>
      {status}
    </span>
  );
};

export const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
    {children}
  </div>
);

export const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600";
export const selectCls = "w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-600";

export const ErrorBanner = ({ message }) =>
  message ? (
    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div>
  ) : null;

export const Spinner = () => (
  <div className="flex items-center justify-center py-16 text-sm text-slate-400">Memuat…</div>
);
