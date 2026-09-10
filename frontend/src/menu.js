import {
  Home, ShoppingCart, TrendingUp, Boxes, Landmark, BookOpen, Building2,
  FolderKanban, FileBarChart, Settings, Fingerprint, Factory,
} from "lucide-react";

export const MENU = [
  { id: "beranda", label: "Beranda", icon: Home },
  {
    id: "pembelian", label: "Pembelian", icon: ShoppingCart, children: [
      { id: "pb-po", label: "Pesanan Pembelian (PO)" },
      { id: "pb-faktur", label: "Faktur Pembelian" },
      { id: "pb-retur", label: "Retur Pembelian" },
    ],
  },
  {
    id: "penjualan", label: "Penjualan", icon: TrendingUp, children: [
      { id: "pj-so", label: "Pesanan Penjualan (SO)" },
      { id: "pj-suratjalan", label: "Surat Jalan" },
      { id: "pj-faktur", label: "Faktur Penjualan" },
      { id: "pj-retur", label: "Retur Penjualan" },
    ],
  },
  {
    id: "persediaan", label: "Persediaan", icon: Boxes, children: [
      { id: "ps-barang", label: "Barang & Jasa" },
      { id: "ps-gudang", label: "Gudang & Transfer" },
    ],
  },
  {
    id: "pabrikasi", label: "Pabrikasi", icon: Factory, children: [
      { id: "pab-produksi", label: "BOM & Work Order" },
    ],
  },
  {
    id: "kasbank", label: "Kas & Bank", icon: Landmark, children: [
      { id: "kb-transaksi", label: "Penerimaan / Pembayaran" },
      { id: "kb-rekonsiliasi", label: "Rekonsiliasi Bank" },
      { id: "kb-cekgiro", label: "Cek/Giro" },
    ],
  },
  {
    id: "bukubesar", label: "Buku Besar", icon: BookOpen, children: [
      { id: "bb-akun", label: "Daftar Akun" },
      { id: "bb-jurnal", label: "Bukti Jurnal" },
      { id: "bb-anggaran", label: "Monitor Anggaran" },
    ],
  },
  {
    id: "aktiva", label: "Aktiva Tetap", icon: Building2, children: [
      { id: "at-daftar", label: "Daftar Aktiva Tetap" },
    ],
  },
  {
    id: "proyek", label: "Proyek & Departemen", icon: FolderKanban, children: [
      { id: "pr-daftar", label: "Daftar Proyek" },
      { id: "pr-tugas", label: "Tugas & Jadwal" },
      { id: "pr-bast", label: "Berita Acara Serah Terima" },
      { id: "pr-rab", label: "RAB & Realisasi Biaya" },
    ],
  },
  {
    id: "absensi", label: "Absensi & Gaji", icon: Fingerprint, children: [
      { id: "ab-karyawan", label: "Data Karyawan" },
      { id: "ab-harian", label: "Absensi Harian" },
      { id: "ab-kasbon", label: "Kasbon" },
      { id: "ab-gaji", label: "Penggajian" },
    ],
  },
  { id: "laporan", label: "Laporan", icon: FileBarChart },
  {
    id: "pengaturan", label: "Pengaturan", icon: Settings, children: [
      { id: "st-pemasok", label: "Pemasok" },
      { id: "st-pelanggan", label: "Pelanggan" },
      { id: "st-perusahaan", label: "Info Perusahaan" },
      { id: "st-pengguna", label: "Pengguna & Hak Akses" },
    ],
  },
];

export function labelPath(id) {
  for (const m of MENU) {
    if (m.id === id) return { crumbs: [m.label], title: m.label };
    const c = m.children?.find((x) => x.id === id);
    if (c) return { crumbs: [m.label, c.label], title: c.label };
  }
  return { crumbs: ["-"], title: "-" };
}
