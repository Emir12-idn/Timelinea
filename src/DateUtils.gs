/**
 * Working-day date arithmetic used by the scheduler and the Gantt renderer.
 * All dates are normalized to midnight so they can be compared/used as map keys.
 */

function stripTime_(date) {
  var d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function isWeekend_(date) {
  var day = date.getDay();
  return day === 0 || day === 6;
}

function isWorkday_(date, skipWeekends, holidaySet) {
  if (skipWeekends && isWeekend_(date)) return false;
  if (holidaySet && holidaySet[dateKey_(date)]) return false;
  return true;
}

/**
 * Moves `date` by `n` working days (n may be negative) and always lands on a
 * working day. n === 0 rolls forward to the nearest working day.
 */
function shiftByWorkdays_(date, n, skipWeekends, holidaySet) {
  var d = stripTime_(date);
  var step = n < 0 ? -1 : 1;
  var remaining = Math.abs(n);

  while (!isWorkday_(d, skipWeekends, holidaySet)) {
    d.setDate(d.getDate() + step);
  }
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    if (isWorkday_(d, skipWeekends, holidaySet)) remaining--;
  }
  return d;
}

/** Counts working days strictly between two (already-workday) dates a <= b. */
function workdaysBetween_(a, b, skipWeekends, holidaySet) {
  if (b.getTime() <= a.getTime()) return 0;
  var count = 0;
  var d = stripTime_(a);
  var guard = 0;
  while (d.getTime() < b.getTime() && guard < 20000) {
    d.setDate(d.getDate() + 1);
    if (isWorkday_(d, skipWeekends, holidaySet)) count++;
    guard++;
  }
  return count;
}

/** Enumerates every calendar date from start to end (inclusive). */
function enumerateDays_(start, end) {
  var days = [];
  var d = stripTime_(start);
  var last = stripTime_(end);
  while (d.getTime() <= last.getTime()) {
    days.push(new Date(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
