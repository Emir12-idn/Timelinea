/**
 * Simple onEdit trigger: any edit to a scheduling-relevant column in the
 * Tasks sheet (Duration, Start, Predecessors, % Complete, Milestone)
 * automatically recalculates the schedule and redraws the Gantt chart.
 * Programmatic edits made by the script itself do not re-fire onEdit, so
 * this cannot loop.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TASKS_SHEET) return;
  if (e.range.getRow() === 1) return; // header row

  var watchedCols = [COL.DURATION, COL.START, COL.PREDECESSORS, COL.PCT_COMPLETE, COL.MILESTONE];
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
