/**
 * Timelinea - Pencatat Pengeluaran dari Bukti Transaksi (100% gratis)
 *
 * Alur: upload foto bukti transfer/struk (lewat form web bawaan, atau lewat
 * webhook WhatsApp Gateway kalau nanti mau ditambahkan) -> Groq AI membaca &
 * mengekstrak data -> tersimpan sebagai baris di Google Sheets -> bisa minta
 * "laporan hari ini" / "laporan bulan ini" untuk rekap per kategori.
 *
 * Setup lengkap ada di apps-script/README.md.
 */

const SHEET_NAME = 'Transaksi';
const SHEET_HEADERS = [
  'Timestamp', 'Tanggal Transaksi', 'Jumlah (Rp)', 'Kategori',
  'Penerima/Tujuan', 'Bank/Metode', 'No Referensi', 'Deskripsi',
  'Sumber', 'Link Bukti', 'Pesan Asli'
];

const KATEGORI_LIST = [
  'Makanan & Minuman', 'Transportasi', 'Tagihan & Utilitas',
  'Transfer/Kirim Uang', 'Belanja', 'Hiburan', 'Kesehatan',
  'Pendidikan', 'Lainnya'
];

function getProp_(key, fallback) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  return v || fallback;
}

function checkAccess_(token) {
  const required = getProp_('ACCESS_TOKEN', '');
  if (!required) return true; // no token configured = open access
  return token === required;
}

function getSheet_() {
  const ssId = getProp_('SPREADSHEET_ID', '');
  const ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateFolder_() {
  const folderId = getProp_('DRIVE_FOLDER_ID', '');
  if (folderId) return DriveApp.getFolderById(folderId);
  const name = 'Timelinea - Bukti Transaksi';
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// ---------- Web entry points ----------

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.laporan) {
    if (!checkAccess_(params.token)) return jsonOutput_({ error: 'Akses ditolak.' });
    return jsonOutput_({ report: generateReport_(params.laporan) });
  }

  if (params.text || params.imageUrl) {
    if (!checkAccess_(params.token)) return jsonOutput_({ error: 'Akses ditolak.' });
    const result = handleMessage_('web', params.text || '', params.imageUrl || '', '', '');
    return jsonOutput_(result);
  }

  return HtmlService.createHtmlOutput(renderUploadForm_())
    .setTitle('Timelinea - Catat Pengeluaran')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const contentType = (e.postData && e.postData.type) || '';
    let body = {};
    if (contentType.indexOf('application/json') !== -1) {
      body = JSON.parse(e.postData.contents || '{}');
    } else {
      body = e.parameter || {};
    }

    if (!checkAccess_(body.token)) return jsonOutput_({ error: 'Akses ditolak.' });

    const sender = body.sender || body.from || body.phone || 'web';
    const text = body.text || body.message || body.caption || '';
    const imageUrl = body.imageUrl || body.image_url || body.mediaUrl || '';
    const imageBase64 = body.imageBase64 || '';
    const imageMimeType = body.imageMimeType || 'image/jpeg';

    const lowerText = (text || '').trim().toLowerCase();
    let result;
    if (lowerText.indexOf('laporan') === 0) {
      result = { report: generateReport_(text) };
    } else {
      result = handleMessage_(sender, text, imageUrl, imageBase64, imageMimeType);
    }
    return jsonOutput_(result);
  } catch (err) {
    return jsonOutput_({ error: String(err) });
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Core logic ----------

function handleMessage_(sender, text, imageUrl, imageBase64, imageMimeType) {
  let imageBlob = null;

  if (imageBase64) {
    imageBlob = Utilities.newBlob(Utilities.base64Decode(imageBase64), imageMimeType || 'image/jpeg', 'bukti.jpg');
  } else if (imageUrl) {
    const resp = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      imageBlob = resp.getBlob();
    }
  }

  if (!text && !imageBlob) {
    return { ok: false, error: 'Kirim minimal teks atau foto bukti transaksi.' };
  }

  let driveUrl = '';
  if (imageBlob) {
    const folder = getOrCreateFolder_();
    const file = folder.createFile(imageBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    driveUrl = file.getUrl();
  }

  const extracted = extractTransactionWithAI_(text, imageBlob);
  const row = appendToSheet_(extracted, sender, driveUrl, text);

  const reply = formatConfirmation_(extracted, driveUrl);
  return { ok: true, data: extracted, driveUrl: driveUrl, row: row, reply: reply };
}

function extractTransactionWithAI_(text, imageBlob) {
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const systemPrompt =
    'Kamu adalah asisten pencatat keuangan pribadi. Dari pesan teks dan/atau foto struk/bukti ' +
    'transfer bank Indonesia yang diberikan, ekstrak informasi transaksi. Balas HANYA dengan JSON ' +
    'valid tanpa markdown/tanpa penjelasan tambahan, dengan struktur persis:\n' +
    '{"tanggal":"YYYY-MM-DD","jumlah":<angka rupiah tanpa titik/koma>,' +
    '"kategori":"<salah satu dari: ' + KATEGORI_LIST.join(', ') + '>",' +
    '"penerima_tujuan":"<nama penerima atau tujuan transaksi>",' +
    '"bank_metode":"<nama bank/metode pembayaran>",' +
    '"referensi":"<nomor referensi jika ada, kalau tidak ada string kosong>",' +
    '"deskripsi":"<ringkasan singkat 1 kalimat>"}\n' +
    'Kalau tanggal tidak disebutkan, pakai tanggal hari ini: ' + today + '. ' +
    'Kalau suatu data tidak ditemukan, isi dengan string kosong (jumlah isi 0).';

  const userContent = [];
  userContent.push({ type: 'text', text: text || 'Baca dan ekstrak data dari bukti transaksi pada foto ini.' });
  if (imageBlob) {
    const base64 = Utilities.base64Encode(imageBlob.getBytes());
    const mime = imageBlob.getContentType() || 'image/jpeg';
    userContent.push({ type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + base64 } });
  }

  const model = imageBlob
    ? getProp_('GROQ_MODEL_VISION', 'meta-llama/llama-4-scout-17b-16e-instruct')
    : getProp_('GROQ_MODEL_TEXT', 'llama-3.3-70b-versatile');

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: imageBlob ? userContent : (text || userContent[0].text) }
    ],
    temperature: 0.1
  };

  const response = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getProp_('GROQ_API_KEY', '') },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const raw = response.getContentText();
  if (code !== 200) {
    throw new Error('Groq API error (' + code + '): ' + raw);
  }

  const json = JSON.parse(raw);
  let content = json.choices[0].message.content.trim();
  content = content.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  let data;
  try {
    data = JSON.parse(content);
  } catch (parseErr) {
    data = {
      tanggal: today, jumlah: 0, kategori: 'Lainnya',
      penerima_tujuan: '', bank_metode: '', referensi: '',
      deskripsi: text || 'Tidak berhasil dibaca otomatis, cek foto bukti.'
    };
  }

  data.jumlah = Number(data.jumlah) || 0;
  if (KATEGORI_LIST.indexOf(data.kategori) === -1) data.kategori = 'Lainnya';
  return data;
}

function appendToSheet_(data, sender, driveUrl, rawText) {
  const sheet = getSheet_();
  const row = [
    new Date(), data.tanggal || '', data.jumlah || 0, data.kategori || 'Lainnya',
    data.penerima_tujuan || '', data.bank_metode || '', data.referensi || '',
    data.deskripsi || '', sender || '', driveUrl || '', rawText || ''
  ];
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function formatConfirmation_(data, driveUrl) {
  const rupiah = 'Rp ' + Number(data.jumlah || 0).toLocaleString('id-ID');
  let msg = '✅ Tercatat!\n' +
    rupiah + ' - ' + (data.kategori || 'Lainnya') + '\n' +
    (data.penerima_tujuan ? 'Ke: ' + data.penerima_tujuan + '\n' : '') +
    (data.bank_metode ? 'Via: ' + data.bank_metode + '\n' : '') +
    (data.tanggal ? 'Tanggal: ' + data.tanggal + '\n' : '');
  if (driveUrl) msg += 'Bukti: ' + driveUrl + '\n';
  msg += '\nKetik "laporan bulan ini" untuk lihat rekap.';
  return msg;
}

// ---------- Report ----------

function generateReport_(command) {
  const lower = (command || '').toLowerCase();
  const now = new Date();
  let start, end, label;

  if (lower.indexOf('minggu') !== -1) {
    const day = now.getDay() === 0 ? 7 : now.getDay();
    start = new Date(now); start.setDate(now.getDate() - day + 1); start.setHours(0, 0, 0, 0);
    end = new Date(start); end.setDate(start.getDate() + 7);
    label = 'Minggu Ini';
  } else if (lower.indexOf('hari ini') !== -1) {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start); end.setDate(start.getDate() + 1);
    label = 'Hari Ini';
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    label = Utilities.formatDate(now, 'Asia/Jakarta', 'MMMM yyyy');
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const byCategory = {};
  let total = 0;
  rows.forEach(function (r) {
    const ts = r[0] instanceof Date ? r[0] : new Date(r[0]);
    if (ts < start || ts >= end) return;
    const jumlah = Number(r[2]) || 0;
    const kategori = r[3] || 'Lainnya';
    total += jumlah;
    byCategory[kategori] = byCategory[kategori] || { total: 0, count: 0 };
    byCategory[kategori].total += jumlah;
    byCategory[kategori].count += 1;
  });

  const sorted = Object.keys(byCategory).sort(function (a, b) {
    return byCategory[b].total - byCategory[a].total;
  });

  let msg = '📊 Laporan Pengeluaran - ' + label + '\n';
  msg += 'Total: Rp ' + total.toLocaleString('id-ID') + '\n\n';

  if (sorted.length === 0) {
    msg += 'Belum ada transaksi tercatat di periode ini.';
    return msg;
  }

  sorted.forEach(function (kat) {
    const info = byCategory[kat];
    msg += '- ' + kat + ': Rp ' + info.total.toLocaleString('id-ID') + ' (' + info.count + 'x)\n';
  });

  const top = sorted[0];
  const topPct = Math.round((byCategory[top].total / total) * 100);
  msg += '\n💡 Kategori terbesar: ' + top + ' (' + topPct + '% dari total). ' +
    'Coba pantau/kurangi pengeluaran di kategori ini bulan depan.';

  return msg;
}

// ---------- Upload form (dibuka lewat URL deployment di browser HP/laptop) ----------

function renderUploadForm_() {
  return buildUploadFormHtml_();
}

function buildUploadFormHtml_() {
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<style>',
    'body{font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:16px;background:#f5f6f8;}',
    'h1{font-size:20px;}',
    '.card{background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1);}',
    'input,textarea,button{width:100%;box-sizing:border-box;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ccc;font-size:14px;}',
    'button{background:#16a34a;color:#fff;border:none;font-weight:600;margin-top:12px;}',
    'button:disabled{background:#9ca3af;}',
    'button.secondary{background:#2563eb;}',
    'pre{white-space:pre-wrap;background:#f0fdf4;padding:12px;border-radius:8px;font-size:13px;}',
    '.err{background:#fef2f2;color:#b91c1c;}',
    '</style></head><body>',
    '<h1>📷 Catat Pengeluaran</h1>',
    '<div class="card">',
    '<form id="f">',
    '<input type="file" id="img" accept="image/*" capture="environment">',
    '<textarea id="txt" placeholder="Catatan opsional, contoh: makan siang 50rb Mandiri"></textarea>',
    '<button type="submit">Simpan Transaksi</button>',
    '</form>',
    '<div id="result"></div>',
    '</div>',
    '<div class="card">',
    '<button class="secondary" onclick="lihatLaporan(\'hari ini\')">Laporan Hari Ini</button>',
    '<button class="secondary" onclick="lihatLaporan(\'bulan ini\')">Laporan Bulan Ini</button>',
    '<div id="report"></div>',
    '</div>',
    '<script>',
    'const f = document.getElementById("f");',
    'f.addEventListener("submit", async function(ev){',
    '  ev.preventDefault();',
    '  const btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Memproses...";',
    '  const fileInput = document.getElementById("img");',
    '  const text = document.getElementById("txt").value;',
    '  const payload = { text: text };',
    '  if (fileInput.files[0]) {',
    '    payload.imageBase64 = await toBase64(fileInput.files[0]);',
    '    payload.imageMimeType = fileInput.files[0].type;',
    '  }',
    '  const res = await fetch(window.location.href, { method: "POST", body: JSON.stringify(payload) });',
    '  const data = await res.json();',
    '  const out = document.getElementById("result");',
    '  out.innerHTML = data.ok ? "<pre>" + data.reply + "</pre>" : "<pre class=err>" + (data.error || "Gagal") + "</pre>";',
    '  btn.disabled = false; btn.textContent = "Simpan Transaksi";',
    '  if (data.ok) { f.reset(); }',
    '});',
    'function toBase64(file){',
    '  return new Promise(function(resolve, reject){',
    '    const reader = new FileReader();',
    '    reader.onload = function(){ resolve(reader.result.split(",")[1]); };',
    '    reader.onerror = reject;',
    '    reader.readAsDataURL(file);',
    '  });',
    '}',
    'async function lihatLaporan(period){',
    '  const url = window.location.href + (window.location.href.indexOf("?") === -1 ? "?" : "&") + "laporan=" + encodeURIComponent(period);',
    '  const res = await fetch(url);',
    '  const data = await res.json();',
    '  document.getElementById("report").innerHTML = "<pre>" + (data.report || data.error) + "</pre>";',
    '}',
    '</script>',
    '</body></html>'
  ].join('\n');
}

// ---------- One-time setup helper (jalankan manual dari editor Apps Script) ----------

function setup() {
  getSheet_();
  Logger.log('Sheet siap. Jangan lupa isi Script Properties: GROQ_API_KEY, dan opsional SPREADSHEET_ID, DRIVE_FOLDER_ID, ACCESS_TOKEN.');
}
