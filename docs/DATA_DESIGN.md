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
