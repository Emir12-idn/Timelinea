# Emerald Duta Sejahtera — Data Design & Build Spec

Dokumen acuan untuk membangun portal (backend + database) versi asli. Serahkan file ini ke Claude Code CLI sebagai konteks. Frontend prototipe: `EmeraldERP.jsx`.

Brand: navy `#1F3A6E` + gold `#C7A24A`, wordmark **Emerald / Duta Sejahtera** (font Poppins). Istilah "ERP" tidak ditampilkan di UI.

---

## 1. Rekomendasi stack (untuk Claude Code CLI)

- Frontend: React + Vite + Tailwind (lanjutan dari prototipe), komponen sudah bergaya navy/gold.
- Backend: pilih salah satu — **Laravel** (cocok untuk tim PHP, cepat CRUD + auth + PDF) atau **Node (NestJS) + Prisma**.
- Database: **PostgreSQL** (atau MySQL/MariaDB kalau self-host di PC lama).
- PDF/cetak: server-side (Laravel dompdf / Puppeteer) atau tetap `window.print()` dari template HTML.
- Auth: session/JWT + role-based access (lihat §6).
- Deploy: self-host (PC jadi server) + domain `.my.id`, atau VPS.

Konvensi: semua tabel punya `id`, `created_at`, `updated_at`, `created_by`. Uang disimpan sebagai integer rupiah (tanpa desimal). Soft delete pakai `deleted_at`.

---

## 2. Daftar modul

| Modul | Fungsi inti |
|---|---|
| Pembelian | PR, PO, penerimaan barang, faktur & pembayaran pembelian |
| Penjualan | penawaran, SO, surat jalan, faktur, penerimaan |
| Persediaan | barang/jasa, penyesuaian, pindah, grup |
| Kas & Bank | penerimaan, pembayaran, buku bank, rekonsiliasi |
| Buku Besar | COA, bukti jurnal (otomatis), buku besar per akun, tutup buku |
| Aktiva Tetap | daftar aset, penyusutan |
| Proyek | daftar proyek, PO masuk per proyek, tugas & jadwal, pembelian/SJ per proyek (via tag), BAST, biaya & realisasi, departemen |
| Absensi & Gaji | data karyawan, absensi harian, lembur, kasbon, hutang, penggajian |
| Laporan | laba rugi, neraca, umur piutang/utang, biaya proyek, dll |
| Pengaturan | pemasok, pelanggan, info perusahaan, pengguna & hak akses |

Prinsip yang sudah disepakati: **input di modul asal, modul Proyek hanya menampilkan transaksi yang sudah di-tag `project_id`** — tidak ada input ganda.

---

## 3. Entitas & field

Format: `nama_field: tipe (catatan)`. FK = foreign key.

### Master

**company** (multi-badan usaha / cabang)
- code, name, npwp, address, is_default

**partner** (pemasok + pelanggan, dibedakan `type`)
- code, name, type: enum(customer, supplier, both), npwp, address, phone, email, term_days

**employee** (karyawan)
- nik, name, position, employment_status: enum(tetap, harian, kontrak), base_salary, join_date, is_active
- relasi: punya banyak attendance, overtime, cash_advance, loan, payslip, task

**item** (barang & jasa)
- code (part no), name, uom, type: enum(stock, service), group_id (FK item_group), min_stock, last_cost
- stok berjalan dihitung dari mutasi (jangan simpan angka statis)

**item_group**: code, name, parent_id

**project** (proyek)
- code, name, customer_id (FK partner), contract_value, start_date, target_date, status: enum(draft, running, done, cancelled)

**department**: code, name

### Transaksi pembelian

**purchase_order** (PO): no, date, supplier_id (FK), project_id (FK, nullable — tag proyek), status: enum(draft, sent, received, cancelled), note
- **purchase_order_line**: po_id (FK), item_id (FK), qty, unit_price, amount

**goods_receipt** (penerimaan): no, date, po_id (FK), note
- **goods_receipt_line**: gr_id, po_line_id, qty_received

**purchase_invoice**: no, date, supplier_id, gr_id (FK, nullable), dpp, ppn, total, status: enum(open, paid), due_date

### Transaksi penjualan

**sales_order** (SO): no, date, customer_id (FK), project_id (FK, nullable), status
- **sales_order_line**: so_id, item_id, qty, unit_price, amount

**delivery_order** (surat jalan): no, date, so_id (FK), project_id (FK, nullable), status
- **delivery_order_line**: do_id, item_id, qty

**sales_invoice** (faktur penjualan): no, date, customer_id, tax_invoice_no (faktur pajak), po_ref, project_id (nullable), dpp, ppn(11%), total, status: enum(draft, sent, accepted, paid)
- **sales_invoice_line**: si_id, item_id, part_no, name, qty, uom, unit_price, amount
- **document_validation** (opsional, meniru "AI validation" Komatsu): si_id, field, input_value, system_value, is_match
- **document_log**: si_id, action, status, author, at

### Persediaan

**stock_move**: item_id, date, ref_type, ref_id, qty_in, qty_out, project_id (nullable), note
(semua penerimaan/pengiriman/penyesuaian menulis ke sini; stok = SUM(in) − SUM(out))

### Proyek

**project_task** (gaya MS Project): project_id (FK), name, pic_id (FK employee), plan_start, plan_end, actual_start, actual_end, deadline, progress (0–100), depends_on (FK self, nullable)

**work_report** (laporan pekerjaan karyawan): task_id (FK), employee_id (FK), date, description, progress, photo_url (nullable)

**bast** (berita acara serah terima): no, date, project_id (nullable), po_ref, customer_id, source_invoice_id (FK sales_invoice, nullable — auto-isi item dari PO/faktur)
- **bast_line**: bast_id, item_id, part_no, name, qty, uom

### Absensi & Gaji

**attendance** (absensi harian): employee_id (FK), date, clock_in, clock_out, status: enum(hadir, izin, sakit, alpha)

**overtime** (lembur): employee_id, date, hours, rate, amount, approved_by (nullable)

**cash_advance** (kasbon): employee_id, date, amount, reason, status: enum(pending, approved, rejected), approved_by, remaining
- alur: karyawan ajukan → status pending → HRD approve/reject → jika approved tambah `remaining`, dan dikurangi lewat cicilan di payslip

**employee_loan** (hutang pegawai): employee_id, date, principal, remaining, installment

**payslip** (slip gaji): employee_id, period (YYYY-MM), base_salary, allowance, overtime_amount, gross, bpjs, tax_pph21, kasbon_installment, loan_installment, deduction_total, net_pay
- dihitung: gross = base + allowance + overtime; net = gross − deduction_total

### Akuntansi

**account** (COA) — lihat §5
- code, name, type: enum(aset, kewajiban, ekuitas, pendapatan, beban), tax_code (KAP Coretax, nullable), tax_name (nullable), parent_id (nullable)

**journal_entry**: no (JV-xxxx), date, ref_type, ref_id, ref_no, type (Penjualan/Pembelian/Penggajian/…), is_auto (bool)
- **journal_line**: entry_id (FK), account_code (FK account), debit, credit
- invariant: SUM(debit) = SUM(credit) per entry

**fixed_asset**: code, name, acquisition_date, cost, useful_life_months, method: enum(straight_line), accumulated_depreciation, book_value

---

## 4. Jurnal otomatis ("no man touch") — aturan posting

Setiap transaksi yang di-*posting* otomatis membuat `journal_entry` + `journal_line` (is_auto = true, read-only). Tambah jenis transaksi baru = tambah satu aturan di bawah, engine tetap sama.

| Transaksi | Debit | Kredit |
|---|---|---|
| Faktur Penjualan | Piutang Usaha (total) | Penjualan (dpp), PPN Keluaran (ppn) |
| Penerimaan dari pelanggan | Bank/Kas (total) | Piutang Usaha (total) |
| Faktur Pembelian | Persediaan/Beban (dpp), PPN Masukan (ppn) | Utang Usaha (total) |
| Pembayaran ke pemasok | Utang Usaha (total) | Bank/Kas (total) |
| Penggajian | Beban Gaji & Upah (gross) | Utang PPh 21 (pph21), Utang Kasbon/Kas (sisa) |
| Kasbon disetujui | Piutang Karyawan (amount) | Kas (amount) |
| Penyusutan bulanan | Beban Penyusutan | Akumulasi Penyusutan |

Aturan diimplementasi sebagai map `type -> function(trx) -> lines[]`, dipanggil saat dokumen di-*post*. Kunci: engine memvalidasi debit = kredit sebelum menyimpan.

---

## 5. Chart of Accounts (COA)

Akun pajak WAJIB memakai **Kode Akun Pajak (KAP) Coretax** (PER-10/PJ/2024) di field `tax_code`. Akun non-pajak pakai penomoran standar di bawah (silakan ganti bila perusahaan sudah punya COA sendiri).

| Kode | Nama Akun | Tipe | KAP Coretax |
|---|---|---|---|
| 1-1100 | Kas | Aset | — |
| 1-1200 | Bank | Aset | — |
| 1-1300 | Piutang Usaha | Aset | — |
| 1-1400 | Persediaan Bahan | Aset | — |
| 1-1500 | Piutang Karyawan (Kasbon) | Aset | — |
| 1-1600 | PPN Masukan | Aset | 411211 — PPN Dalam Negeri |
| 2-2100 | Utang Usaha | Kewajiban | — |
| 2-2200 | PPN Keluaran | Kewajiban | 411211 — PPN Dalam Negeri |
| 2-2300 | Utang PPh Pasal 21 | Kewajiban | 411121 — PPh Pasal 21 |
| 2-2400 | Utang PPh Pasal 23 | Kewajiban | 411124 — PPh Pasal 23 |
| 2-2500 | Utang PPh Badan 25/29 | Kewajiban | 411126 — PPh Pasal 25/29 Badan |
| 3-3100 | Modal | Ekuitas | — |
| 4-4100 | Penjualan | Pendapatan | — |
| 5-5100 | Harga Pokok Penjualan | Beban | — |
| 6-6100 | Beban Gaji & Upah | Beban | — |

Referensi KAP lain bila diperlukan: 411128 PPh Final, 411122 PPh Pasal 22, 411212 PPN Impor.
Catatan: Coretax hanya mendefinisikan KAP untuk jenis pajak, bukan COA umum — jadi hanya akun pajak yang "sesuai Coretax".

---

## 6. Hak akses (role-based)

| Peran | Akses |
|---|---|
| Admin / Direksi | semua modul |
| HRD / Keuangan | Absensi & Gaji, Kas & Bank, Buku Besar, approve kasbon |
| PIC Proyek | proyek yang dipegang: tugas, progress, pembelian/SJ di-tag proyeknya |
| Karyawan | portal self-service (lihat bawah) — hanya data miliknya |

**Portal karyawan (self-service)** — menu terbatas, data difilter `employee_id = user`:
- Beranda Saya (jadwal & tugas hari ini, ringkasan gaji/kasbon)
- Jadwal & Tugas Saya (project_task where pic_id = saya)
- Laporan Pekerjaan (buat work_report per task)
- Pengajuan Kasbon (buat cash_advance status=pending → approval HRD)
- Slip Gaji (payslip bulan berjalan & sebelumnya)
- Sisa Kasbon/Hutang (cash_advance.remaining + employee_loan.remaining)
- Absensi Saya (clock in/out)

Approval kasbon: default **1 level (HRD)**. Bisa dijadikan bertingkat (atasan → HRD) lewat tabel approval bila diperlukan — **keputusan ini masih menunggu konfirmasi.**

---

## 7. Dokumen cetak (print-out)

Template sudah ada di prototipe (`window.print()` + CSS `.printable`). Untuk versi asli, jadikan template server-side/PDF:

- **Faktur Penjualan / Sales Invoice** — kop perusahaan + NPWP, tabel item, DPP/PPN/Total, tanda tangan.
- **Slip Gaji** — pendapatan (pokok/tunjangan/lembur) vs potongan (BPJS/kasbon/PPh21), terima bersih, sisa hutang.
- **Berita Acara Serah Terima (BAST)** — auto-isi item dari PO/faktur, dua pihak, tanda tangan.
- Menyusul: PO cetak, Surat Jalan, rekap absensi, laporan biaya proyek.

---

## 8. Status prototipe & antrean kerja

Sudah hidup di `EmeraldERP.jsx`: Beranda, Pesanan Pembelian, Faktur Penjualan (+detail +cetak), Tugas & Jadwal (MS Project), Data Karyawan, Absensi Harian, Penggajian (+slip), BAST (+cetak), Daftar Akun (COA Coretax), Bukti Jurnal otomatis.

Antrean berikutnya:
1. Portal karyawan 2-peran (butuh keputusan approval kasbon 1-level/bertingkat).
2. Buku Besar per akun (saldo berjalan dari journal_line) + Laba Rugi & Neraca.
3. Posting otomatis untuk penerimaan/pembayaran kas & penyusutan.
4. Pindah stok/persediaan berbasis `stock_move`.
5. Sambungkan ke backend + database sesuai dokumen ini.

---

## 9. Modul tambahan — paritas fungsi dengan Accurate 5 Enterprise

Emerald ERP dibangun untuk menyamai **fungsi, alur kerja, dan logika bisnis** Accurate 5
Enterprise (produk komersial yang sebelumnya dipakai) — bukan tampilannya. Bagian ini
mendokumentasikan modul yang ditambahkan setelah build awal di §1–§8, hasil perbandingan
fitur publik Accurate 5 Enterprise terhadap skema yang sudah ada. Style visual Emerald
(navy `#1F3A6E` + gold `#C7A24A`, Poppins) tetap dipakai — tidak meniru layar/ikon Accurate.

### 9.1 Persediaan — multi-gudang, metode costing, batch/serial

- **warehouse**: code, name, address, is_default. Setiap `stock_move` sekarang tertaut ke
  satu gudang (`warehouse_id`, nullable untuk kompatibilitas mundur dengan mutasi lama —
  tapi service layer selalu mengisinya untuk mutasi baru, fallback ke gudang default).
  Stok per barang per gudang tetap dihitung dari mutasi (`SUM(qty_in) - SUM(qty_out)`
  difilter `warehouse_id`), bukan angka tersimpan — prinsip yang sudah ada di §3
  dipertahankan.
- **item.costing_method**: enum `average` (default) | `fifo`. **Judgment call**: default
  `average` karena lebih sederhana dan aman untuk bisnis yang belum menegaskan butuh FIFO;
  bisa diganti per-item lewat menu Barang & Jasa.
- **stock_move** tambahan field: `batch_no`, `serial_no`, `expiry_date` (semua nullable,
  opsional diisi), dan `unit_cost` — biaya per unit pada saat mutasi itu, hasil dari engine
  costing (bukan lagi placeholder).
- **stock_layer** (khusus item FIFO): item_id, warehouse_id, qty_remaining, unit_cost,
  in_date. Stock-in FIFO membuka layer baru; stock-out mengonsumsi layer tertua dulu
  (`in_date`/`id` ascending), unit_cost pada `stock_move` keluar = rata-rata tertimbang
  dari layer yang terkonsumsi.
- **Engine costing** (`backend/src/inventory/costing.service.ts`): `stockIn`/`stockOut`/
  `transfer`. `average` dihitung on-the-fly dari nilai on-hand (turunan mutasi, konsisten
  dengan prinsip stok-dari-mutasi), tidak ada saldo rata-rata tersimpan terpisah.
- **HPP Penjualan diposting otomatis** saat Surat Jalan (`delivery_order`) dibuat, untuk
  baris barang bertipe `stock`: Debit Harga Pokok Penjualan (5-5100), Kredit Persediaan
  (1-1400), sebesar biaya riil hasil engine costing — lihat aturan baru di §4 di bawah.
  Sebelumnya tidak ada posting HPP sama sekali di titik penjualan; ini melengkapi celah itu.
- **Transfer Barang** antar gudang: `POST /stock-moves/transfers` — satu pasang stock_move
  (keluar dari asal, masuk ke tujuan) pada biaya yang sama (dari engine costing di gudang asal).
- **Judgment call**: retur penjualan (barang masuk kembali) dicatat pada `item.lastCost`
  (biaya terakhir diketahui) karena faktur penjualan tidak menyimpan biaya pokok per baris —
  pendekatan pragmatis terbaik yang tersedia tanpa mengubah skema penjualan.
- Endpoint: `GET/POST/PATCH/DELETE /warehouses`, `GET /stock-moves/by-warehouse/:itemId`,
  `POST /stock-moves/adjustments` (kini menerima `warehouseId`, `unitCost`, `batchNo`,
  `serialNo`, `expiryDate`), `POST /stock-moves/transfers`.
- Frontend: menu Persediaan → **Gudang & Transfer** (`frontend/src/pages/Persediaan.jsx`) —
  daftar gudang, stok per gudang per barang, form transfer.

**§4 — aturan jurnal baru:**

| Transaksi | Debit | Kredit |
|---|---|---|
| HPP Penjualan (Surat Jalan, barang stock) | Harga Pokok Penjualan (biaya riil) | Persediaan (biaya riil) |

### 9.2 Pabrikasi / Produksi (Enterprise-tier, tergantung §9.1)

- **bill_of_material**: item_id (produk jadi), version (auto-increment per item), is_active
  (hanya satu versi aktif per item — versi baru otomatis menonaktifkan yang lama).
  - **bill_of_material_line**: bom_id, material_item_id, qty_per_unit, uom.
- **work_order**: no (WO-xxxx via NumberingService), date, product_item_id, bom_id,
  planned_qty, warehouse_id, conversion_cost (biaya tenaga kerja/overhead manual,
  opsional), status: enum(draft, in_progress, done, cancelled), project_id (nullable).
- Alur status: `draft → in_progress → done`, atau batal dari `draft`/`in_progress`. Tidak
  ada transisi keluar dari `done`/`cancelled`.
- **Posting ke "done"** (satu-satunya titik yang menyentuh stok & jurnal):
  1. Untuk tiap baris BOM: konsumsi bahan = qty_per_unit × planned_qty, stock-out lewat
     `CostingService` (biaya riil average/FIFO) dari `warehouse_id` Work Order.
  2. Barang jadi masuk (stock-in) sejumlah `planned_qty`, pada biaya per unit =
     (total biaya bahan terkonsumsi + conversion_cost) / planned_qty.
  3. Satu jurnal otomatis "Produksi" (`JournalService.postProduction`, §4 di bawah).
  4. Status Work Order → `done`.
- **§4 — aturan jurnal baru:**

  | Transaksi | Debit | Kredit |
  |---|---|---|
  | Produksi Selesai (Work Order → done) | Persediaan (barang jadi = bahan + konversi) | Persediaan (bahan terkonsumsi), Beban Konversi Produksi (6-6300, kalau conversion_cost > 0) |

  Catatan: karena COA sistem ini hanya punya satu akun Persediaan (1-1400, tidak
  dipecah bahan baku/WIP/barang jadi), transformasi bahan→barang jadi dicatat sebagai
  dua baris di akun yang sama (debit sisi produk jadi, kredit sisi bahan) — **judgment
  call** untuk tetap sederhana (lihat laporan akhir tugas ini) alih-alih menambah akun
  WIP terpisah yang tidak diminta spesifikasi.
- **Laporan** (read-only, pola sama dengan Laporan Keuangan): `GET
  /work-orders/reports/materials-used` (bahan terpakai per Work Order, dari
  `stock_move` refType=`work_order`), `GET /work-orders/reports/production`
  (rencana vs realisasi — realisasi = planned_qty kalau status `done`, 0 kalau belum).
- Endpoint: `GET/POST/PATCH/DELETE /boms`, `GET /boms/active/:itemId`,
  `GET/POST /work-orders`, `PATCH /work-orders/:id/status`.
- Frontend: menu **Pabrikasi → BOM & Work Order** (`frontend/src/pages/Pabrikasi.jsx`).

### 9.3 Anggaran per akun + Monitor Anggaran (Buku Besar)

- **budget**: company_id (0 = seluruh perusahaan, pola sama dengan `Counter.companyId`
  — lihat komentar di skema), period (YYYY-MM), account_id (FK), amount. Satu baris
  per kombinasi company+period+account (`@@unique`); `POST /budgets` adalah upsert
  (set ulang jumlahnya kalau sudah ada).
- **Monitor Anggaran** (`GET /budgets/monitor?period=YYYY-MM`) murni fitur baca/
  perbandingan — bukan transaksi baru: realisasi dihitung dari SUM `journal_line`
  pada akun & periode yang sama, tandanya mengikuti saldo normal akun (sama seperti
  `ReportsService.bukuBesar` — aset/beban dibaca apa adanya, pendapatan/kewajiban/
  ekuitas dibalik). Selisih = anggaran − realisasi.
- Endpoint: `GET/POST/DELETE /budgets`, `GET /budgets/monitor`.
- Frontend: menu **Buku Besar → Monitor Anggaran** (`frontend/src/pages/Anggaran.jsx`).

### 9.4 RAB (Rencana Anggaran Biaya) per proyek

- **project_budget**: project_id (unik — satu RAB per proyek).
  - **project_budget_line**: project_budget_id, category (nullable), description,
    planned_amount. `POST /project-budgets` mengganti seluruh baris RAB proyek
    sekaligus (kirim ulang semua baris tiap kali diedit — sederhana, tidak perlu
    endpoint PATCH per baris).
- **Realisasi biaya proyek** (`GET /project-budgets/:projectId/realization`) —
  fitur baca, bukan transaksi baru: menjumlah ulang transaksi yang **sudah**
  di-tag `project_id` (prinsip "input di modul asal", §2 dokumen ini) —
  Faktur Pembelian yang PO-nya di-tag proyek ini + `stock_move` keluar yang
  langsung di-tag proyek ini (dinilai pada `unit_cost`-nya, §9.1). Tidak
  memasukkan Faktur Penjualan/SO — itu pendapatan terhadap `contract_value`,
  bukan biaya.
- Endpoint: `GET /project-budgets/:projectId`, `GET
  /project-budgets/:projectId/realization`, `POST /project-budgets`.
- Frontend: menu **Proyek & Departemen → RAB & Realisasi Biaya**
  (`frontend/src/pages/RAB.jsx`).

### 9.5 Cek/Giro (Kas & Bank)

- **cheque_giro**: no (CEK-xxxx/GIRO-xxxx via NumberingService), type: enum(cek, giro),
  bank_account (teks bebas — nama bank/no rekening fisik cek/gironya, BUKAN akun GL),
  amount, due_date, direction: enum(incoming, outgoing), status: enum(pending, cleared,
  bounced), account_id (FK Account — akun Kas/Bank GL yang dipakai saat dicairkan),
  partner_id (nullable), sales_invoice_id (wajib kalau direction=incoming),
  purchase_invoice_id (wajib kalau direction=outgoing), company_id (nullable),
  cash_transaction_id (nullable, unik).
- Cek/Giro **selalu** tertaut ke faktur yang dilunasinya (mis. bagaimana cek/giro
  dipakai di Indonesia: instrumen pembayaran untuk melunasi piutang/utang usaha yang
  sudah tercatat, bukan transaksi baru).
- **Alur pencairan** (`PATCH /cheque-giros/:id/clear`): hanya boleh saat status
  `pending` DAN tanggal berjalan >= `due_date`. Begitu dicairkan, **tidak menulis
  aturan jurnal baru** — memanggil `CashTransactionsService.create()` yang SUDAH ADA
  (§4: `postCustomerReceipt`/`postSupplierPayment`), persis seperti pelunasan tunai
  biasa, lalu menautkan `cash_transaction_id` dan set status `cleared` (ini juga yang
  otomatis menandai faktur terkait `paid`, mengikuti perilaku `CashTransactionsService`
  yang sudah ada).
- **Ditolak bank** (`PATCH /cheque-giros/:id/bounce`): status → `bounced`, tidak
  menyentuh jurnal sama sekali (uang memang tidak pernah berpindah).
- Endpoint: `GET/POST /cheque-giros`, `PATCH /cheque-giros/:id/clear`,
  `PATCH /cheque-giros/:id/bounce`.
- Frontend: menu **Kas & Bank → Cek/Giro** (`frontend/src/pages/ChequeGiro.jsx`).

### 9.6 Laporan konsolidasi multi-company (prioritas rendah)

- Tidak ada entitas baru — murni komposisi ulang `ReportsService.labaRugi()`/`neraca()`
  yang sudah ada (keduanya sudah menerima `companyId` opsional): `konsolidasi()`
  memanggilnya sekali per `company` aktif untuk baris per-perusahaan, lalu sekali lagi
  **tanpa** `companyId` untuk baris "Gabungan" (query tanpa filter company otomatis
  menjumlah semua company, termasuk jurnal lama tanpa `company_id`).
- Endpoint: `GET /reports/konsolidasi?from=&to=&asOf=` (asOf default = `to`).
- Frontend: tab baru **Konsolidasi Multi-Company** di halaman Laporan Keuangan yang
  sudah ada (`frontend/src/pages/Laporan.jsx`) — bukan halaman baru, karena §9.6
  memang perluasan laporan yang sudah ada, bukan modul baru.

---

## 10. Paritas granular — audit & pengetatan mekanisme (lanjutan §9)

§9 menutup enam celah struktural (multi-gudang+costing, Pabrikasi, Anggaran, RAB,
Cek/Giro, laporan konsolidasi) plus responsive UI. Bagian ini adalah pass
berikutnya: **detail mekanis** yang membuat sistem terasa identik dengan produk
Accurate 5 Enterprise tertentu, bukan sekadar "ERP yang masuk akal" — riset dari
dokumentasi publik Accurate (help center, materi training reseller, forum) via
web search, dan (kalau publik tidak cukup detail) dari mekanisme umum
ERPNext/standar akuntansi Indonesia, diimplementasikan dengan konvensi kode
sistem ini sendiri. Tidak ada tampilan Accurate yang ditiru — hanya
struktur/aturan data.

### 10.1 Format penomoran dokumen

Format tampilan `NumberingService.next()` diperpendek dari `PREFIX-YYYY-SEQ`
(4 digit tahun) jadi **`PREFIX-YY-SEQ`** (2 digit tahun, tetap 6 digit sequence
zero-padded, mis. `SI-26-000001`) — materi training Accurate & pola penomoran
Journal Voucher yang terdokumentasi publik (kode cabang + kode jenis + **2 digit
tahun** + serial) konsisten memakai tahun 2 digit, bukan 4. `Counter` tetap
menyimpan tahun penuh (4 digit) sebagai kunci reset-per-tahun — cuma string yang
ditampilkan yang berubah, mekanisme atomic upsert+increment tidak disentuh.
Prefix per jenis dokumen (`PO`, `SI`, `SO`, `DO`, `PINV`, `JV`, dst — lihat
pemanggilan `numbering.next()` di tiap service) dipertahankan apa adanya: sudah
konsisten dengan singkatan yang dipakai materi training Accurate untuk jenis
dokumen inti (`SI` untuk Sales Invoice, `PO`/`SO`/`JV` seperti sudah disepakati
di §4), dan jenis dokumen tambahan Emerald (`PRET`, `SRET`, `CEK`, `GIRO`, `WO`,
`CR`/`CP`, `BAST`) tidak punya padanan kode baku Accurate yang terdokumentasi
publik untuk ditiru, jadi tetap dipakai apa adanya.

### 10.2 Pembulatan PPN

Aturan resmi (PER-11/PJ/2025, menggantikan PER-29/PJ/2015): PPN dibulatkan ke
rupiah penuh dengan **half-up** (turun kalau desimal < 0,50, naik kalau ≥ 0,50)
— sama seperti perilaku `Math.round`/`Prisma.Decimal` default (`ROUND_HALF_UP`)
yang sudah dipakai sistem ini. Accurate sendiri membulatkan PPN **di level
dokumen** (preferensi "Rounded Upper" per faktur, bukan per baris) — pola
**sum-then-round** yang sudah dipakai `SalesInvoicesService`/dkk (jumlah baris
dulu, baru PPN dihitung & dibulatkan sekali dari total DPP) SUDAH BENAR, tidak
diubah. Yang diperbaiki: tiga tempat (`SalesInvoicesService`,
`SalesReturnsService`, `PurchaseReturnsService`) yang menghitung PPN dengan
`Math.round(Number(dpp) * rate)` manual (konversi ke `Number`, rawan presisi
untuk nilai besar) sekarang memakai `percentOf()` (`money.util.ts`) yang sudah
ada — hasil angkanya sama untuk skala rupiah wajar, tapi konsisten & lebih aman.
PPh 21/23 tetap seperti sebelumnya: `sales_invoice.pph` informational-only
(potongan pembeli, tidak masuk jurnal penjual) dan `payslip.taxPph21` input
manual (tidak ada mesin hitung PTKP/TER — di luar cakupan pass ini).

### 10.3 Costing — stok minus & retur

- **Stok minus dicegah**: `CostingService.stockOut()` sekarang menolak
  (`BadRequestException`) stock-out yang membuat qty on-hand di gudang itu jadi
  negatif — perilaku *default* Accurate (preferensi "Warehouse qty can < 0"
  NONAKTIF secara default: transaksi keluar yang melebihi qty tersedia
  ditolak dengan error). Berlaku otomatis ke semua pemanggil `stockOut()`
  (Surat Jalan, retur pembelian, konsumsi bahan Work Order, penyesuaian,
  transfer) karena semuanya lewat satu method itu.
- **Retur penjualan direstock pada biaya keluar terakhir, bukan `lastCost`**:
  `item.lastCost` sebenarnya field sisi MASUK (diisi tiap stock-in — biaya
  pembelian/produksi terakhir), bukan biaya barang itu saat DIJUAL. Method baru
  `CostingService.lastIssueCost()` mencari stock-out terakhir untuk
  item+gudang itu pada/sebelum tanggal faktur asli, dipakai `SalesReturnsService`
  menggantikan `item.lastCost`. **Judgment call**: `SalesInvoice` tidak
  menyimpan FK ke Surat Jalan/stock_move asalnya, jadi ini pendekatan terbaik
  yang tersedia tanpa mengubah skema alur penjualan — bukan kepastian mutlak
  cocok 1:1 dengan stock_move asli kalau ada lebih dari satu pengiriman untuk
  item yang sama di rentang waktu berdekatan.

### 10.4 Status dokumen & pembatalan

- **PurchaseOrder**: transisi status sekarang divalidasi (`draft → sent →
  received|cancelled`; `draft → cancelled` langsung; `received`/`cancelled`
  final) — sebelumnya `updateStatus()` menerima status apa saja. Faktur
  Pembelian menolak memfaktur PO yang sudah `received` (mencegah PO
  ter-invoice dua kali dan stock-in dobel — sistem ini sengaja tidak punya GRN
  terpisah, lihat `backend/README.md`, jadi satu PO cuma boleh diterima penuh
  sekali) atau `cancelled`.
- **SalesInvoice**: transisi status divalidasi (`draft → sent → accepted →
  paid`); status `void` sengaja tidak bisa dicapai lewat `updateStatus()` biasa.
- **Pembalik jurnal (void) — sebelumnya tidak ada jalan sama sekali**:
  `JournalService.reverseEntry()` baru — TIDAK PERNAH mengubah/menghapus baris
  jurnal yang sudah ada (prinsip "no man touch" §4), sebagai gantinya membuat
  entry pembalik (debit/kredit ditukar) dan menandai entry asal `voidedAt`.
  Ini persis perilaku Accurate: fitur "Void" pada transaksi yang sudah posting
  otomatis membuat jurnal pembalik. `PATCH /sales-invoices/:id/void` dan
  `PATCH /purchase-invoices/:id/void` memakainya; versi Faktur Pembelian juga
  membalik stock-in yang dibuatnya (menolak kalau stok itu sudah terpakai —
  konsekuensi wajar dari §10.3's guard stok minus) dan mengembalikan PO
  tertaut ke status `sent`. Keduanya menolak void kalau faktur sudah ada
  pembayaran/retur/cek-giro tertaut (§10.6).

### 10.5 Struktur Laporan Keuangan (PSAK)

- **Laba Rugi**: sekarang multi-step (Pendapatan → Harga Pokok Penjualan →
  **Laba Kotor** → Beban Operasional → **Laba Usaha** → Laba Bersih), bukan
  cuma dua daftar rata Pendapatan/Beban. HPP dipisah lewat `COA_CODE.HPP` yang
  sudah ada (satu-satunya akun HPP di COA dasar), bukan field baru. Laba Usaha
  = Laba Bersih untuk saat ini karena COA dasar belum punya akun
  pendapatan/beban lain-lain terpisah — bukan kesalahan, cuma cakupan COA yang
  masih sederhana.
- **Neraca**: Aset & Kewajiban dikelompokkan **Lancar/Tidak Lancar** (klasifikasi
  PSAK 1: direalisasi/diselesaikan dalam siklus operasi normal atau ≤12 bulan)
  lewat field baru `Account.isCurrent` (default `true`) — bukan pola nama/kode
  akun yang di-hardcode, karena COA memang didesain bisa diedit per perusahaan
  (§5). Seed menandai `Aktiva Tetap`/`Akumulasi Penyusutan` sebagai
  `isCurrent: false`; sisanya di COA dasar memang lancar semua (termasuk tidak
  adanya akun kewajiban jangka panjang — jadi bagian itu kosong, sesuai
  kenyataan, bukan bug).
- Field lama (`pendapatan`/`beban`/`totalBeban`/`labaRugiBersih`,
  `aset`/`kewajiban`/`totalAset`/`totalKewajiban`) tetap ada apa adanya di
  response API untuk kompatibilitas mundur (dipakai `konsolidasi()`).
  Buku Besar (`bukuBesar()`) sudah dicek — formatnya (saldo awal + mutasi +
  saldo berjalan) sudah standar, tidak diubah.

### 10.6 Validasi tingkat-field

- **Debit = kredit**: sudah terjamin sejak sebelum pass ini —
  `JournalService.postEntry()` melempar error kalau tidak balance, dan
  satu-satunya jalan menulis `journal_line` adalah lewat method itu (tidak ada
  endpoint create manual, `JournalEntriesController` read-only). Dikonfirmasi
  ulang, tidak ada perubahan kode.
- **Nomor dokumen duplikat**: sudah dicegah sejak sebelum pass ini — setiap DTO
  create TIDAK menerima `no` dari user (selalu dari `NumberingService`), kolom
  `no` selalu `@unique`, dan `PrismaExceptionFilter` global mengubah
  pelanggaran unique constraint jadi respons 409 yang rapi. Dikonfirmasi ulang,
  tidak ada perubahan kode.
- **Tutup buku periode — sebelumnya tidak diimplementasikan sama sekali**
  (§2/§8 sudah menyebutnya sejak awal, tapi belum ada baris kode untuk itu).
  Model baru `ClosedPeriod` (`period` + `companyId`, `0` = seluruh perusahaan —
  pola sama dengan `Counter`/`Budget`) + modul `closed-periods` (list/close/
  reopen, role admin & hrd_keuangan). Ditegakkan di SATU titik:
  `JournalService.assertPeriodOpen()`, dipanggil dari `postEntry()` DAN
  `reverseEntry()` — otomatis menutupi semua jenis dokumen transaksi yang ada
  maupun yang akan ditambah nanti, tanpa menyentuh modul lain satu per satu.
- **Tidak boleh hapus dokumen yang masih direferensikan**: untuk dokumen
  transaksi, sudah tertutupi oleh guard status PO (§10.4) dan guard void
  faktur (§10.4) — keduanya menolak kalau ada dokumen turunan. Diperluas ke
  master data: `PartnersService.remove()`/`ItemsService.remove()` sekarang
  menolak menghapus mitra/barang yang sudah dipakai di transaksi manapun
  (PO/SO/faktur/proyek untuk mitra; stock_move/baris dokumen manapun untuk
  barang) — mitra/barang yang belum pernah dipakai tetap bisa dihapus normal.

Semua perubahan di §10 diverifikasi langsung terhadap instance PostgreSQL lokal
(bukan cuma review kode statis) — lihat riwayat commit cabang ini untuk detail
tiap verifikasi.

---

## 11. Pass ketiga — modul & mekanisme tambahan (lanjutan §9/§10)

§9 menutup enam celah struktural, §10 adalah audit mekanis granular. Bagian ini
adalah pass ketiga: modul/fitur yang masih hilang dari perbandingan segar
terhadap Accurate 5 Enterprise (multi-currency, transaksi berulang,
import/export, approval PO, audit trail), plus dua verifikasi/perbaikan
mekanis (FEFO costing, kelengkapan field Faktur Pajak). Semua perubahan di
bawah diverifikasi langsung terhadap instance PostgreSQL lokal (dibuktikan
lewat request HTTP nyata ke server dev yang jalan, bukan cuma review kode
statis) — lihat riwayat commit cabang ini untuk detail tiap verifikasi.

### 11.1 Aktiva Tetap — metode penyusutan Saldo Menurun Ganda & Jumlah Angka Tahun

- `FixedAsset.method` (`DepreciationMethod`) sekarang punya tiga nilai:
  `straight_line` (Garis Lurus, sudah ada), `double_declining_balance` (Saldo
  Menurun Ganda), `sum_of_years_digits` (Jumlah Angka Tahun).
- `FixedAssetsService.computeMonthlyAmount()` — satu fungsi per metode:
  - **Garis Lurus**: `cost / usefulLifeMonths` per bulan (flat, tidak berubah).
  - **Saldo Menurun Ganda**: `bookValue * 2 / usefulLifeMonths` per bulan, DENGAN
    switch ke garis-lurus-atas-sisa (`bookValue / sisaBulan`) begitu itu lebih
    besar dari DDB murni — standar akuntansi supaya nilai buku persis habis di
    akhir umur (DDB murni tidak pernah mencapai nol tepat, mendekati asimtotik).
  - **Jumlah Angka Tahun**: digeneralisasi ke satuan bulan (bukan tahun) supaya
    kompatibel dengan job bulanan yang sudah ada — bobot bulan ke-m =
    `usefulLifeMonths - m + 1`, dibagi `usefulLifeMonths*(usefulLifeMonths+1)/2`.
    Totalnya otomatis pas sama dengan `cost` di akhir umur.
  - Ketiganya sama-sama memposting aturan jurnal §4 yang SAMA ("Beban
    Penyusutan / Akumulasi Penyusutan") — cuma `amount`-nya beda.
- `monthsElapsed` (dipakai DDB & SYD) diturunkan dari HITUNGAN entry jurnal
  "Penyusutan" sebelumnya untuk aset itu (`JournalEntry` where refType=
  "fixed_asset" & type="Penyusutan") — bukan counter baru tersimpan, konsisten
  dengan prinsip "turunan dari riwayat" yang sudah dipakai stok/dll.
- **Bug ditemukan & diperbaiki saat verifikasi**: `runDepreciation()` sebelumnya
  memfilter `lastDepreciatedPeriod: { not: period }`, yang di Prisma
  dikompilasi jadi `<> period` SQL murni — NULL tidak pernah memenuhi itu, jadi
  aset yang BELUM PERNAH disusutkan (state awal normal) selalu terlewati di
  SETIAP metode, bukan cuma yang baru. Diperbaiki jadi `OR [{ lastDepreciatedPeriod:
  null }, { lastDepreciatedPeriod: { not: period } }]`.
- Endpoint tidak berubah (`POST /fixed-assets` terima `method` opsional,
  `POST /fixed-assets/depreciation/run` apa adanya).

### 11.2 Multi-currency

- `PurchaseInvoice`/`SalesInvoice` dapat `currency` (default `"IDR"`) dan
  `exchangeRate` (Decimal(18,4), default 1, Rupiah per 1 unit `currency`,
  diisi MANUAL pada tanggal transaksi — bukan rate-table/API, sesuai cara
  Accurate desktop bekerja & instruksi tugas). `dpp`/`ppn`/`total` TETAP
  Rupiah (invariant "uang selalu integer rupiah" di §1 tidak diubah) — untuk
  faktur mata uang asing, field itu adalah hasil konversi dari jumlah asing
  ke Rupiah pada `exchangeRate`. `SalesInvoiceLine.unitPrice/amount` sengaja
  TETAP dalam `currency` apa adanya (bukan dikonversi) — selaras juga dengan
  aturan DPP/PPN Faktur Pajak yang wajib Rupiah legal.
- **Selisih kurs terealisasi**: `JournalService.postCustomerReceipt`/
  `postSupplierPayment` sekarang terima parameter opsional (Rupiah yang
  DIBOOKING saat faktur dibuat, default = jumlah kas — jadi tidak berubah
  untuk faktur IDR biasa). `CashTransactionsService.create()` mengirim
  `invoice.total` untuk faktur non-IDR; selisih dari jumlah kas yang
  benar-benar diterima/dibayar otomatis diposting ke akun baru **Selisih
  Kurs** (4-4200, tipe pendapatan — bisa didebit/dikredit tergantung
  laba/rugi) dalam entry yang SAMA (tetap balance sendiri, tidak ada
  langkah revaluasi terpisah).
- `CashTransaction.exchangeRate` (opsional) — kurs saat pelunasan, murni
  informational/audit; perhitungan selisih kurs TIDAK bergantung padanya
  (diturunkan dari `amount` vs `invoice.total`, lebih robust).
- **Judgment call**: PO/SO TIDAK diberi field currency — eksposur kurs dan
  dampak jurnalnya sama-sama terjadi di titik faktur di sistem ini (PO/SO
  tidak memposting jurnal), jadi cukup di situ, sesuai instruksi tugas
  "keep this simple".

### 11.3 Transaksi berulang (recurring transactions)

- `RecurringTemplate`: `name`, `type` (sales_invoice | purchase_invoice),
  `payload` (JSON — body DTO create invoice APA ADANYA, tanpa `date`),
  `frequency` (monthly | weekly), `nextRunDate`, `isActive`.
- `RecurringGeneratedDraft`: satu baris per kejadian generate (`payload` +
  `templateRunDate` + status pending/confirmed/discarded).
- **Kenapa generate TIDAK langsung membuat SalesInvoice/PurchaseInvoice**: di
  sistem ini `create()` pada KEDUANYA selalu memposting jurnal seketika —
  status "draft" pada SalesInvoice cuma label alur kerja, bukan "belum
  diposting", dan PurchaseInvoice malah tidak punya status draft sama
  sekali. Jadi satu-satunya cara jujur memenuhi "generate draft, jangan
  auto-post" (instruksi tugas eksplisit: "never fully autonomous for money
  movement") adalah TIDAK memanggil `create()` sampai manusia menekan
  confirm — `generateDue()` cuma menulis baris `RecurringGeneratedDraft`
  (payload + tanggal terselesaikan, belum ada nomor dokumen/jurnal sama
  sekali) dan memajukan `nextRunDate`.
- `POST /recurring-templates/run-due` — SATU draft per panggilan per
  template jatuh tempo (bukan mengejar semua periode terlewat sekaligus),
  supaya template yang lama tidak dijalankan mendadak menghasilkan banyak
  draft; panggilan berulang (cron eksternal, atau manual) mengejar satu-satu.
- `POST /recurring-templates/drafts/:id/confirm` — BARU di sini dokumen
  sungguhan dibuat (lewat `SalesInvoicesService.create()`/
  `PurchaseInvoicesService.create()` yang SAMA persis dengan endpoint biasa,
  payload divalidasi ulang lewat DTO/class-validator sebelum dipanggil),
  atau `.../discard` untuk draft yang tidak jadi dipakai.
- Endpoint lain: `GET/POST/PATCH/DELETE /recurring-templates`,
  `GET /recurring-templates/drafts?status=`.

### 11.4 Import/Export CSV

- `backend/src/common/csv.util.ts` — parser/writer CSV tulisan tangan
  (RFC 4180-ringan: quoting, CRLF/LF, field ber-koma/kutip). Tidak ada
  dependency CSV di `package.json` sebelumnya dan kebutuhannya sederhana
  (baris flat), jadi tidak ditambah dependency baru.
- **Import** (upsert per kolom `code`, satu baris gagal tidak menggagalkan
  baris lain — dikumpulkan di `errors` dengan nomor baris):
  `POST /items/import`, `POST /partners/import`.
- **Export**: `GET /items/export/csv`, `GET /partners/export/csv` (`?type=`),
  `GET /purchase-invoices/export/csv`, `GET /sales-invoices/export/csv`,
  `GET /stock-moves/export/csv`.
- Frontend: komponen `ImportExportBar` (`frontend/src/components/
  ImportExport.jsx`) dipakai di halaman **Barang & Jasa** (baru,
  `pages/BarangJasa.jsx`) dan **Mitra** (baru, `pages/Mitra.jsx`, dipakai
  untuk menu Pemasok DAN Pelanggan lewat prop `type`) — keduanya sebelumnya
  cuma Placeholder; **Faktur Penjualan** (`InvoiceList.jsx`, tombol export)
  dan **Gudang & Transfer** (`Persediaan.jsx`, export mutasi stok). **Judgment
  call**: **Faktur Pembelian** juga sebelumnya cuma Placeholder DAN tidak
  punya alur pembuatan di frontend sama sekali (faktur pembelian dibuat
  ditautkan ke PO) — dibuat halaman list read-only baru (`pages/
  PurchaseInvoiceList.jsx`) dengan tombol export saja, bukan form
  pembuatan penuh (di luar cakupan "tombol Import/Export dasar").
- Barcode: field data murni `Item.barcode` (opsional) ditambahkan sekalian
  (murah, disebut eksplisit boleh di instruksi tugas) — TIDAK ada integrasi
  hardware scanner (di luar cakupan web app).

### 11.5 Approval Purchase Order

- `PurchaseOrder.approvedBy`/`approvedAt` (nullable). `PATCH
  /purchase-orders/:id/approve` (role admin/hrd_keuangan — sama dengan
  tier HRD kasbon, single-level, TIDAK dibuat generic approval engine baru
  sesuai instruksi tugas) — hanya untuk PO berstatus draft, menolak
  approve ulang.
- Transisi status yang sudah ada (`updateStatus()`, §10.4) sekarang
  menolak `draft -> sent` kalau `approvedBy` masih kosong. `draft ->
  cancelled` tetap bebas (membatalkan PO yang belum pernah dikirim tidak
  butuh approval).

### 11.6 Audit trail

- `AuditLog`: `actorId`, `action` (string bebas: post/void/approve/reject/
  cancel/confirm/discard/close/reopen/clear/bounce/status_change),
  `entityType`, `entityId`, `before`/`after` (JSON), `at`.
- Satu titik tulis: `AuditLogService.record()` (`backend/src/common/
  audit-log/`), modul `@Global()` supaya tiap service yang butuh cukup
  inject tanpa daftar di `imports` masing-masing. Terima parameter `db`
  opsional (pola sama dengan `JournalService`/`CostingService`) supaya
  baris audit atomik dengan transaksi perubahan dokumennya.
  `before`/`after` disaring lewat serialize BigInt-safe (uang selalu
  BigInt di sistem ini, `JSON.stringify` biasa akan error tanpa replacer)
  sebelum disimpan ke kolom JSON.
- Dipasang di titik status-berubah pada modul yang sudah ada: PurchaseOrder
  (transisi status, approve), PurchaseInvoice/SalesInvoice (post-saat-
  create, void), CashAdvance (tier1 decide, decide final), ChequeGiro
  (clear, bounce), ClosedPeriod (close, reopen), WorkOrder (transisi
  status termasuk posting produksi), RecurringTemplate (confirm/discard
  draft) — BUKAN interceptor level-ORM yang mencatat SETIAP edit field
  (berlebihan untuk cakupan ini, instruksi tugas eksplisit).
- `GET /audit-log?entityType=&entityId=` (admin/hrd_keuangan) — riwayat
  untuk satu dokumen.

### 11.7 Costing — verifikasi FEFO untuk item ber-kedaluwarsa

- Diverifikasi (bukan diasumsikan): `CostingService.consumeFifoLayers()`
  SEBELUM pass ini cuma mengurutkan konsumsi layer FIFO berdasarkan
  `inDate`/`id` ascending — `expiryDate` diabaikan sama sekali, dan malah
  belum disimpan di `stock_layer` sama sekali (cuma ada di `stock_move`).
- Ditambahkan: `Item.tracksExpiry` (default false, opt-in per item) dan
  `StockLayer.batchNo`/`expiryDate` (diisi dari param `stockIn()` yang
  sudah ada). `consumeFifoLayers()` sekarang mengurutkan
  `[expiryDate asc nulls last, inDate asc, id asc]` kalau
  `item.tracksExpiry` true (FEFO — first-expired-first-out), atau
  `[inDate asc, id asc]` seperti semula kalau false (FIFO murni, TIDAK ada
  perubahan perilaku untuk mayoritas item yang tidak mengaktifkan
  tracking ini).
- Diverifikasi: stock-in Batch A (masuk duluan, kedaluwarsa jauh, biaya
  1000) lalu Batch B (masuk belakangan, kedaluwarsa lebih dekat, biaya
  2000) untuk item FIFO+tracksExpiry, lalu stock-out — hasil unitCost =
  2000 (Batch B), membuktikan FEFO benar-benar dipakai (FIFO murni akan
  memilih Batch A/biaya 1000).

### 11.8 Print-out — kelengkapan field Faktur Pajak (Coretax, PER-11/PJ/2025)

- Diperiksa via web search (riset publik DJP Coretax, bukan diasumsikan)
  terhadap template Faktur Penjualan yang ada. Dua celah kepatuhan
  ditemukan & diperbaiki:
  1. `SalesInvoice.taxInvoiceNo` (Nomor Faktur Pajak/NSFP resmi terbitan
     Coretax — format 17 digit sejak PER-11/PJ/2025) tersimpan tapi TIDAK
     PERNAH dicetak di mana pun — cuma nomor internal (`no`) yang tampil.
     Sekarang dicetak sebagai "No. Faktur Pajak" kalau terisi.
  2. NPWP pembeli (wajib per PER-11/PJ/2025 pasal 33) — `Partner.npwp`
     sudah ada tapi tidak ditampilkan di faktur. Sekarang dicetak di blok
     pelanggan.
- Perbaikan tambahan di luar sekadar field hilang: kop dokumen bersama
  (`renderDocument()`, `printing/layout.util.ts`, dipakai SEMUA template
  cetak) sebelumnya selalu mencetak SATU NPWP brand yang di-hardcode,
  padahal sistem ini multi-company (§9.6) dan tiap `Company` punya
  `npwp` sendiri — salah untuk company manapun selain default.
  `renderDocument()` sekarang terima seller override opsional;
  `SalesInvoicesService.renderPdf()` mengirim `Company.npwp` faktur itu.
  Template lain (PO/BAST/Slip Gaji/Surat Jalan) tidak terpengaruh — tetap
  brand default seperti semula karena tidak mengirim override.
- NPWP penjual di kop, breakdown DPP/PPN, dan nama penandatangan di blok
  preparer sudah ada/benar sebelumnya — tidak disentuh.

Sumber riset: dokumentasi field wajib Faktur Pajak Coretax (PER-11/PJ/2025
pasal 33) dan format NSFP 17-digit terkini.

---

## 12. Pass keempat — tiga celah terakhir yang diketahui (lanjutan §9/§10/§11)

Pemilik proyek mengonfirmasi eksplisit dua hal berikut **permanen di luar
cakupan**, supaya pass berikutnya tidak menandainya lagi sebagai celah:

- **Submission e-Faktur/Coretax langsung ke API DJP** — butuh registrasi
  sertifikat elektronik resmi dengan otoritas pajak (dependency eksternal
  nyata, bukan sesuatu yang bisa "dibangun" dari sisi aplikasi). Sistem ini
  berhenti di kelengkapan FIELD faktur pajak (§11.8) — submission-nya sendiri
  tetap manual lewat portal Coretax DJP.
- **Re-arsitektur database-per-company** — `company_id`-based multi-tenancy
  (satu database, difilter per company) adalah keputusan desain yang diterima,
  bukan bug. §9.6 (laporan konsolidasi) sudah dibangun di atas asumsi ini.

Bagian ini menutup tiga celah fungsional/verifikasi terakhir yang diketahui:

### 12.1 Form pembuatan Faktur Pembelian

`PurchaseInvoiceList.jsx` (dibuat §11.4) sebelumnya read-only (list + export
CSV saja) — satu-satunya transaksi inti tanpa form pembuatan di frontend,
padahal `POST /purchase-invoices` sudah menerima payload lengkap sejak §11.2
(multi-currency). Ditambahkan `NewPurchaseInvoiceForm` mengikuti pola
`NewPOForm`/`NewInvoiceForm` yang sudah ada, dengan satu perbedaan struktural
disengaja: `purchase_invoice` TIDAK punya tabel baris sendiri (§3) — kalau
ditautkan ke PO (`poId`), baris/stock-in datang OTOMATIS dari baris PO itu di
backend, jadi form menampilkan baris PO tsb read-only (preview, bukan
editor) dan membiarkan total/DPP/PPN diisi/ditimpa manual supaya cocok
dengan angka di faktur fisik pemasok (bisa beda dari nilai PO). Pemilih PO
dibatasi ke PO berstatus "sent" milik pemasok yang dipilih (kenyamanan UI —
backend sendiri tidak mewajibkan `po.supplierId === dto.supplierId`).
Field multi-currency (`currency`/`exchangeRate`, ada di API sejak §11.2)
sekarang juga punya permukaan UI, sebelumnya API-only tanpa form manapun
yang mengeksposnya.

### 12.2 Kelengkapan audit trail

`AuditLogService.record()` (§11.6) sebelumnya cuma dipasang di PO, PI/SI,
CashAdvance, ChequeGiro, ClosedPeriod, WorkOrder, RecurringTemplate.
Diperluas ke modul dengan aksi state-changing nyata yang tersisa, pola
pemanggilan SAMA PERSIS (inject `AuditLogService`, panggil `record()` di
`$transaction` yang sudah ada kalau ada):

- **BAST**: `create` saat `POST /basts`, plus `print` saat
  `GET /basts/:id/print` — BAST yang dicetak ulang berarti ada salinan fisik
  baru beredar untuk ditandatangani, beda dari cetak PO/Faktur/Slip Gaji yang
  lebih sering cuma arsip internal (makanya cetak dokumen LAIN tetap tidak
  diaudit, judgment call disengaja).
- **Slip Gaji**: `post` di `generate()` — kalkulasi uang (gross/BPJS/PPh21/
  potongan/net) plus posting jurnal seketika, sama seperti alasan PI/SI.
- **Retur Penjualan & Retur Pembelian**: `post` di `create()` — sama-sama
  posting jurnal seketika begitu dibuat (tidak ada status draft).
- **Rekonsiliasi Bank**: `match`/`unmatch` pada baris rekening koran (tidak
  menyentuh jurnal — murni alat pencocokan — tapi tetap mengubah status
  dokumen, jadi tetap diaudit); controller-nya sekarang menyuntik
  `@CurrentUser()` yang sebelumnya tidak dibutuhkan.
- **Aktiva Tetap**: `depreciation_run` per ASET per pemanggilan
  `runDepreciation()` (satu baris audit per aset, bukan satu per batch run,
  supaya `GET /audit-log?entityType=fixed_asset&entityId=N` tetap bisa
  ditelusuri per aset).

**Judgment call**: Absensi (clock-in/clock-out) sengaja TIDAK diaudit —
volume tinggi, nilai forensik rendah (self-service harian, bukan dokumen
atau pergerakan uang), sesuai izin eksplisit instruksi tugas untuk
melewatinya dengan alasan.

Diverifikasi langsung terhadap instance PostgreSQL lokal (bukan cuma review
kode statis): membuat karyawan, generate slip gaji, membuat BAST, membuat
Faktur Pembelian ber-PO, lalu mengonfirmasi tiap aksi menulis baris
`AuditLog` yang diharapkan lewat `GET /audit-log`.

### 12.3 Verifikasi visual PDF cetak

Chromium tersedia di sandbox ini (Playwright-installed browser di
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) — beda dari dua pass
sebelumnya yang tidak bisa memverifikasi ini sama sekali. `PdfService` pakai
`puppeteer-core` (bukan `puppeteer` dengan browser terbundel) dan membaca
`PUPPETEER_EXECUTABLE_PATH`, jadi binary itu dipakai langsung tanpa
mengubah kode — cuma konfigurasi environment lokal (`.env`, di-gitignore,
tidak masuk commit).

PDF di-render SUNGGUHAN (bukan cuma baca kode) lewat endpoint print asli
server dev yang jalan (`node dist/main.js`), terhadap data yang benar-benar
dibuat lewat API (bukan data seed statis) — termasuk kasus yang secara
khusus menguji perbaikan §11.8 (NPWP pembeli + No. Faktur Pajak 17-digit).
Empat dari lima template diverifikasi visual (PDF disimpan, dirender ke PNG
lewat PyMuPDF karena tidak ada `pdftoppm`/ImageMagick di sandbox ini, lalu
diperiksa langsung):

- **PO** (`GET /purchase-orders/:id/print`) — bersih, kop+NPWP, tabel item,
  total, blok tanda tangan, tidak ada elemen tumpang tindih.
- **Faktur Penjualan** (`GET /sales-invoices/:id/print`) — No. Faktur Pajak
  17-digit dan NPWP pembeli (§11.8) tampil BENAR di posisi yang dimaksud,
  breakdown DPP/PPN/Total akurat, tidak ada field kosong/salah bind.
  Faktur uji dibuat khusus dengan `taxInvoiceNo` + `partner.npwp` terisi
  untuk memaksa kedua field itu benar-benar dirender, bukan cuma ada di skema.
  Faktur Penjualan yang sudah ada sebelumnya di database (dibuat pass
  sebelumnya) semuanya `taxInvoiceNo: null`, jadi tidak akan menguji jalur
  ini kalau tidak dibuat baru.
- **Slip Gaji** (`GET /payslips/:id/print`) — Pendapatan vs Potongan, Terima
  Bersih, semua angka cocok persis dengan respons API generate.
  Instansi verifikasi butuh karyawan baru (tidak ada karyawan tersimpan
  sebelumnya).
  Blok penandatangan menampilkan label peran ("Diterbitkan oleh
  HRD/Keuangan") dengan benar.
- **BAST** (`GET /basts/:id/print`) — dua blok tanda tangan pihak, tabel
  baris item, No PO, semuanya bind benar.

**Faktur Pembelian TIDAK diverifikasi visual** — bukan kelalaian: sistem
ini memang tidak punya template cetak Faktur Pembelian sama sekali (tidak
ada file di `backend/src/printing/templates/`, tidak ada endpoint
`.../print` di `PurchaseInvoicesController`), baik sebelum maupun sesudah
§12.1. §12.1 cuma menutup celah FORM PEMBUATAN di frontend, bukan
menambah kemampuan cetak baru — di luar cakupan instruksi tugas
("PDF Faktur Pembelian **kalau sudah ada** dari #1").

Tidak ada defect ditemukan di keempat template yang diverifikasi — tidak
ada perbaikan kode yang diperlukan untuk item ini.
