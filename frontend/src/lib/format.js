// Money fields come back from the API as strings (BigInt serialized to string
// server-side — see backend/src/main.ts). Convert once, here, at the display edge.
export const rupiah = (n) => {
  const num = typeof n === "string" ? Number(n) : n ?? 0;
  return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0 });
};

export const dateID = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export const dateInput = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
};
