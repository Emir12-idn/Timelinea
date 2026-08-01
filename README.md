# Timelinea

Ms schedule

**Timelinea** adalah Google Apps Script yang berjalan di atas Google Sheets dan meniru fitur inti Microsoft Project:

- Daftar task dengan Duration, Predecessors, % Complete, Resource
- **Auto-scheduling**: Start/Finish tiap task dihitung otomatis dari dependency (mendukung Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish + lag/lead, contoh: `2FS+1`, `3SS-2`)
- **Critical path**: task pada jalur kritis (slack = 0) otomatis ditandai dan diwarnai merah
- **Gantt chart otomatis**, tergambar ulang di sheet setiap kali Anda mengedit task, lengkap dengan shading akhir pekan, garis penanda hari ini, dan progress bar sesuai % Complete
- Milestone (durasi 0) digambar sebagai diamond (◆)

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
4. Simpan, lalu kembali ke Google Sheet dan **refresh halaman**. Menu baru **Timelinea** akan muncul di menu bar.
5. Klik **Timelinea > Initialize / Reset Sheets** untuk membuat sheet `Tasks` dan `Settings` beserta data contoh.

Alternatif: gunakan [`clasp`](https://github.com/google/clasp) — file `src/appsscript.json` dan `.claspignore` di repo ini sudah disiapkan untuk `clasp push` langsung dari folder `src/`.

## Cara pakai

- **Sheet `Settings`**: atur tanggal mulai proyek, apakah akhir pekan dilewati, dan daftar hari libur.
- **Sheet `Tasks`**: isi Task Name, Duration (hari kerja), Predecessors, % Complete, Resource, dan centang Milestone bila perlu.
  - Kolom Predecessors menerima daftar ID dipisah koma, opsional dengan tipe dan lag, misalnya `2,3FS+1,4SS-2`.
  - Kolom Start/Finish, Critical, dan Slack diisi otomatis — jangan diedit manual.
- Setiap kali Anda mengubah Duration/Predecessors/Start/% Complete/Milestone, jadwal dan Gantt chart **otomatis dihitung ulang** (trigger `onEdit`).
- Menu **Timelinea > Recalculate Schedule** / **Refresh Gantt Chart** tersedia untuk memicu ulang secara manual.
- **Timelinea > Add Task Row** menambah baris baru dengan ID berurutan otomatis.

## Catatan desain

- Perhitungan jalur kritis (slack) menganggap semua dependency sebagai Finish-to-Start dengan lag 0 untuk kesederhanaan — tanggal Start/Finish tetap menghormati tipe dependency asli (FS/SS/FF/SF) sepenuhnya, hanya nilai slack untuk link non-FS yang merupakan aproksimasi.
- Lebar Gantt chart dibatasi 400 hari agar tetap dalam batas ukuran Google Sheets; proyek yang lebih panjang perlu dipecah menjadi beberapa fase.
