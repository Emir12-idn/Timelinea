# Timelinea

Ms schedule

**Timelinea** adalah Google Apps Script yang berjalan di atas Google Sheets dan meniru fitur inti Microsoft Project:

- Daftar task dengan Duration, Predecessors, % Complete, Assigned To, Cost
- **Sub-task berlapis (WBS)**: kolom `Level` untuk membuat task > subtask > sub-subtask sedalam apapun, ditampilkan sebagai grup baris yang bisa di-collapse/expand seperti outline di MS Project
- **Auto-scheduling**: Start/Finish tiap task dihitung otomatis dari dependency (mendukung Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish + lag/lead, contoh: `2FS+1`, `3SS-2`)
- **Sheet `Resources` (tenaga kerja)**: daftar nama + gaji/hari. Satu task bisa diisi beberapa nama sekaligus (`Subur, Ade`) di kolom Assigned To — otomatis kelihatan siapa mengerjakan task apa, total hari kerja, dan total gaji tiap orang
- **Cost control**: gaji per task (dari Resources) + Cost/Day (material/alat) → Planned Cost & Actual Cost (mengikuti % Complete) dihitung otomatis, dirangkum ke task induk dan total proyek di sheet Settings
- **Critical path**: task pada jalur kritis (slack = 0) otomatis ditandai dan diwarnai merah
- **Gantt chart otomatis**: per-hari untuk proyek pendek, otomatis beralih ke per-minggu untuk proyek panjang (>45 hari) supaya tetap muat di layar; hanya kolom ID + Task Name yang dibekukan agar chart punya ruang lebih
- Milestone (durasi 0) digambar sebagai diamond (◆), summary/task induk digambar sebagai bar gelap
- **Arsip project terkunci**: "Mulai Project Baru" mengunci data project lama jadi file terenkripsi (`.tla`, tidak bisa dibuka aplikasi lain) dan mengosongkan Tasks untuk project berikutnya — tanpa perlu bikin Sheet baru. Arsip lama tetap bisa dilihat & diprint (read-only, tidak bisa disave) lewat menu Timelinea
- **Baseline (rencana vs aktual)**: "Set Baseline" membekukan Start/Finish saat ini sebagai rencana awal; kolom Variance menunjukkan berapa hari project melenceng (positif = telat, negatif = lebih cepat) dari rencana itu — task yang telat disorot warna oranye mencolok di seluruh barisnya, sisanya sengaja dibuat kalem/adem di mata
- **Sheet `Issues`**: catatan masalah per task (kapan terjadi, penyebab, penyelesaian, status) supaya masalah yang sama tidak terulang di project berikutnya — tidak ikut terhapus oleh Initialize atau Mulai Project Baru

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
   - `Archive.gs`
   - `ArchiveDialog.html` (buat lewat File > HTML, bukan Script, di editor Apps Script)

   Kalau punya [`clasp`](https://github.com/google/clasp) terpasang, jalankan `./scripts/deploy.sh "<secret-acak>"` sekali (menyimpan secret ke `.secrets/`, gitignored) untuk deploy lewat CLI tanpa copy-paste manual dan tanpa risiko secret asli ikut ter-commit.
4. Simpan, lalu kembali ke Google Sheet dan **refresh halaman**. Menu baru **Timelinea** akan muncul di menu bar (di desktop; lihat catatan mobile di bawah).
5. Klik **Timelinea > Initialize / Reset Sheets** untuk membuat sheet `Tasks` dan `Settings` beserta data contoh.

Alternatif: gunakan [`clasp`](https://github.com/google/clasp) — file `src/appsscript.json` dan `.claspignore` di repo ini sudah disiapkan untuk `clasp push` langsung dari folder `src/`.

**Catatan mobile**: menu custom Apps Script (menu "Timelinea") tidak muncul di aplikasi Google Sheets mobile maupun tampilan web mobile-nya — itu keterbatasan Google, bukan bug. Kalau menu tidak kelihatan, jalankan `initializeTimelineaHeadless` sekali langsung dari editor script (`script.google.com/d/<scriptId>/edit` > pilih fungsi di dropdown > Jalankan). Setelah sheet terbentuk, edit sel di Tasks tetap otomatis memicu perhitungan ulang di perangkat apa pun, karena itu jalan lewat trigger edit sel, bukan menu.

## Cara pakai

- **Sheet `Settings`**: atur tanggal mulai proyek, apakah akhir pekan dilewati, daftar hari libur, dan lihat Total Planned Cost / Total Actual Cost (Spent to Date) untuk seluruh proyek.
- **Sheet `Resources`**: daftar tiap orang (Name) beserta Rate/Day (gaji per hari) dan Role. Kolom Assigned Tasks, Total Days Allocated, dan Total Pay terisi **otomatis** — jangan diedit manual.
- **Sheet `Tasks`**: isi Task Name, Level, Duration (hari kerja), Predecessors, % Complete, Assigned To, Cost/Day, dan centang Milestone bila perlu.
  - Kolom **Level** (0, 1, 2, …) menentukan hierarki: task dengan Level lebih tinggi tepat di bawahnya jadi subtask. Task yang punya subtask otomatis jadi **summary task** — Start/Finish/Duration/% Complete/Cost-nya dihitung otomatis dari subtask-nya (rollup), bukan diisi manual.
  - Predecessors **tidak boleh** menunjuk ke summary task — arahkan ke subtask spesifik di dalamnya (atau ke beberapa subtask sekaligus, mis. `7FS,8FS`, kalau perlu menunggu semuanya selesai).
  - Kolom Predecessors menerima daftar ID dipisah koma, opsional dengan tipe dan lag, misalnya `2,3FS+1,4SS-2`.
  - **Assigned To** menerima beberapa nama sekaligus dipisah koma, mis. `Subur, Ade` — dicocokkan case-insensitive ke kolom Name di sheet `Resources`. Nama yang tidak ditemukan di sana (typo, atau belum ditambahkan) akan muncul sebagai notifikasi toast, dan tidak dihitung biayanya sampai diperbaiki/ditambahkan.
  - **Planned Cost** = jumlah (Rate/Day tiap orang di Assigned To × Duration) + (Cost/Day × Duration, untuk material/alat). Untuk milestone, Cost/Day dan gaji dihitung sebagai biaya flat satu hari. Actual Cost = Planned Cost × % Complete.
  - Kolom Start/Finish/Planned Cost/Actual Cost/Critical/Slack diisi otomatis — jangan diedit manual.
- Setiap kali Anda mengubah Level/Duration/Predecessors/Start/% Complete/Assigned To/Cost per Day/Milestone di Tasks, atau Name/Rate per Day di Resources, jadwal, cost, dan Gantt chart **otomatis dihitung ulang** (trigger `onEdit`).
- Menu **Timelinea > Recalculate Schedule** / **Refresh Gantt Chart** tersedia untuk memicu ulang secara manual.
- **Timelinea > Add Task Row** menambah task baru (top-level) di baris paling bawah.
- **Timelinea > Add Sub-task** menyisipkan baris baru tepat di bawah baris yang sedang dipilih, dengan Level otomatis satu tingkat lebih dalam — cara tercepat membuat subtask baru.
- **Timelinea > Add Resource Row** / **Setup / Reset Resources Sheet** untuk mengelola daftar tenaga kerja.
- **Timelinea > Mulai Project Baru (Arsipkan yang Lama)** mengunci data project yang sedang berjalan (Tasks + Resources) ke file `.tla` terenkripsi di folder Drive "Timelinea Archives", lalu mengosongkan sheet Tasks untuk project baru — sheet dan file Apps Script tetap satu, tidak perlu bikin salinan baru.
- **Timelinea > Lihat Arsip Project** membuka daftar arsip lama dalam dialog read-only (tidak bisa diedit/disimpan ulang), dengan tombol Print / Simpan sebagai PDF untuk kebutuhan bagikan ke klien.
- **Timelinea > Set Baseline** menyimpan Start/Finish yang sedang berjalan sebagai rencana awal (Baseline Start/Finish). Kolom **Variance (d)** lalu otomatis dihitung ulang tiap ada perubahan jadwal — positif berarti project mundur dari rencana, negatif berarti lebih cepat dari rencana. Baseline hanya berubah lewat menu ini, tidak pernah ditimpa oleh perhitungan ulang biasa.
- **Timelinea > Catat Masalah**: pilih dulu baris task yang bermasalah di sheet Tasks (opsional, boleh dilewati untuk masalah umum), lalu jalankan menu ini dan isi deskripsi masalahnya. Baris baru otomatis dibuat di sheet `Issues` dengan Task ID/Nama/tanggal terisi; lengkapi Penyebab dan Penyelesaian langsung di sheet, lalu ubah Status jadi `Resolved` kalau sudah selesai. Task yang punya masalah berstatus Open otomatis tercentang di kolom **Ada Masalah?** pada sheet Tasks.
- **Timelinea > Setup / Reset Issues Sheet** membuat ulang sheet `Issues` (kosong) — hanya perlu dipakai kalau sheet-nya belum ada atau sengaja mau dikosongkan total.

## Catatan desain

- Perhitungan jalur kritis (slack) menganggap semua dependency sebagai Finish-to-Start dengan lag 0 untuk kesederhanaan — tanggal Start/Finish tetap menghormati tipe dependency asli (FS/SS/FF/SF) sepenuhnya, hanya nilai slack untuk link non-FS yang merupakan aproksimasi.
- Level harus naik tepat +1 per tingkat nesting (tidak boleh loncat, mis. dari Level 0 langsung ke Level 2) agar struktur induk/anak terbaca benar.
- Gantt chart dibatasi 400 kolom hari (mode harian) atau 260 kolom minggu (mode mingguan, ~5 tahun) agar tetap dalam batas ukuran Google Sheets; proyek yang lebih panjang perlu dipecah menjadi beberapa fase.
- Sheet `Resources` bersifat opsional secara teknis (kalau belum ada, semua Cost/Day tetap jalan tapi gaji dihitung 0) — tapi otomatis dibuat oleh Initialize, dan bisa ditambahkan kapan saja lewat menu tanpa perlu reset Tasks/Settings.
- Arsip project (`.tla`) dienkripsi dengan kunci yang sebagian tersimpan langsung di kode `Archive.gs` (`ARCHIVE_APP_SECRET`). Ini cukup untuk mencegah orang awam membuka/menyalin data lama di luar Timelinea, tapi **bukan** proteksi terhadap orang yang cukup paham untuk membuka editor Apps Script dan membaca kode sumbernya sendiri. **Ganti nilai `ARCHIVE_APP_SECRET` ke string acak baru sebelum mendistribusikan/menjual salinan** — jangan pakai nilai bawaan dari repo ini. Gunakan `scripts/deploy.sh` (lihat bagian Instalasi) supaya secret asli tidak pernah tersimpan di file yang di-commit ke git.
- Sheet `Issues` dicocokkan ke Tasks lewat kombinasi Task ID **dan** Task Name (bukan ID saja), karena ID task selalu mulai dari 1 lagi setiap "Mulai Project Baru" — mencegah masalah lama dari project sebelumnya salah nempel ke task baru yang kebetulan ID-nya sama.
