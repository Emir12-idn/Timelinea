/**
 * Renders the Gantt chart: a timeline grid starting at GANTT_START_COL, one
 * row per task, bars colored by critical/normal/summary + % complete, with a
 * marker on today's column. Short projects (<= GANTT_WEEK_VIEW_THRESHOLD_DAYS)
 * get one column per day; longer projects switch to one column per week so
 * the whole timeline still fits on a normal screen. The chart area is fully
 * cleared and redrawn each time so it always matches the Tasks sheet.
 * Subtask nesting (the Level column) is also mirrored as native collapsible
 * row groups in the sheet's row gutter.
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

/** Mirrors the Level column as native Sheets row groups (collapsible, like MS Project's outline tree). */
function applyOutlineGroups_(sheet, tasks) {
  var dataLastRow = sheet.getLastRow();
  if (dataLastRow < 2) return;

  for (var r = 2; r <= dataLastRow; r++) {
    var depth = sheet.getRowGroupDepth(r);
    if (depth > 0) sheet.getRange(r, 1).shiftRowGroupDepth(-depth);
  }

  var maxLevel = tasks.reduce(function (m, t) { return Math.max(m, t.level); }, 0);
  for (var level = 1; level <= maxLevel; level++) {
    var i = 0;
    while (i < tasks.length) {
      if (tasks[i].level >= level) {
        var startRow = tasks[i].row;
        var j = i;
        while (j < tasks.length && tasks[j].level >= level) j++;
        var endRow = tasks[j - 1].row;
        sheet.getRange(startRow, 1, endRow - startRow + 1, 1).shiftRowGroupDepth(1);
        i = j;
      } else {
        i++;
      }
    }
  }
}

/**
 * Builds the timeline columns for the Gantt chart: one bucket per day for
 * short projects, or one bucket per (Mon-Sun) week once the span exceeds
 * GANTT_WEEK_VIEW_THRESHOLD_DAYS, so long projects still fit on screen.
 */
function buildTimeBuckets_(minStart, maxFinish) {
  var totalDays = Math.round((stripTime_(maxFinish).getTime() - stripTime_(minStart).getTime()) / 86400000) + 1;

  if (totalDays <= GANTT_WEEK_VIEW_THRESHOLD_DAYS) {
    var days = enumerateDays_(minStart, maxFinish);
    return { mode: 'day', buckets: days.map(function (d) { return { start: d, end: d, label: d }; }) };
  }

  var cursor = stripTime_(minStart);
  var offsetToMonday = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - offsetToMonday);

  var lastDay = stripTime_(maxFinish);
  var buckets = [];
  while (cursor.getTime() <= lastDay.getTime() && buckets.length < GANTT_MAX_WEEKS + 1) {
    var end = new Date(cursor.getTime());
    end.setDate(end.getDate() + 6);
    buckets.push({ start: new Date(cursor.getTime()), end: end, label: new Date(cursor.getTime()) });
    cursor.setDate(cursor.getDate() + 7);
  }
  return { mode: 'week', buckets: buckets };
}

/** Finds which bucket indices a [start, finish] span overlaps; -1 if entirely out of range. */
function bucketIndexRange_(buckets, start, finish) {
  var startIdx = -1, endIdx = -1;
  for (var i = 0; i < buckets.length; i++) {
    if (startIdx === -1 && buckets[i].end.getTime() >= start.getTime()) startIdx = i;
    if (buckets[i].start.getTime() <= finish.getTime()) endIdx = i;
  }
  return { startIdx: startIdx, endIdx: endIdx };
}

function drawGanttChart() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (!sheet) throw new Error('Sheet "Tasks" tidak ditemukan. Jalankan Timelinea > Initialize dulu.');

  var tasks = calculateSchedule();
  clearGanttArea_(sheet);
  applyOutlineGroups_(sheet, tasks);
  sheet.setFrozenColumns(FROZEN_COLS);
  sheet.setFrozenRows(1);
  if (tasks.length === 0) return;

  var minStart = new Date(Math.min.apply(null, tasks.map(function (t) { return t.start.getTime(); })));
  var maxFinish = new Date(Math.max.apply(null, tasks.map(function (t) { return t.finish.getTime(); })));
  var timeline = buildTimeBuckets_(minStart, maxFinish);
  var buckets = timeline.buckets;

  var hardCap = timeline.mode === 'day' ? GANTT_MAX_DAYS : GANTT_MAX_WEEKS;
  var cappedNote = null;
  if (buckets.length > hardCap) {
    cappedNote = 'Rentang proyek (' + buckets.length + ' ' + (timeline.mode === 'day' ? 'hari' : 'minggu') +
      ') melebihi batas tampilan (' + hardCap + '). Persempit tanggal atau pecah proyek menjadi beberapa fase.';
    buckets = buckets.slice(0, hardCap);
  }

  var settings = readSettings_(ss);
  var today = stripTime_(new Date());

  var headerRange = sheet.getRange(1, GANTT_START_COL, 1, buckets.length);
  headerRange.setValues([buckets.map(function (b) { return b.label; })]);
  headerRange.setNumberFormat(timeline.mode === 'day' ? 'd/MM' : '"Wk" d/MM');
  headerRange.setBackground(COLOR.HEADER_ROW_BG).setFontColor(COLOR.HEADER_ROW_TEXT)
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 28);
  sheet.setColumnWidths(GANTT_START_COL, buckets.length, timeline.mode === 'day' ? 26 : 52);

  // Light grid over the whole chart so bars read as a designed chart rather
  // than raw color fills, plus a heavier rule separating header from data.
  var fullChartRange = sheet.getRange(1, GANTT_START_COL, tasks.length + 1, buckets.length);
  fullChartRange.setBorder(true, true, true, true, true, true, COLOR.GRID_LINE, SpreadsheetApp.BorderStyle.SOLID);
  headerRange.setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  if (timeline.mode === 'day' && settings.skipWeekends) {
    buckets.forEach(function (b, colIdx) {
      if (isWeekend_(b.start)) {
        sheet.getRange(1, GANTT_START_COL + colIdx, tasks.length + 1, 1).setBackground(COLOR.WEEKEND_BG);
      }
    });
  }

  tasks.forEach(function (t) {
    sheet.getRange(t.row, 1, 1, TASKS_LAST_COL).setFontWeight(t.isSummary ? 'bold' : 'normal');

    var range = bucketIndexRange_(buckets, t.start, t.finish);
    if (range.startIdx === -1) return; // entirely outside the (possibly capped) visible window
    var endIdx = range.endIdx === -1 ? buckets.length - 1 : range.endIdx;
    var span = endIdx - range.startIdx + 1;

    if (t.milestone) {
      sheet.getRange(t.row, GANTT_START_COL + range.startIdx)
        .setValue('◆').setFontColor(COLOR.MILESTONE).setHorizontalAlignment('center').setFontWeight('bold');
      return;
    }

    var barRange = sheet.getRange(t.row, GANTT_START_COL + range.startIdx, 1, span);
    if (t.isSummary) {
      barRange.setBackground(COLOR.BAR_SUMMARY);
      return;
    }

    var base = t.critical ? COLOR.BAR_CRITICAL : COLOR.BAR_NORMAL;
    barRange.setBackground(base);

    var doneCount = Math.round(span * Math.min(Math.max(t.pctComplete || 0, 0), 100) / 100);
    if (doneCount > 0) {
      var doneColor = t.critical ? COLOR.BAR_CRITICAL_DONE : COLOR.BAR_NORMAL_DONE;
      sheet.getRange(t.row, GANTT_START_COL + range.startIdx, 1, doneCount).setBackground(doneColor);
    }
  });

  var todayRange = bucketIndexRange_(buckets, today, today);
  if (todayRange.startIdx !== -1) {
    sheet.getRange(1, GANTT_START_COL + todayRange.startIdx, tasks.length + 1, 1)
      .setBorder(null, true, null, true, false, false, COLOR.TODAY_BORDER, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }

  if (cappedNote) {
    try { SpreadsheetApp.getUi().alert(cappedNote); } catch (e) { /* no UI in this context (e.g. Execution API) */ }
  }
}
