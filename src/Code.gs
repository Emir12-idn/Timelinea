/**
 * Timelinea — a lightweight "MS Project in Google Sheets" powered by Apps
 * Script: task list with auto-scheduling (CPM), predecessor dependencies,
 * multi-level subtasks, cost tracking, critical path highlighting and an
 * auto-drawn Gantt chart.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Timelinea')
    .addItem('Initialize / Reset Sheets', 'initializeTimelinea')
    .addSeparator()
    .addItem('Add Task Row', 'addTaskRow')
    .addItem('Add Sub-task (below selected row)', 'addSubtaskRow')
    .addItem('Add Resource Row', 'addResourceRow')
    .addItem('Setup / Reset Resources Sheet', 'addResourcesSheet')
    .addSeparator()
    .addItem('Catat Masalah (Issue Log)', 'logIssue')
    .addItem('Setup / Reset Issues Sheet', 'addIssuesSheet')
    .addSeparator()
    .addItem('Recalculate Schedule', 'runCalculateSchedule')
    .addItem('Refresh Gantt Chart', 'runDrawGanttChart')
    .addSeparator()
    .addItem('Set Baseline (Simpan Rencana Awal)', 'setBaseline')
    .addSeparator()
    .addItem('Tandai Project Selesai (Kunci)', 'markProjectFinished')
    .addItem('Buka Kunci Project', 'unlockProject')
    .addSeparator()
    .addItem('Mulai Project Baru (Arsipkan yang Lama)', 'startNewProject')
    .addItem('Lihat Arsip Project', 'openArchiveViewer')
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

function showAbout() {
  SpreadsheetApp.getUi().alert(
    'Timelinea',
    'Isi task di sheet "Tasks": Duration, Predecessors (mis. "2FS+1"), % Complete, Cost/Day.\n' +
    'Pakai kolom Level untuk membuat subtask berlapis (0 = task utama, 1 = subtask, 2 = sub-subtask, dst).\n' +
    'Task yang punya subtask otomatis jadi "summary": Start/Finish/% Complete/Cost-nya dirangkum dari anak-anaknya.\n' +
    'Kolom "Assigned To" menerima beberapa nama sekaligus (pisah koma, mis. "Subur, Ade") yang dicocokkan ke\n' +
    'sheet "Resources" — gaji tiap orang (Rate/Day × total hari kerjanya) otomatis terhitung di sana.\n' +
    'Timelinea otomatis menghitung ulang jadwal, cost, jalur kritis, dan Gantt chart setiap Anda mengedit,\n' +
    'atau lewat menu Timelinea > Recalculate / Refresh.\n' +
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

function initializeTimelinea() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Initialize Timelinea',
    'Ini akan membuat/menimpa sheet "Tasks" dan "Settings" dengan template kosong (data contoh disertakan). Lanjutkan?',
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
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

  // Totals are written by calculateSchedule() (plain values, not formulas) so
  // they don't depend on the spreadsheet's locale-specific formula syntax
  // (e.g. comma vs semicolon argument separators).
  sheet.getRange('A6').setValue('Total Planned Cost').setFontWeight('bold');
  sheet.getRange(SETTINGS.TOTAL_PLANNED_COST).setValue(0).setNumberFormat('"Rp"#,##0');
  sheet.getRange('A7').setValue('Total Actual Cost (Spent to Date)').setFontWeight('bold');
  sheet.getRange(SETTINGS.TOTAL_ACTUAL_COST).setValue(0).setNumberFormat('"Rp"#,##0');

  sheet.getRange('A9').setValue('Status Project').setFontWeight('bold');
  sheet.getRange(SETTINGS.PROJECT_STATUS).setValue('Aktif');
  sheet.getRange('A10').setValue('Selesai Pada').setFontWeight('bold');
  sheet.getRange(SETTINGS.FINISHED_AT).setNumberFormat('yyyy-MM-dd HH:mm');

  sheet.getRange('A12').setValue('Holidays (satu tanggal per baris, mulai baris ini ke bawah):').setFontStyle('italic');
  sheet.getRange(SETTINGS.HOLIDAYS_FIRST_ROW, SETTINGS.HOLIDAYS_COL, 10, 1).setNumberFormat('yyyy-MM-dd');

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 140);
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
    ['Analyst', 500, 'Business Analyst', '', '', ''],
    ['Designer', 600, 'UI/UX Designer', '', '', ''],
    ['Backend Dev', 700, 'Backend Developer', '', '', ''],
    ['Frontend Dev', 650, 'Frontend Developer', '', '', ''],
    ['QA', 400, 'QA Engineer', '', '', ''],
    ['PM', 800, 'Project Manager', '', '', '']
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

  // Demonstrates a 3-level outline: Phase (0) > task (1) > sub-task (2).
  // Cost/Day is left at 0 for rows whose Assigned To already matches a
  // Resources entry — their Planned Cost comes from that resource's
  // Rate/Day instead, so the two don't double up.
  var sample = [
    [1, 'Project Kickoff', 0, 0, '', '', '', 0, '', 0, '', '', true, '', '', '', '', '', false],
    [2, 'Phase 1: Discovery', 0, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [3, 'Requirements Gathering', 1, 3, '', '', '1FS', 0, 'Analyst', 0, '', '', false, '', '', '', '', '', false],
    [4, 'Design', 1, 5, '', '', '3FS', 0, 'Designer', 0, '', '', false, '', '', '', '', '', false],
    [5, 'Phase 2: Build & Test', 0, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [6, 'Development', 1, '', '', '', '', '', '', '', '', '', false, '', '', '', '', '', false],
    [7, 'Backend', 2, 7, '', '', '4FS', 0, 'Backend Dev', 0, '', '', false, '', '', '', '', '', false],
    [8, 'Frontend', 2, 6, '', '', '4FS', 0, 'Frontend Dev', 0, '', '', false, '', '', '', '', '', false],
    [9, 'Testing', 1, 4, '', '', '7FS,8FS', 0, 'QA,PM', 0, '', '', false, '', '', '', '', '', false],
    [10, 'Launch', 0, 0, '', '', '9FS', 0, 'PM', 0, '', '', true, '', '', '', '', '', false]
  ];
  sheet.getRange(2, 1, sample.length, TASKS_HEADER.length).setValues(sample);

  sheet.getRange(2, COL.LEVEL, 500, 1).setNumberFormat('0');
  sheet.getRange(2, COL.DURATION, 500, 1).setNumberFormat('0');
  sheet.getRange(2, COL.START, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.FINISH, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.PCT_COMPLETE, 500, 1).setNumberFormat('0.0"%"');
  sheet.getRange(2, COL.COST_RATE, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, COL.PLANNED_COST, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, COL.ACTUAL_COST, 500, 1).setNumberFormat('"Rp"#,##0');
  sheet.getRange(2, COL.MILESTONE, 500, 1).insertCheckboxes();
  sheet.getRange(2, COL.CRITICAL, 500, 1).insertCheckboxes();
  sheet.getRange(2, COL.BASELINE_START, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.BASELINE_FINISH, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.VARIANCE, 500, 1).setNumberFormat('+0;-0;0');
  sheet.getRange(2, COL.HAS_ISSUE, 500, 1).insertCheckboxes();

  var widths = [40, 220, 50, 80, 95, 95, 110, 85, 110, 85, 100, 100, 75, 70, 65, 95, 95, 75, 90];
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
  sheet.getRange(row, COL.COST_RATE).setValue(0).setNumberFormat('"Rp"#,##0');
  sheet.getRange(row, COL.PLANNED_COST).setNumberFormat('"Rp"#,##0');
  sheet.getRange(row, COL.ACTUAL_COST).setNumberFormat('"Rp"#,##0');
  sheet.getRange(row, COL.MILESTONE).insertCheckboxes().setValue(false);
  sheet.getRange(row, COL.CRITICAL).insertCheckboxes();
  sheet.getRange(row, COL.BASELINE_START).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.BASELINE_FINISH).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(row, COL.VARIANCE).setNumberFormat('+0;-0;0');
  sheet.getRange(row, COL.HAS_ISSUE).insertCheckboxes().setValue(false);
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
  var parentLevel = Number(sheet.getRange(activeRow, COL.LEVEL).getValue()) || 0;
  var newRow = activeRow + 1;
  sheet.insertRowAfter(activeRow);
  sheet.getRange(newRow, COL.ID).setValue(nextTaskId_(sheet));
  formatNewTaskRow_(sheet, newRow);
  sheet.getRange(newRow, COL.LEVEL).setValue(parentLevel + 1);
  sheet.setActiveSelection(sheet.getRange(newRow, COL.NAME));
  refreshAfterRowInsert_();
}
