/**
 * Timelinea — a lightweight "MS Project in Google Sheets" powered by Apps
 * Script: task list with auto-scheduling (CPM), predecessor dependencies,
 * critical path highlighting and an auto-drawn Gantt chart.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Timelinea')
    .addItem('Initialize / Reset Sheets', 'initializeTimelinea')
    .addSeparator()
    .addItem('Add Task Row', 'addTaskRow')
    .addItem('Recalculate Schedule', 'runCalculateSchedule')
    .addItem('Refresh Gantt Chart', 'runDrawGanttChart')
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
    'Isi task di sheet "Tasks": Duration, Predecessors (mis. "2FS+1"), % Complete.\n' +
    'Timelinea otomatis menghitung Start/Finish, jalur kritis, dan menggambar Gantt chart\n' +
    'setiap kali Anda mengedit, atau lewat menu Timelinea > Recalculate / Refresh.',
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
  setupTasksSheet_(ss);
  drawGanttChart();
}

function setupSettingsSheet_(ss) {
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SETTINGS_SHEET);

  sheet.getRange('A1').setValue('Timelinea Settings').setFontWeight('bold').setFontSize(14);
  sheet.getRange('A3').setValue('Project Start Date');
  sheet.getRange(SETTINGS.PROJECT_START).setValue(stripTime_(new Date())).setNumberFormat('yyyy-MM-dd');
  sheet.getRange('A4').setValue('Skip Weekends');
  sheet.getRange(SETTINGS.SKIP_WEEKENDS).insertCheckboxes().setValue(true);
  sheet.getRange('A6').setValue('Holidays (satu tanggal per baris, mulai baris ini ke bawah):').setFontStyle('italic');
  sheet.getRange(SETTINGS.HOLIDAYS_FIRST_ROW, SETTINGS.HOLIDAYS_COL, 10, 1).setNumberFormat('yyyy-MM-dd');

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 140);
}

function setupTasksSheet_(ss) {
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(TASKS_SHEET);
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);

  sheet.getRange(1, 1, 1, TASKS_HEADER.length).setValues([TASKS_HEADER])
    .setFontWeight('bold').setBackground(COLOR.HEADER_BG);
  sheet.setFrozenRows(1);

  var sample = [
    [1, 'Project Kickoff', 0, '', '', '', 0, '', true, '', ''],
    [2, 'Requirements Gathering', 3, '', '', '1FS', 0, 'Analyst', false, '', ''],
    [3, 'Design', 5, '', '', '2FS', 0, 'Designer', false, '', ''],
    [4, 'Development', 10, '', '', '3FS', 0, 'Dev Team', false, '', ''],
    [5, 'Testing', 4, '', '', '4FS', 0, 'QA', false, '', ''],
    [6, 'Launch', 0, '', '', '5FS', 0, 'PM', true, '', '']
  ];
  sheet.getRange(2, 1, sample.length, TASKS_HEADER.length).setValues(sample);

  sheet.getRange(2, COL.DURATION, 500, 1).setNumberFormat('0');
  sheet.getRange(2, COL.START, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.FINISH, 500, 1).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(2, COL.PCT_COMPLETE, 500, 1).setNumberFormat('0"%"');
  sheet.getRange(2, COL.MILESTONE, 500, 1).insertCheckboxes();
  sheet.getRange(2, COL.CRITICAL, 500, 1).insertCheckboxes();

  var widths = [40, 220, 90, 95, 95, 110, 90, 110, 80, 70, 70];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.getRange(2, COL.PCT_COMPLETE, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 100).setAllowInvalid(false).build());
}

/** Appends a new task row pre-filled with the next sequential ID. */
function addTaskRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Jalankan Timelinea > Initialize dulu.');
    return;
  }
  var lastRow = sheet.getLastRow();
  var ids = lastRow >= 2 ? sheet.getRange(2, COL.ID, lastRow - 1, 1).getValues().flat().filter(function (v) { return v !== ''; }) : [];
  var nextId = ids.length ? Math.max.apply(null, ids) + 1 : 1;
  var newRow = lastRow + 1;
  sheet.getRange(newRow, COL.ID).setValue(nextId);
  sheet.getRange(newRow, COL.DURATION).setValue(1).setNumberFormat('0');
  sheet.getRange(newRow, COL.START).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(newRow, COL.FINISH).setNumberFormat('yyyy-MM-dd');
  sheet.getRange(newRow, COL.PCT_COMPLETE).setValue(0).setNumberFormat('0"%"');
  sheet.getRange(newRow, COL.MILESTONE).insertCheckboxes().setValue(false);
  sheet.getRange(newRow, COL.CRITICAL).insertCheckboxes();
  sheet.setActiveSelection(sheet.getRange(newRow, COL.NAME));
}
