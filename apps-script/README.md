# Timelinea — Catat Pengeluaran dari Bukti Transaksi (Gratis)

Upload foto bukti transfer/struk (BCA, Livin Mandiri, dll) → dibaca otomatis oleh AI
(Groq, gratis) → tersimpan rapi di Google Sheets → tinggal minta "laporan bulan ini"
untuk lihat pengeluaran per kategori dan tahu di mana paling boros.

Semua komponen di bawah ini gratis: Google Sheets, Google Drive, Google Apps Script,
dan Groq API (punya tier gratis yang cukup besar untuk pemakaian pribadi).

## 1. Buat Google Sheet

1. Buat Google Sheet baru (bebas nama), biarkan kosong — sheet `Transaksi` akan
   dibuat otomatis oleh script.
2. Salin **Spreadsheet ID** dari URL-nya:
   `https://docs.google.com/spreadsheets/d/`**`INI_ID_NYA`**`/edit`

## 2. Buat Groq API Key (gratis)

1. Buka https://console.groq.com → daftar/login → buat API Key.
2. Simpan key-nya, akan dipakai di langkah 4.

## 3. Buat project Apps Script

1. Dari Google Sheet yang tadi dibuat: menu **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, ganti dengan isi file `Code.gs` di folder ini.
3. Buka `appsscript.json` di editor (Project Settings → centang "Show
   appsscript.json"), ganti isinya dengan file `appsscript.json` di folder ini.

## 4. Isi konfigurasi (Script Properties)

Di Apps Script editor: **Project Settings → Script Properties → Add script property**.

| Key | Wajib? | Isi |
|---|---|---|
| `GROQ_API_KEY` | Wajib | API key dari langkah 2 |
| `SPREADSHEET_ID` | Opsional | ID dari langkah 1 (kalau kosong, pakai spreadsheet aktif) |
| `DRIVE_FOLDER_ID` | Opsional | ID folder Drive untuk simpan foto bukti (kalau kosong, dibuat otomatis: "Timelinea - Bukti Transaksi") |
| `ACCESS_TOKEN` | Opsional (disarankan) | Password sederhana biar link upload kamu tidak dipakai orang lain. Kalau diisi, form web akan minta token ini. |

## 5. Deploy sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. Execute as: **Me**. Who has access: **Anyone**.
4. Klik **Deploy**, izinkan permission yang diminta (akses Sheets, Drive).
5. Salin **URL Web App** yang muncul — itu link untuk upload bukti transaksi.

## 6. Pakai

Buka URL Web App dari HP (bookmark/simpan di homescreen biar kayak app):

- Upload foto bukti transfer + catatan opsional → klik **Simpan Transaksi**.
- Tanpa foto pun bisa, cukup ketik teks bebas, contoh: `makan siang 50rb Mandiri`.
- Klik **Laporan Hari Ini** / **Laporan Bulan Ini** untuk rekap per kategori,
  termasuk kategori mana yang paling boros.
- Semua data juga bisa dibuka langsung di Google Sheet-nya untuk analisa lebih detail
  (pivot table, grafik, dll).

Kalau kamu set `ACCESS_TOKEN`, tambahkan `?token=TOKEN_KAMU` di akhir URL saat buka
form (atau isi field token kalau nanti dipakai lewat WhatsApp gateway).

## 7. (Opsional) Hubungkan ke WhatsApp

Backend ini sudah generik: `doPost` menerima JSON `{ sender, text, imageUrl, imageBase64,
imageMimeType, token }`. Kalau nanti mau kirim bukti transaksi langsung dari WhatsApp
tanpa buka form web, tinggal pakai WhatsApp Gateway apa pun yang mendukung webhook
(banyak yang punya trial/tier gratis untuk pemakaian ringan) dan arahkan webhook-nya ke
URL Web App ini. Tidak perlu ubah kode inti — cukup sesuaikan nama field JSON dari
gateway tersebut ke field yang dipakai di `doPost`.

## Kategori yang dipakai AI

`Makanan & Minuman`, `Transportasi`, `Tagihan & Utilitas`, `Transfer/Kirim Uang`,
`Belanja`, `Hiburan`, `Kesehatan`, `Pendidikan`, `Lainnya`.

## Kolom di Google Sheet

`Timestamp`, `Tanggal Transaksi`, `Jumlah (Rp)`, `Kategori`, `Penerima/Tujuan`,
`Bank/Metode`, `No Referensi`, `Deskripsi`, `Sumber`, `Link Bukti`, `Pesan Asli`.
