# Timelinea

Ms schedule

**Timelinea** adalah Google Apps Script yang berjalan di atas Google Sheets dan meniru fitur inti Microsoft Project:

- Daftar task dengan Duration, Predecessors, % Complete, Resource, Cost
- **Sub-task berlapis (WBS)**: kolom `Level` untuk membuat task > subtask > sub-subtask sedalam apapun, ditampilkan sebagai grup baris yang bisa di-collapse/expand seperti outline di MS Project
- **Auto-scheduling**: Start/Finish tiap task dihitung otomatis dari dependency (mendukung Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish + lag/lead, contoh: `2FS+1`, `3SS-2`)
- **Cost control**: Cost/Day per task → Planned Cost & Actual Cost (mengikuti % Complete) dihitung otomatis, dan dirangkum (rollup) ke task induk serta ke total proyek di sheet Settings
- **Critical path**: task pada jalur kritis (slack = 0) otomatis ditandai dan diwarnai merah
- **Gantt chart otomatis**: per-hari untuk proyek pendek, otomatis beralih ke per-minggu untuk proyek panjang (>45 hari) supaya tetap muat di layar; hanya kolom ID + Task Name yang dibekukan agar chart punya ruang lebih
- Milestone (durasi 0) digambar sebagai diamond (◆), summary/task induk digambar sebagai bar gelap

## Instalasi

1. Buat Google Sheet baru di [sheets.google.com](https://sheets.google.com).
2. Buka **Extensions > Apps Script**.
3. Hapus isi `Code.gs` default, lalu buat file-file berikut di editor Apps Script (nama harus sama persis) dan salin isinya dari folder [`src/`](./src) di repo ini:
   - `Constants.gs`
   - `DateUtils.gs`
   - `Scheduler.gs`
   - `Gantt.gs`
   - `Code.gs`
   - `Triggers.gs`
4. Simpan, lalu kembali ke Google Sheet dan **refresh halaman**. Menu baru **Timelinea** akan muncul di menu bar (di desktop; lihat catatan mobile di bawah).
5. Klik **Timelinea > Initialize / Reset Sheets** untuk membuat sheet `Tasks` dan `Settings` beserta data contoh.

Alternatif: gunakan [`clasp`](https://github.com/google/clasp) — file `src/appsscript.json` dan `.claspignore` di repo ini sudah disiapkan untuk `clasp push` langsung dari folder `src/`.

**Catatan mobile**: menu custom Apps Script (menu "Timelinea") tidak muncul di aplikasi Google Sheets mobile maupun tampilan web mobile-nya — itu keterbatasan Google, bukan bug. Kalau menu tidak kelihatan, jalankan `initializeTimelineaHeadless` sekali langsung dari editor script (`script.google.com/d/<scriptId>/edit` > pilih fungsi di dropdown > Jalankan). Setelah sheet terbentuk, edit sel di Tasks tetap otomatis memicu perhitungan ulang di perangkat apa pun, karena itu jalan lewat trigger edit sel, bukan menu.

## Cara pakai

- **Sheet `Settings`**: atur tanggal mulai proyek, apakah akhir pekan dilewati, daftar hari libur, dan lihat Total Planned Cost / Total Actual Cost (Spent to Date) untuk seluruh proyek.
- **Sheet `Tasks`**: isi Task Name, Level, Duration (hari kerja), Predecessors, % Complete, Resource, Cost/Day, dan centang Milestone bila perlu.
  - Kolom **Level** (0, 1, 2, …) menentukan hierarki: task dengan Level lebih tinggi tepat di bawahnya jadi subtask. Task yang punya subtask otomatis jadi **summary task** — Start/Finish/Duration/% Complete/Cost-nya dihitung otomatis dari subtask-nya (rollup), bukan diisi manual.
  - Predecessors **tidak boleh** menunjuk ke summary task — arahkan ke subtask spesifik di dalamnya (atau ke beberapa subtask sekaligus, mis. `7FS,8FS`, kalau perlu menunggu semuanya selesai).
  - Kolom Predecessors menerima daftar ID dipisah koma, opsional dengan tipe dan lag, misalnya `2,3FS+1,4SS-2`.
  - **Cost/Day** dikalikan Duration jadi Planned Cost (untuk milestone, Cost/Day diperlakukan sebagai biaya flat satu kali). Actual Cost = Planned Cost × % Complete.
  - Kolom Start/Finish/Planned Cost/Actual Cost/Critical/Slack diisi otomatis — jangan diedit manual.
- Setiap kali Anda mengubah Level/Duration/Predecessors/Start/% Complete/Cost per Day/Milestone, jadwal, cost, dan Gantt chart **otomatis dihitung ulang** (trigger `onEdit`).
- Menu **Timelinea > Recalculate Schedule** / **Refresh Gantt Chart** tersedia untuk memicu ulang secara manual.
- **Timelinea > Add Task Row** menambah task baru (top-level) di baris paling bawah.
- **Timelinea > Add Sub-task** menyisipkan baris baru tepat di bawah baris yang sedang dipilih, dengan Level otomatis satu tingkat lebih dalam — cara tercepat membuat subtask baru.

## Catatan desain

- Perhitungan jalur kritis (slack) menganggap semua dependency sebagai Finish-to-Start dengan lag 0 untuk kesederhanaan — tanggal Start/Finish tetap menghormati tipe dependency asli (FS/SS/FF/SF) sepenuhnya, hanya nilai slack untuk link non-FS yang merupakan aproksimasi.
- Level harus naik tepat +1 per tingkat nesting (tidak boleh loncat, mis. dari Level 0 langsung ke Level 2) agar struktur induk/anak terbaca benar.
- Gantt chart dibatasi 400 kolom hari (mode harian) atau 260 kolom minggu (mode mingguan, ~5 tahun) agar tetap dalam batas ukuran Google Sheets; proyek yang lebih panjang perlu dipecah menjadi beberapa fase.
