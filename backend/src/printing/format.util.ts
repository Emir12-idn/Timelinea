export function rupiah(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

export function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function qty(n: unknown): string {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 3 });
}
