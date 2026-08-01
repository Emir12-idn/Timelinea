/**
 * Simple onEdit trigger: recalculates the schedule/cost/Gantt chart whenever
 * a scheduling-relevant column changes — either in the Tasks sheet (Level,
 * Duration, Start, Predecessors, % Complete, Assigned To, Cost/Day,
 * Milestone) or in the Resources sheet (Name, Rate/Day, since those feed
 * labor cost). Programmatic edits made by the script itself do not re-fire
 * onEdit, so this cannot loop.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheetName = e.range.getSheet().getName();

  // Checked first, and even on the header row: Sheets' Protection API can't
  // exclude the spreadsheet owner, so this is the real enforcement for a
  // "Tandai Project Selesai" lock when the person editing is the owner.
  // See ProjectLock.gs / enforceLockOnEdit_ for why.
  if (LOCKED_SHEETS_.indexOf(sheetName) !== -1 && isProjectLocked_(e.range.getSheet().getParent())) {
    enforceLockOnEdit_(e);
    return;
  }

  if (sheetName !== TASKS_SHEET && sheetName !== RESOURCES_SHEET) return;
  if (e.range.getRow() === 1) return; // header row

  var watchedCols = sheetName === TASKS_SHEET
    ? [COL.ID, COL.LEVEL, COL.DURATION, COL.START, COL.PREDECESSORS, COL.PCT_COMPLETE, COL.RESOURCE,
       COL.COST_RATE, COL.MILESTONE, COL.BASELINE_START, COL.BASELINE_FINISH]
    : [RESOURCES_COL.NAME, RESOURCES_COL.RATE];

  var editedCols = [];
  for (var c = e.range.getColumn(); c <= e.range.getLastColumn(); c++) editedCols.push(c);
  var relevant = editedCols.some(function (c) { return watchedCols.indexOf(c) !== -1; });
  if (!relevant) return;

  try {
    drawGanttChart();
  } catch (err) {
    SpreadsheetApp.getActiveSpreadsheet().toast(err.message, 'Timelinea error', 8);
  }
}
