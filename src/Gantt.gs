/**
 * Renders the Gantt chart: a day-by-day grid starting at GANTT_START_COL,
 * one row per task, bars colored by critical/normal + % complete, with a
 * marker on today's column. The chart area is fully cleared and redrawn
 * each time so it always matches the Tasks sheet.
 */

function clearGanttArea_(sheet) {
  var maxRows = Math.max(sheet.getMaxRows(), 2);
  var maxCols = Math.max(sheet.getMaxColumns(), GANTT_START_COL);
  var width = maxCols - GANTT_START_COL + 1;
  if (width <= 0) return;
  var range = sheet.getRange(1, GANTT_START_COL, maxRows, width);
  range.clearContent();
  range.setBackground(null);
  range.setBorder(false, false, false, false, false, false);
}

function drawGanttChart() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (!sheet) throw new Error('Sheet "Tasks" tidak ditemukan. Jalankan Timelinea > Initialize dulu.');

  var tasks = calculateSchedule();
  clearGanttArea_(sheet);
  if (tasks.length === 0) return;

  var minStart = new Date(Math.min.apply(null, tasks.map(function (t) { return t.start.getTime(); })));
  var maxFinish = new Date(Math.max.apply(null, tasks.map(function (t) { return t.finish.getTime(); })));
  var days = enumerateDays_(minStart, maxFinish);

  if (days.length > GANTT_MAX_DAYS) {
    SpreadsheetApp.getUi().alert(
      'Rentang proyek (' + days.length + ' hari) melebihi batas tampilan (' + GANTT_MAX_DAYS +
      ' hari). Persempit tanggal atau pecah proyek menjadi beberapa fase.');
    days = days.slice(0, GANTT_MAX_DAYS);
  }

  var settings = readSettings_(ss);
  var today = stripTime_(new Date());

  // Header row with dates.
  var headerRange = sheet.getRange(1, GANTT_START_COL, 1, days.length);
  headerRange.setValues([days]);
  headerRange.setNumberFormat('d/MM');
  headerRange.setBackground(COLOR.HEADER_BG).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(1, 24);

  // Weekend shading across the whole grid.
  days.forEach(function (day, colIdx) {
    if (settings.skipWeekends && isWeekend_(day)) {
      sheet.getRange(1, GANTT_START_COL + colIdx, tasks.length + 1, 1).setBackground(COLOR.WEEKEND_BG);
    }
  });

  // One bar per task.
  tasks.forEach(function (t) {
    var startIdx = Math.round((stripTime_(t.start).getTime() - minStart.getTime()) / 86400000);
    var finishIdx = Math.round((stripTime_(t.finish).getTime() - minStart.getTime()) / 86400000);
    if (startIdx >= days.length) return;
    finishIdx = Math.min(finishIdx, days.length - 1);
    var span = finishIdx - startIdx + 1;

    if (t.milestone) {
      var cell = sheet.getRange(t.row, GANTT_START_COL + startIdx);
      cell.setValue('◆').setFontColor(COLOR.MILESTONE).setHorizontalAlignment('center').setFontWeight('bold');
      return;
    }

    var barRange = sheet.getRange(t.row, GANTT_START_COL + startIdx, 1, span);
    var base = t.critical ? COLOR.BAR_CRITICAL : COLOR.BAR_NORMAL;
    barRange.setBackground(base);

    var doneDays = Math.round(span * Math.min(Math.max(t.pctComplete || 0, 0), 100) / 100);
    if (doneDays > 0) {
      var doneColor = t.critical ? COLOR.BAR_CRITICAL_DONE : COLOR.BAR_NORMAL_DONE;
      sheet.getRange(t.row, GANTT_START_COL + startIdx, 1, doneDays).setBackground(doneColor);
    }
  });

  // Vertical marker on today's column, if it's within the visible range.
  var todayIdx = Math.round((today.getTime() - minStart.getTime()) / 86400000);
  if (todayIdx >= 0 && todayIdx < days.length) {
    sheet.getRange(1, GANTT_START_COL + todayIdx, tasks.length + 1, 1)
      .setBorder(null, true, null, true, false, false, COLOR.TODAY_BORDER, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }

  sheet.setFrozenColumns(TASKS_LAST_COL);
  sheet.setFrozenRows(1);
}
