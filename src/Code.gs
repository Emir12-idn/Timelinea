/**
 * Timelinea — a lightweight "MS Project in Google Sheets" powered by Apps
 * Script: task list with auto-scheduling (CPM), predecessor dependencies,
 * multi-level subtasks, cost tracking, critical path highlighting and an
 * auto-drawn Gantt chart.
 */

/**
 * Menu layout deliberately keeps every reset/wipe action out of the main
 * list and behind a single, clearly-labeled submenu — reported concern:
 * a non-technical user browsing the main Timelinea menu for everyday things
 * (adding a row, logging an issue) could land on "Initialize / Reset Sheets"
 * by mistake and lose their Tasks data. The main menu now only has actions
 * that are either harmless or already guarded by an archive/lock step.
 * Initialize itself additionally requires typing a confirmation word (see
 * initializeTimelinea) since a Yes/No dialog alone is too easy to click
 * through without reading.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  var resetMenu = ui.createMenu('Reset & Setup (hati-hati, ada yang menghapus data)')
    .addItem('Initialize / Reset Sheets (HAPUS semua Tasks)', 'initializeTimelinea')
    .addSeparator()
    .addItem('Setup / Reset Resources Sheet', 'addResourcesSheet')
    .addItem('Setup / Reset Settings Sheet', 'addSettingsSheet')
    .addItem('Setup / Reset Issues Sheet (HAPUS riwayat masalah)', 'addIssuesSheet')
    .addSeparator()
    .addItem('Aktifkan Peringatan Kolom Otomatis', 'refreshAutoColumnWarnings')
    .addItem('Aktifkan Kolom +/↓/- (Tambah Sejajar/Subtask/Hapus)', 'refreshRowActionColumn');

  ui.createMenu('Timelinea')
    .addItem('Add Task Row', 'addTaskRow')
    .addItem('Add Task Sejajar (level sama, di bawah baris terpilih)', 'addSiblingRow')
    .addItem('Add Sub-task (below selected row)', 'addSubtaskRow')
    .addItem('Pilih Assigned To (Multi-pilih)', 'openAssignDialog')
    .addItem('Add Resource Row', 'addResourceRow')
    .addSeparator()
    .addItem('Catat Masalah (Issue Log)', 'logIssue')
    .addSeparator()
    .addItem('Recalculate Schedule', 'runCalculateSchedule')
    .addItem('Refresh Gantt Chart', 'runDrawGanttChart')
    .addSeparator()
    .addItem('Print: Siapkan Tampilan Ringkas', 'hideColumnsForPrint')
    .addItem('Print: Tampilkan Semua Lagi', 'showAllColumns')
    .addSeparator()
    .addItem('Set Baseline (Simpan Rencana Awal)', 'setBaseline')
    .addSeparator()
    .addItem('Tandai Project Selesai (Kunci)', 'markProjectFinished')
    .addItem('Buka Kunci Project', 'unlockProject')
    .addSeparator()
    .addItem('Mulai Project Baru (Arsipkan yang Lama)', 'startNewProject')
    .addItem('Lihat Arsip Project', 'openArchiveViewer')
    .addSeparator()
    .addSubMenu(resetMenu)
    .addSeparator()
    .addItem('About Timelinea', 'showAbout')
    .addToUi();
}

function runCalculateSchedule() {
  try {
    calculateSchedule();
    SpreadsheetApp.getActiveSpreadsheet().toast('Jadwal berhasil dihitung ulang.', 'Timelinea');
  } catch (err) {
    SpreadsheetApp.getUi().alert('Gagal menghitung jadwal:\n' + err.message);
  }
}

function runDrawGanttChart() {
  try {
    drawGanttChart();
    SpreadsheetApp.getActiveSpreadsheet().toast('Gantt chart diperbarui.', 'Timelinea');
  } catch (err) {
    SpreadsheetApp.getUi().alert('Gagal menggambar Gantt chart:\n' + err.message);
  }
}

/** The last row that actually has a task (by ID), ignoring the hundreds of pre-formatted blank rows below it. */
function lastTaskRow_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var ids = sheet.getRange(2, COL.ID, lastRow - 1, 1).getValues();
  var last = 1;
  ids.forEach(function (row, i) { if (row[0] !== '' && row[0] !== null) last = i + 2; });
  return last;
}

/**
 * Hides the "+/↓/-" control column and the working columns (Predecessors
 * through Ada Masalah? — predecessor syntax, cost figures, critical/slack
 * flags, baseline/variance, issue flag) so the Tasks sheet prints as a
 * clean ID/Task Name/Level/Duration/Start/Finish list plus the Gantt chart,
 * meant for a client or field crew. Also hides every row past the last
 * actual task — rows are pre-formatted with checkboxes/validation hundreds
 * of rows ahead for smooth data entry, and without this a printout would
 * show a long tail of empty-looking rows that still render checkboxes.
 * Only hides — nothing is deleted or cleared; Timelinea > Print: Tampilkan
 * Semua Lagi reverses both.
 */
function hideColumnsForPrint() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) { SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.'); return; }
  sheet.hideColumns(ROW_ACTION_COL, 1);
  sheet.hideColumns(COL.PREDECESSORS, TASKS_LAST_COL - COL.PREDECESSORS + 1);

  var lastTask = lastTaskRow_(sheet);
  var maxRows = sheet.getMaxRows();
  if (maxRows > lastTask) sheet.hideRows(lastTask + 1, maxRows - lastTask);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Kolom kerja dan baris tanpa task disembunyikan. Pakai Timelinea > Print: Tampilkan Semua Lagi untuk mengembalikan.',
    'Timelinea', 6);
}

function showAllColumns() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) { SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.'); return; }
  sheet.showColumns(ROW_ACTION_COL, 1);
  sheet.showColumns(COL.PREDECESSORS, TASKS_LAST_COL - COL.PREDECESSORS + 1);
  sheet.showRows(1, sheet.getMaxRows());
  SpreadsheetApp.getActiveSpreadsheet().toast('Semua kolom dan baris ditampilkan lagi.', 'Timelinea', 4);
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    'Timelinea',
    'Isi task di sheet "Tasks": Duration, Predecessors (mis. "2FS+1"), % Complete, Cost/Day.\n' +
    'Pakai kolom Level untuk membuat subtask berlapis (0 = task utama, 1 = subtask, 2 = sub-subtask, dst).\n' +
    'Timelinea > Add Task Sejajar menambah baris baru SETARA (level sama) di bawah baris yang dipilih; ' +
    'Timelinea > Add Sub-task menambah baris satu level LEBIH DALAM (anak) dari baris yang dipilih.\n' +
    'Task yang punya subtask otomatis jadi "summary": Start/Finish/% Complete/Cost-nya dirangkum dari anak-anaknya.\n' +
    'Kolom "Assigned To" punya dropdown (klik sel, pilih 1 nama) dari sheet "Resources". Untuk pilih beberapa\n' +
    'orang sekaligus di satu task, pilih dulu barisnya lalu Timelinea > Pilih Assigned To (Multi-pilih) — tinggal\n' +
    'centang. Gaji tiap orang (Rate/Day × total hari kerjanya) otomatis terhitung di sheet Resources.\n' +
    'Timelinea otomatis menghitung ulang jadwal, cost, jalur kritis, dan Gantt chart setiap Anda mengedit,\n' +
    'atau lewat menu Timelinea > Recalculate / Refresh.\n' +
    'Tidak perlu buka menu Timelinea tiap mau tambah/hapus baris — klik sel di kolom "+ / ↓ / -" (tepat di\n' +
    'sebelah Task Name, selalu kelihatan walau di-scroll): "+" = task baru sejajar, "↓" = subtask (anak, satu\n' +
    'level lebih dalam), "-" = hapus baris itu (akan ada konfirmasi dulu).\n' +
    'Cost/Day, Planned Cost, dan Actual Cost disembunyikan secara default (harga modal tidak boleh bocor ke\n' +
    'klien) — pakai Timelinea > Print: Tampilkan Semua Lagi kalau perlu melihat/mengeditnya.\n' +
    'Kolom Start/Finish/Planned Cost/Actual Cost/Critical/Slack dihitung otomatis dan akan selalu ditimpa\n' +
    'ulang — Google Sheets akan memberi peringatan kalau Anda mencoba mengeditnya manual.\n' +
    'Isi "Deadline Project" di sheet Settings (opsional) untuk membandingkan target selesai dari klien dengan\n' +
    '"Perkiraan Selesai Project" yang dihitung otomatis dari jadwal — statusnya disorot oranye kalau telat.\n' +
    'Mau print sheet Tasks untuk klien? Pakai Timelinea > Print: Siapkan Tampilan Ringkas untuk menyembunyikan\n' +
    'kolom internal (termasuk Cost/Day, Planned Cost, Actual Cost — jangan sampai klien lihat harga modal) dan\n' +
    'baris yang belum ada task-nya. Timelinea > Print: Tampilkan Semua Lagi mengembalikannya untuk kerja lagi.\n' +
    'Selesai satu project? Pakai Timelinea > Mulai Project Baru untuk mengarsipkan (mengunci) data lama\n' +
    'dan mengosongkan Tasks untuk project berikutnya — tanpa perlu bikin Sheet baru. Arsip lama tetap bisa\n' +
    'dilihat & diprint lewat Timelinea > Lihat Arsip Project, tapi tidak bisa diedit lagi.\n' +
    'Pakai Timelinea > Set Baseline untuk menyimpan Start/Finish saat ini sebagai rencana awal — kolom\n' +
    'Variance akan menunjukkan berapa hari project melenceng (lebih/kurang) dari rencana itu.\n' +
    'Ada masalah di sebuah task? Pilih baris task-nya lalu Timelinea > Catat Masalah — dicatat di sheet\n' +
    'Issues (kapan terjadi, penyebab, penyelesaian) supaya tidak terulang di project berikutnya. Sheet\n' +
    'Issues tidak ikut terhapus saat Mulai Project Baru.\n' +
    'Project sudah selesai dan tidak boleh diubah lagi? Pakai Timelinea > Tandai Project Selesai — sheet\n' +
    'Tasks, Settings, dan Resources akan terkunci untuk editor lain, dan edit oleh Anda sendiri (pemilik file)\n' +
    'akan dibatalkan otomatis oleh script, sampai dibuka lagi lewat Timelinea > Buka Kunci Project.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * This is the single most destructive action in the app — it wipes Tasks,
 * Settings, AND Resources (Issues is spared, see initializeTimelineaHeadless)
 * back to the empty sample template. A Yes/No dialog is too easy to click
 * through on reflex, especially for someone not confident with computers,
 * so this requires typing an exact confirmation word instead of just a
 * button tap — cheap for someone who really means it, hard to trigger by
 * accident.
 */
function initializeTimelinea() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Initialize / Reset Sheets — PERINGATAN',
    'Ini akan MENGHAPUS seluruh isi sheet Tasks, Settings, dan Resources, lalu menggantinya dengan template ' +
    'kosong (data contoh disertakan). Data yang sedang ada TIDAK BISA dikembalikan setelah ini. Sheet Issues ' +
    'tidak akan disentuh.\n\nKalau yakin, ketik RESET di bawah lalu klik OK:',
    ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  if (response.getResponseText().trim().toUpperCase() !== 'RESET') {
    ui.alert('Dibatalkan — teks yang diketik tidak sama dengan "RESET". Tidak ada yang berubah.');
    return;
  }
  initializeTimelineaHeadless();
}

/**
 * Same setup as initializeTimelinea() but without any Ui calls, so it can be
 * run from contexts with no user interface (e.g. the Apps Script Execution
 * API, used to bootstrap the sheet from outside the Sheets editor).
 */
function initializeTimelineaHeadless() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSettingsSheet_(ss);
  setupResourcesSheet_(ss);
  if (!ss.getSheetByName(ISSUES_SHEET)) setupIssuesSheet_(ss); // preserved across re-Initialize; see setupIssuesSheet_
  setupTasksSheet_(ss);
  drawGanttChart();
}

function setupSettingsSheet_(ss) {
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SETTINGS_SHEET);

  sheet.getRange('A1:B1').merge()
    .setValue('Timelinea Settings')
    .setFontWeight('bold').setFontSize(15)
    .setFontColor(COLOR.TITLE_BAR_TEXT).setBackground(COLOR.TITLE_BAR_BG)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);

  sheet.getRange('A3').setValue('Project Start Date').setFontWeight('bold');
  sheet.getRange(SETTINGS.PROJECT_START).setValue(stripTime_(new Date())).setNumberFormat('yyyy-MM-dd');
  sheet.getRange('A4').setValue('Skip Weekends').setFontWeight('bold');
  sheet.getRange(SETTINGS.SKIP_WEEKENDS).insertCheckboxes().setValue(true);
  sheet.getRange('A5').setValue('Deadline Project (opsional)').setFontWeight('bold');
  sheet.getRange(SETTINGS.PROJECT_DEADLINE).setNumberFormat('yyyy-MM-dd');

  // Totals/rollups are written by calculateSchedule() (plain values, not
  // formulas) so they don't depend on the spreadsheet's locale-specific
  // formula syntax (e.g. comma vs semicolon argument separators).
  sheet.getRange('A7').setValue('Total Planned Cost').setFontWeight('bold');
  sheet.getRange(SETTINGS.TOTAL_PLANNED_COST).setValue(0).setNumberFormat('"Rp"#,##0');
  sheet.getRange('A8').setValue('Total Actual Cost (Spent to Date)').setFontWeight('bold');
  sheet.getRange(SETTINGS.TOTAL_ACTUAL_COST).setValue(0).setNumberFormat('"Rp"#,##0');
  sheet.getRange('A9').setValue('Perkiraan Selesai Project').setFontWeight('bold');
  sheet.getRange(SETTINGS.PROJECTED_FINISH).setNumberFormat('yyyy-MM-dd');
  sheet.getRange('A10').setValue('Status vs Deadline').setFontWeight('bold');
  // Left blank on purpose until Deadline Project is filled in and a
  // recalculate runs — a placeholder message here read like an error
  // sitting in a data cell, which is exactly what this must never look like.

  sheet.getRange('A12').setValue('Status Project').setFontWeight('bold');
  sheet.getRange(SETTINGS.PROJECT_STATUS).setValue('Aktif');
  sheet.getRange('A13').setValue('Selesai Pada').setFontWeight('bold');
  sheet.getRange(SETTINGS.FINISHED_AT).setNumberFormat('yyyy-MM-dd HH:mm');

  sheet.getRange('A15').setValue('Holidays (satu tanggal per baris, mulai baris ini ke bawah):').setFontStyle('italic');
  sheet.getRange(SETTINGS.HOLIDAYS_FIRST_ROW, SETTINGS.HOLIDAYS_COL, 10, 1).setNumberFormat('yyyy-MM-dd');

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 160);

  // Same "calm everywhere except the one thing that must never be missed"
  // rule as the Tasks sheet's Variance highlight: if the project is
  // projected to miss its deadline, that status line should be impossible
  // to scroll past without noticing.
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('TERLAMBAT')
      .setBackground(COLOR.VARIANCE_LATE_BG).setFontColor(COLOR.VARIANCE_LATE_TEXT).setBold(true)
      .setRanges([sheet.getRange(SETTINGS.DEADLINE_STATUS)])
      .build()
  ]);
}

function setupResourcesSheet_(ss) {
  var sheet = ss.getSheetByName(RESOURCES_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(RESOURCES_SHEET);

  sheet.getRange(1, 1, 1, RESOURCES_HEADER.length).setValues([RESOURCES_HEADER])
    .setFontWeight('bold').setFontColor(COLOR.HEADER_ROW_TEXT).setBackground(COLOR.HEADER_ROW_BG)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 28);
  sheet.setFrozenRows(1);

  var sample = [
    ['Mandor Joko', 200000, 'Mandor / Pengawas Lapangan', '', '', ''],
    ['Subur', 150000, 'Tukang Las', '', '', ''],
    ['Ade', 150000, 'Tukang Las', '', '', ''],
    ['Budi', 100000, 'Helper / Tukang Bantu', '', '', '']
  ];
  sheet.getRange(2, 1, sample.length, RESOURCES_HEADER.length).setValues(sample);

  sheet.getRange(2, RESOURCES_COL.RATE, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, RESOURCES_COL.TOTAL_DAYS, 500, 1).setNumberFormat('0');
  sheet.getRange(2, RESOURCES_COL.TOTAL_PAY, 500, 1).setNumberFormat('"Rp"#,##0');

  var widths = [160, 90, 160, 280, 130, 110];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  var zebraRange = sheet.getRange(2, 1, 498, RESOURCES_HEADER.length);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISEVEN(ROW())')
      .setBackground(COLOR.ZEBRA_ROW_BG)
      .setRanges([zebraRange])
      .build()
  ]);
}

/** Creates (or resets) just the Resources sheet, without touching Tasks/Settings. */
function addResourcesSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(RESOURCES_SHEET)) {
    var response = ui.alert(
      'Setup Resources Sheet',
      'Sheet "Resources" sudah ada dan akan direset ke data contoh (Assigned Tasks/Total Pay akan terisi ulang otomatis). Lanjutkan?',
      ui.ButtonSet.YES_NO);
    if (response !== ui.Button.YES) return;
  }
  setupResourcesSheet_(ss);
  applyAssignedToDropdown_(ss); // Resources sheet was just recreated, so re-point the Tasks dropdown at it
  runCalculateSchedule();
}

/**
 * Creates (or resets) just the Settings sheet, without touching Tasks/
 * Resources/Issues — the way to pick up new Settings fields (e.g. Deadline
 * Project) on a sheet initialized before they existed, without re-running
 * Initialize / Reset Sheets, which would also wipe Tasks data.
 */
function addSettingsSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SETTINGS_SHEET)) {
    var response = ui.alert(
      'Setup Settings Sheet',
      'Sheet "Settings" akan direset ke default (Project Start Date, Skip Weekends, Deadline Project, dan ' +
      'daftar Holidays akan kembali kosong/default — isi ulang manual setelah ini). Sheet Tasks, Resources, ' +
      'dan Issues TIDAK akan disentuh. Lanjutkan?',
      ui.ButtonSet.YES_NO);
    if (response !== ui.Button.YES) return;
  }
  setupSettingsSheet_(ss);
  runCalculateSchedule();
}

/** Appends a blank resource row at the bottom of the Resources sheet. */
function addResourceRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESOURCES_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Jalankan Timelinea > Setup / Reset Resources Sheet dulu.');
    return;
  }
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, RESOURCES_COL.RATE).setValue(0).setNumberFormat('"Rp"#,##0');
  sheet.getRange(newRow, RESOURCES_COL.TOTAL_DAYS).setNumberFormat('0');
  sheet.getRange(newRow, RESOURCES_COL.TOTAL_PAY).setNumberFormat('"Rp"#,##0');
  sheet.setActiveSelection(sheet.getRange(newRow, RESOURCES_COL.NAME));
}

/**
 * The Issues sheet is a running problem/lessons-learned log. It is created
 * once and deliberately left alone by Initialize (if it already exists) and
 * by "Mulai Project Baru" — the point is to remember what went wrong across
 * every project, not just the current one.
 */
function setupIssuesSheet_(ss) {
  var sheet = ss.getSheetByName(ISSUES_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(ISSUES_SHEET);

  sheet.getRange(1, 1, 1, ISSUES_HEADER.length).setValues([ISSUES_HEADER])
    .setFontWeight('bold').setFontColor(COLOR.HEADER_ROW_TEXT).setBackground(COLOR.HEADER_ROW_BG)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 28);
  sheet.setFrozenRows(1);

  sheet.getRange(2, ISSUES_COL.DATE, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, ISSUES_COL.STATUS, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Open', 'Resolved'], true).setAllowInvalid(false).build());

  var widths = [40, 65, 200, 110, 260, 200, 260, 90];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  var dataRange = sheet.getRange(2, 1, 498, ISSUES_HEADER.length);
  var statusRange = sheet.getRange(2, ISSUES_COL.STATUS, 498, 1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Open')
      .setBackground(COLOR.ISSUE_OPEN_BG).setFontColor(COLOR.ISSUE_OPEN_TEXT).setBold(true)
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISEVEN(ROW())')
      .setBackground(COLOR.ZEBRA_ROW_BG)
      .setRanges([dataRange])
      .build()
  ]);
}

/** Creates (or resets) just the Issues sheet, without touching Tasks/Settings/Resources. */
function addIssuesSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(ISSUES_SHEET)) {
    var response = ui.alert(
      'Setup Issues Sheet',
      'Sheet "Issues" sudah ada. Ini akan MENGHAPUS semua catatan masalah yang sudah ada di sana. Lanjutkan?',
      ui.ButtonSet.YES_NO);
    if (response !== ui.Button.YES) return;
  }
  setupIssuesSheet_(ss);
}

function nextIssueId_(sheet) {
  var lastRow = sheet.getLastRow();
  var ids = lastRow >= 2
    ? sheet.getRange(2, ISSUES_COL.ID, lastRow - 1, 1).getValues().flat().filter(function (v) { return v !== ''; })
    : [];
  return ids.length ? Math.max.apply(null, ids) + 1 : 1;
}

/**
 * Logs a new problem to the Issues sheet — Penyebab/Penyelesaian/Status are
 * filled in later directly in the sheet, as they're usually not known yet
 * the moment a problem is first noticed. If a Tasks row is selected when
 * this runs, Task ID/Name are pre-filled automatically.
 */
function logIssue() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var issuesSheet = ss.getSheetByName(ISSUES_SHEET);
  if (!issuesSheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }

  var taskId = '', taskName = '';
  var activeSheet = ss.getActiveSheet();
  if (activeSheet.getName() === TASKS_SHEET) {
    var activeRow = ss.getActiveRange().getRow();
    if (activeRow >= 2) {
      taskId = activeSheet.getRange(activeRow, COL.ID).getValue();
      taskName = activeSheet.getRange(activeRow, COL.NAME).getValue();
    }
  }

  var resp = ui.prompt(
    'Catat Masalah' + (taskName ? ' — ' + taskName : ''),
    'Deskripsi masalahnya (Penyebab, Penyelesaian, dan Status bisa dilengkapi langsung di sheet Issues setelah ini):',
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var problem = resp.getResponseText().trim();
  if (!problem) return;

  var newRow = issuesSheet.getLastRow() + 1;
  issuesSheet.getRange(newRow, ISSUES_COL.ID).setValue(nextIssueId_(issuesSheet));
  issuesSheet.getRange(newRow, ISSUES_COL.TASK_ID).setValue(taskId);
  issuesSheet.getRange(newRow, ISSUES_COL.TASK_NAME).setValue(taskName);
  issuesSheet.getRange(newRow, ISSUES_COL.DATE).setValue(stripTime_(new Date())).setNumberFormat('yyyy-MM-dd');
  issuesSheet.getRange(newRow, ISSUES_COL.PROBLEM).setValue(problem);
  issuesSheet.getRange(newRow, ISSUES_COL.STATUS).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Open', 'Resolved'], true).setAllowInvalid(false).build())
    .setValue('Open');

  ss.setActiveSheet(issuesSheet);
  issuesSheet.setActiveSelection(issuesSheet.getRange(newRow, ISSUES_COL.CAUSE));

  try { calculateSchedule(); } catch (err) { /* the issue is logged either way; the flag just won't show yet */ }

  ui.alert('Masalah dicatat di sheet Issues' + (taskName ? ' untuk task "' + taskName + '"' : '') +
    '. Lengkapi Penyebab dan Penyelesaian di sana, lalu ubah Status jadi Resolved kalau sudah selesai.');
}

function setupTasksSheet_(ss) {
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(TASKS_SHEET);
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);

  sheet.getRange(1, 1, 1, TASKS_HEADER.length).setValues([TASKS_HEADER])
    .setFontWeight('bold').setFontColor(COLOR.HEADER_ROW_TEXT).setBackground(COLOR.HEADER_ROW_BG)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 28);
  sheet.setFrozenRows(1);

  // Demonstrates a 3-level outline: Phase (0) > task (1) > sub-task (2), using
  // a fabrication/kontraktor project (bengkel las membuat pagar & kanopi
  // besi) instead of software-industry terms like "Frontend"/"Backend"/"QA"
  // — the target buyer is a UMKM contractor, not a software team, and jargon
  // like that means nothing to them. Cost/Day is left at 0 for rows whose
  // Assigned To already matches a Resources entry — their Planned Cost comes
  // from that resource's Rate/Day instead, so the two don't double up.
  var sample = [
    [1, 'Kick-off Proyek', '', 0, 0, '', '', '', 0, '', 0, '', '', true, '', '', '', '', '', false],
    [2, 'Tahap 1: Survey & Bahan', '', 0, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [3, 'Survey Lokasi & Ukur', '', 1, 3, '', '', '1FS', 0, 'Mandor Joko', 0, '', '', false, '', '', '', '', '', false],
    [4, 'Beli Bahan Besi/Baja', '', 1, 5, '', '', '3FS', 0, 'Mandor Joko', 0, '', '', false, '', '', '', '', '', false],
    [5, 'Tahap 2: Fabrikasi & Pasang', '', 0, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [6, 'Fabrikasi', '', 1, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [7, 'Potong & Rangka Besi', '', 2, 7, '', '', '4FS', 0, 'Subur', 0, '', '', false, '', '', '', '', '', false],
    [8, 'Las Sambungan', '', 2, 6, '', '', '4FS', 0, 'Ade', 0, '', '', false, '', '', '', '', '', false],
    [9, 'Pasang di Lokasi & Finishing Cat', '', 1, 4, '', '', '7FS,8FS', 0, 'Subur,Budi', 0, '', '', false, '', '', '', '', '', false],
    [10, 'Serah Terima ke Klien', '', 0, 0, '', '', '9FS', 0, 'Mandor Joko', 0, '', '', true, '', '', '', '', '', false]
  ];
  sheet.getRange(2, 1, sample.length, TASKS_HEADER.length).setValues(sample);

  sheet.getRange(2, COL.LEVEL, 500, 1).setNumberFormat('0');
  sheet.getRange(2, COL.DURATION, 500, 1).setNumberFormat('0');
  sheet.getRange(2, COL.START, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.FINISH, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.PCT_COMPLETE, 500, 1).setNumberFormat('0.0"%"');
  // Third clause (zero) is blank on purpose: Cost/Day is deliberately left
  // at 0 for tasks whose labor cost already comes from a matched Resources
  // entry (see the sample data comment below) — showing literal "Rp0" for
  // that reads as a data-entry mistake rather than the intentional case it is.
  sheet.getRange(2, COL.COST_RATE, 500, 1).setNumberFormat('"Rp"#,##0;-"Rp"#,##0;""');
  sheet.getRange(2, COL.PLANNED_COST, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, COL.ACTUAL_COST, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, COL.MILESTONE, 500, 1).insertCheckboxes();
  sheet.getRange(2, COL.CRITICAL, 500, 1).insertCheckboxes();
  sheet.getRange(2, COL.BASELINE_START, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.BASELINE_FINISH, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.VARIANCE, 500, 1).setNumberFormat('+0;-0;0');
  sheet.getRange(2, COL.HAS_ISSUE, 500, 1).insertCheckboxes();

  var widths = [40, 220, 50, 50, 80, 95, 95, 110, 85, 110, 85, 100, 100, 75, 70, 65, 95, 95, 75, 90];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.getRange(2, COL.PCT_COMPLETE, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 100).setAllowInvalid(false).build());
  sheet.getRange(2, COL.LEVEL, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 8).setAllowInvalid(false).build());

  // Divider borders: end of frozen columns, and end of the Tasks data block
  // before the Gantt spacer column — makes the layout read as designed
  // rather than an arbitrary wall of cells.
  sheet.getRange(1, FROZEN_COLS, 500, 1)
    .setBorder(null, null, null, true, null, null, COLOR.FROZEN_DIVIDER, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(1, TASKS_LAST_COL, 500, 1)
    .setBorder(null, null, null, true, null, null, COLOR.FROZEN_DIVIDER, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Priority order matters: the FIRST rule that matches a cell wins. A late
  // task should out-rank everything else (that's the one thing that should
  // never blend into the calm background), critical path is secondary, and
  // zebra striping only fills in where neither applies.
  var dataRange = sheet.getRange(2, 1, 498, TASKS_LAST_COL);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(ISNUMBER($' + colLetter_(COL.VARIANCE) + '2), $' + colLetter_(COL.VARIANCE) + '2>0)')
      .setBackground(COLOR.VARIANCE_LATE_BG).setFontColor(COLOR.VARIANCE_LATE_TEXT).setBold(true)
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$' + colLetter_(COL.CRITICAL) + '2=TRUE')
      .setBackground(COLOR.CRITICAL_ROW_BG)
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISEVEN(ROW())')
      .setBackground(COLOR.ZEBRA_ROW_BG)
      .setRanges([dataRange])
      .build()
  ]);

  applyAutoColumnWarnings_(sheet);
  applyAssignedToDropdown_(ss);
  applyRowActionColumn_(sheet);

  // Cost/Day, Planned Cost, Actual Cost hidden from the start, not just on
  // demand before printing — reported concern: sending/printing a work
  // schedule must never accidentally reveal internal cost (harga modal) to
  // a client, and relying on remembering to run Print: Siapkan Tampilan
  // Ringkas every single time isn't a safe enough default. Timelinea >
  // Print: Tampilkan Semua Lagi reveals them again when actually needed
  // (e.g. reviewing margins), and re-hiding is one click away.
  sheet.hideColumns(COL.COST_RATE, 3);
}

/**
 * Sets up the "+/↓/-" per-row control in ROW_ACTION_COL — placed right after
 * Task Name and frozen (see FROZEN_COLS), not at the far end of the sheet:
 * putting it past every other column meant scrolling across the whole sheet
 * just to reach it, which defeated the point of a quick per-row control. A
 * dropdown, not checkboxes, since it needs three distinct actions in one
 * column: + (sibling, same level), ↓ (subtask, one level deeper), - (delete,
 * with confirmation). Values are bare symbols, not words, so the column
 * stays narrow — see handleRowAction_ (wired from onEdit) for what each one
 * does. setAllowInvalid(true) so it doesn't hard-block whatever a user types.
 */
function applyRowActionColumn_(sheet) {
  sheet.getRange(1, ROW_ACTION_COL).setValue('+ / ↓ / -')
    .setFontWeight('bold').setFontColor(COLOR.HEADER_ROW_TEXT).setBackground(COLOR.HEADER_ROW_BG)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setColumnWidth(ROW_ACTION_COL, 50);
  sheet.getRange(2, ROW_ACTION_COL, 498, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([ROW_ACTION_ADD, ROW_ACTION_SUBTASK, ROW_ACTION_DELETE], true)
      .setAllowInvalid(true).build())
    .setHorizontalAlignment('center');
}

/**
 * Adds the "+/↓/-" column to a Tasks sheet that was initialized before this
 * feature existed, without touching any Task data — the same reasoning as
 * Setup / Reset Settings Sheet: picking up a new feature shouldn't require
 * wiping existing work via a full Initialize.
 */
function refreshRowActionColumn() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }
  applyRowActionColumn_(sheet);
  ui.alert('Selesai. Kolom "+ / ↓ / -" di sheet Tasks (tepat di sebelah Task Name) sekarang aktif — pilih "+" ' +
    'untuk task baru selevel di bawahnya, "↓" untuk subtask (anak, satu level lebih dalam), atau "-" untuk ' +
    'menghapus baris itu (akan diminta konfirmasi dulu).');
}

/**
 * Assigned To dropdown, sourced live from the Resources Name column instead
 * of a fixed list — so adding a new person to Resources immediately shows
 * up as a choice here with no extra step. setAllowInvalid(true) on purpose:
 * Assigned To supports multiple comma-separated names on one task (e.g.
 * "Subur, Ade"), which can't be a single dropdown selection, so typing is
 * still allowed for that case — this just makes the common single-assignee
 * case a click instead of retyping a name (and retyping is exactly what
 * causes the silent "name not found in Resources" cost bug from a typo).
 * Re-applied whenever Resources is rebuilt (Setup / Reset Resources Sheet
 * deletes and recreates that sheet, which would otherwise leave this
 * dropdown pointing at a range that no longer exists).
 */
function applyAssignedToDropdown_(ss) {
  var tasksSheet = ss.getSheetByName(TASKS_SHEET);
  var resourcesSheet = ss.getSheetByName(RESOURCES_SHEET);
  if (!tasksSheet || !resourcesSheet) return;
  var nameRange = resourcesSheet.getRange(2, RESOURCES_COL.NAME, 500, 1);
  tasksSheet.getRange(2, COL.RESOURCE, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(nameRange, true).setAllowInvalid(true).build());
}

/**
 * Opens a checkbox picker for Assigned To on the currently selected Tasks
 * row — the dropdown from applyAssignedToDropdown_ only picks one name at a
 * time (a single Sheets dropdown cell can't select multiple values), so
 * assigning several people to one task still meant typing a comma-separated
 * list by hand. This dialog lists every name in Resources as a checkbox,
 * pre-checks whichever are already in the cell, and writes the comma-joined
 * result back on Simpan.
 */
function openAssignDialog() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tasksSheet = ss.getSheetByName(TASKS_SHEET);
  if (!tasksSheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }
  if (ss.getActiveSheet().getName() !== TASKS_SHEET) {
    ui.alert('Pilih dulu baris task di sheet Tasks, lalu jalankan menu ini lagi.');
    return;
  }
  var row = ss.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Pilih dulu baris task (bukan baris judul) di sheet Tasks.');
    return;
  }

  var resourcesSheet = ss.getSheetByName(RESOURCES_SHEET);
  var names = [];
  if (resourcesSheet) {
    var lastRow = resourcesSheet.getLastRow();
    if (lastRow >= 2) {
      names = resourcesSheet.getRange(2, RESOURCES_COL.NAME, lastRow - 1, 1).getValues()
        .map(function (r) { return String(r[0]).trim(); })
        .filter(function (n) { return n.length > 0; });
    }
  }
  if (names.length === 0) {
    ui.alert('Belum ada nama di sheet Resources. Tambahkan dulu lewat Timelinea > Add Resource Row.');
    return;
  }

  var currentRaw = tasksSheet.getRange(row, COL.RESOURCE).getValue();
  var selected = parseAssignees_(currentRaw).map(function (n) { return n.toLowerCase(); });

  var template = HtmlService.createTemplateFromFile('AssignDialog');
  template.names = names;
  template.selected = selected;
  template.row = row;
  template.taskName = String(tasksSheet.getRange(row, COL.NAME).getValue() || '(tanpa nama)');
  var html = template.evaluate().setWidth(360).setHeight(420);
  ui.showModalDialog(html, 'Pilih Assigned To');
}

/** Called from AssignDialog.html via google.script.run. */
function saveAssignedTo(row, namesJoined) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) return;
  sheet.getRange(row, COL.RESOURCE).setValue(namesJoined);
  refreshAfterRowInsert_(); // a script-driven .setValue() doesn't re-fire onEdit on its own
}

var AUTO_COL_PROTECTION_DESC_ = 'Timelinea: kolom otomatis (dihitung ulang tiap Recalculate)';

/**
 * Start/Finish/Planned Cost/Actual Cost/Critical/Slack are all fully
 * computed by calculateSchedule() and overwritten on every recalculation —
 * editing them manually does nothing lasting, which is especially
 * confusing for Critical, since it's rendered as a tappable checkbox with
 * no visual sign it's not a real input (reported: toggling it "doesn't
 * work", i.e. it silently reverts on the next recalc). A warning-only
 * protection can't block the edit — this sheet has to stay editable for its
 * actual inputs, and Google Sheets doesn't let a script protect a range
 * from just some editors anyway — but it does make Sheets show an "are you
 * sure you want to edit this?" prompt before the edit lands, which is
 * enough to explain the behavior at the moment it'd otherwise look broken.
 * Removes any previous copies of this same protection first so re-running
 * Initialize doesn't pile up duplicates.
 */
function applyAutoColumnWarnings_(sheet) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === AUTO_COL_PROTECTION_DESC_) p.remove();
  });
  [COL.START, COL.FINISH, COL.PLANNED_COST, COL.ACTUAL_COST, COL.CRITICAL, COL.SLACK].forEach(function (col) {
    sheet.getRange(2, col, 498, 1).protect()
      .setDescription(AUTO_COL_PROTECTION_DESC_)
      .setWarningOnly(true);
  });
}

/**
 * Re-applies the warning protection above to an already-initialized Tasks
 * sheet, without touching any data — for sheets set up before this feature
 * existed (re-running Initialize would work too, but wipes Tasks data).
 */
function refreshAutoColumnWarnings() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }
  applyAutoColumnWarnings_(sheet);
  ui.alert('Selesai. Sekarang mengedit Start/Finish/Planned Cost/Actual Cost/Critical/Slack secara manual akan ' +
    'memunculkan peringatan dari Google Sheets sebelum diedit — kolom-kolom itu tetap dihitung ulang otomatis.');
}

/**
 * Snapshots the current Start/Finish of every task into Baseline Start/
 * Baseline Finish (the "rencana awal"). Baseline columns are never touched
 * by calculateSchedule() afterward — only this explicit action changes
 * them — so the Variance column can show real drift over time.
 */
function setBaseline() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }

  var response = ui.alert(
    'Set Baseline',
    'Ini akan menyimpan Start/Finish yang sedang berjalan sekarang sebagai rencana awal (baseline) untuk ' +
    'semua task, menimpa baseline sebelumnya kalau sudah pernah diset. Kolom Variance akan mulai menunjukkan ' +
    'selisih dari titik ini. Lanjutkan?',
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var starts = sheet.getRange(2, COL.START, lastRow - 1, 1).getValues();
  var finishes = sheet.getRange(2, COL.FINISH, lastRow - 1, 1).getValues();
  sheet.getRange(2, COL.BASELINE_START, lastRow - 1, 1).setValues(starts);
  sheet.getRange(2, COL.BASELINE_FINISH, lastRow - 1, 1).setValues(finishes);

  runDrawGanttChart();
  ui.alert('Baseline tersimpan. Kolom Variance sekarang menunjukkan selisih (hari kerja) dari rencana ini.');
}

function nextTaskId_(sheet) {
  var lastRow = sheet.getLastRow();
  var ids = lastRow >= 2
    ? sheet.getRange(2, COL.ID, lastRow - 1, 1).getValues().flat().filter(function (v) { return v !== ''; })
    : [];
  return ids.length ? Math.max.apply(null, ids) + 1 : 1;
}

function formatNewTaskRow_(sheet, row) {
  sheet.getRange(row, COL.LEVEL).setValue(0).setNumberFormat('0');
  sheet.getRange(row, COL.DURATION).setValue(1).setNumberFormat('0');
  sheet.getRange(row, COL.START).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.FINISH).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.PCT_COMPLETE).setValue(0).setNumberFormat('0.0"%"');
  sheet.getRange(row, COL.COST_RATE).setValue(0).setNumberFormat('"Rp"#,##0;-"Rp"#,##0;""');
  sheet.getRange(row, COL.PLANNED_COST).setNumberFormat('"Rp"#,##0');
  sheet.getRange(row, COL.ACTUAL_COST).setNumberFormat('"Rp"#,##0');
  sheet.getRange(row, COL.MILESTONE).insertCheckboxes().setValue(false);
  sheet.getRange(row, COL.CRITICAL).insertCheckboxes();
  sheet.getRange(row, COL.BASELINE_START).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.BASELINE_FINISH).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.VARIANCE).setNumberFormat('+0;-0;0');
  sheet.getRange(row, COL.HAS_ISSUE).insertCheckboxes().setValue(false);
  sheet.getRange(row, ROW_ACTION_COL).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([ROW_ACTION_ADD, ROW_ACTION_SUBTASK, ROW_ACTION_DELETE], true)
      .setAllowInvalid(true).build());
}

/**
 * Adding a row via the menu is a programmatic edit, so it does not re-fire
 * onEdit on its own — without this, the new row silently wouldn't appear on
 * the Gantt chart until some other edit happened to trigger a recalculation.
 */
function refreshAfterRowInsert_() {
  try { drawGanttChart(); } catch (err) { /* leave it for the next successful edit/recalculate */ }
}

/** Appends a new top-level task row at the bottom, pre-filled with the next sequential ID. */
function addTaskRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.');
    return;
  }
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, COL.ID).setValue(nextTaskId_(sheet));
  formatNewTaskRow_(sheet, newRow);
  sheet.setActiveSelection(sheet.getRange(newRow, COL.NAME));
  refreshAfterRowInsert_();
}

/**
 * Inserts a new row directly below the currently selected row, at the SAME
 * Level — for adding another item alongside an existing task/subtask (a
 * sibling), as opposed to Add Sub-task which nests one level deeper. Without
 * this, the only way to add a second Level-1 item under the same parent was
 * to (mis-)use Add Sub-task, which instead created a Level-2 child of the
 * selected row — a reported point of confusion.
 */
/** Shared by addSiblingRow() (menu) and handleRowAction_() (the +/- column). */
function insertSiblingRowAt_(sheet, row) {
  var level = Number(sheet.getRange(row, COL.LEVEL).getValue()) || 0;
  var newRow = row + 1;
  sheet.insertRowAfter(row);
  sheet.getRange(newRow, COL.ID).setValue(nextTaskId_(sheet));
  formatNewTaskRow_(sheet, newRow);
  sheet.getRange(newRow, COL.LEVEL).setValue(level);
  sheet.setActiveSelection(sheet.getRange(newRow, COL.NAME));
  refreshAfterRowInsert_();
}

function addSiblingRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.');
    return;
  }
  var activeRow = sheet.getActiveRange().getRow();
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert('Pilih dulu baris task yang levelnya mau disamakan.');
    return;
  }
  insertSiblingRowAt_(sheet, activeRow);
}

/**
 * Handles an edit to the ROW_ACTION_COL cell (the "+/subtask/-" column
 * reusing the old Gantt spacer column) — reported request: something closer
 * to MS Project's inline add/delete instead of always going through the
 * menu, with three distinct, simple choices: "+ Tambah sejajar" inserts a
 * same-level sibling right below (mirrors addSiblingRow), "↓ Tambah
 * subtask" inserts a child one level deeper (mirrors addSubtaskRow), and
 * "- Hapus baris" deletes the row after a confirmation, since that's
 * irreversible and this column is exactly the kind of thing an unfamiliar
 * user could tap by accident. If the confirmation dialog can't be shown for
 * any reason, the row is NOT deleted — never delete data without being sure
 * the user actually confirmed.
 */
function handleRowAction_(range) {
  var sheet = range.getSheet();
  var row = range.getRow();
  var value = range.getValue();

  if (value === ROW_ACTION_ADD) {
    range.setValue('');
    insertSiblingRowAt_(sheet, row);
    return;
  }

  if (value === ROW_ACTION_SUBTASK) {
    range.setValue('');
    insertSubtaskRowAt_(sheet, row);
    return;
  }

  if (value === ROW_ACTION_DELETE) {
    var taskName = sheet.getRange(row, COL.NAME).getValue() || '(tanpa nama)';
    var level = Number(sheet.getRange(row, COL.LEVEL).getValue()) || 0;
    var nextLevel = row < sheet.getLastRow() ? (Number(sheet.getRange(row + 1, COL.LEVEL).getValue()) || 0) : -1;
    var childWarning = nextLevel > level
      ? '\n\nPeringatan: baris ini punya subtask di bawahnya. Subtask-nya TIDAK ikut terhapus, tapi Level-nya mungkin perlu disesuaikan manual setelah ini.'
      : '';

    var confirmed = false;
    try {
      var ui = SpreadsheetApp.getUi();
      var response = ui.alert('Hapus Task',
        'Hapus baris task "' + taskName + '"? Tindakan ini tidak bisa dibatalkan lewat Timelinea (Ctrl+Z Google ' +
        'Sheets mungkin masih bisa langsung setelahnya).' + childWarning,
        ui.ButtonSet.YES_NO);
      confirmed = (response === ui.Button.YES);
    } catch (err) {
      confirmed = false; // couldn't confirm safely, so don't delete
    }

    if (confirmed) {
      sheet.deleteRow(row);
      refreshAfterRowInsert_();
    } else {
      range.setValue('');
    }
    return;
  }

  range.setValue(''); // any stray value that isn't one of the three options
}

/** Shared by addSubtaskRow() (menu) and handleRowAction_() (the +/- column). */
function insertSubtaskRowAt_(sheet, row) {
  var parentLevel = Number(sheet.getRange(row, COL.LEVEL).getValue()) || 0;
  var newRow = row + 1;
  sheet.insertRowAfter(row);
  sheet.getRange(newRow, COL.ID).setValue(nextTaskId_(sheet));
  formatNewTaskRow_(sheet, newRow);
  sheet.getRange(newRow, COL.LEVEL).setValue(parentLevel + 1);
  sheet.setActiveSelection(sheet.getRange(newRow, COL.NAME));
  refreshAfterRowInsert_();
}

/**
 * Inserts a new subtask row directly below the currently selected row, one
 * Level deeper than it — the same "indent a new row" flow MS Project uses.
 */
function addSubtaskRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.');
    return;
  }
  var activeRow = sheet.getActiveRange().getRow();
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert('Pilih dulu baris task yang mau diberi subtask.');
    return;
  }
  insertSubtaskRowAt_(sheet, activeRow);
}
