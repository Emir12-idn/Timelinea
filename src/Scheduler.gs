/**
 * Auto-scheduling engine: parses predecessor links, runs a forward pass to
 * compute Start/Finish per task (honoring FS/SS/FF/SF + lag, like MS Project),
 * then a backward pass to compute slack and flag the critical path.
 *
 * Simplification (documented in README): the backward/slack pass treats every
 * dependency as Finish-to-Start with zero lag. Forward-pass dates still honor
 * the real link type, so schedules are accurate; only the slack number for
 * tasks linked by SS/FF/SF is an approximation.
 */

/** Parses "2,3FS+1,4SS-2" into [{id:2,type:'FS',lag:0}, {id:3,type:'FS',lag:1}, ...]. */
function parsePredecessors_(raw) {
  if (!raw) return [];
  return String(raw).split(',')
    .map(function (token) { return token.trim(); })
    .filter(function (token) { return token.length > 0; })
    .map(function (token) {
      var m = token.match(/^(\d+)\s*(FS|SS|FF|SF)?\s*([+-]\d+)?$/i);
      if (!m) throw new Error('Predecessor tidak valid: "' + token + '"');
      return {
        id: parseInt(m[1], 10),
        type: (m[2] || 'FS').toUpperCase(),
        lag: m[3] ? parseInt(m[3], 10) : 0
      };
    });
}

function readSettings_(ss) {
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) throw new Error('Sheet "Settings" tidak ditemukan. Jalankan Timelinea > Initialize dulu.');

  var startVal = sheet.getRange(SETTINGS.PROJECT_START).getValue();
  var projectStart = startVal instanceof Date ? stripTime_(startVal) : stripTime_(new Date());
  var skipWeekends = sheet.getRange(SETTINGS.SKIP_WEEKENDS).getValue() === true;

  var holidaySet = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= SETTINGS.HOLIDAYS_FIRST_ROW) {
    var values = sheet.getRange(SETTINGS.HOLIDAYS_FIRST_ROW, SETTINGS.HOLIDAYS_COL,
      lastRow - SETTINGS.HOLIDAYS_FIRST_ROW + 1, 1).getValues();
    values.forEach(function (row) {
      if (row[0] instanceof Date) holidaySet[dateKey_(row[0])] = true;
    });
  }
  return { projectStart: projectStart, skipWeekends: skipWeekends, holidaySet: holidaySet };
}

function readTasks_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, TASKS_LAST_COL).getValues();
  var tasks = [];
  values.forEach(function (row, i) {
    if (row[COL.NAME - 1] === '' && row[COL.ID - 1] === '') return; // skip blank rows
    var id = row[COL.ID - 1];
    if (id === '' || id === null) throw new Error('Baris ' + (i + 2) + ' tidak punya ID.');
    tasks.push({
      row: i + 2,
      id: Number(id),
      name: row[COL.NAME - 1],
      duration: Math.max(0, Number(row[COL.DURATION - 1]) || 0),
      startPinned: row[COL.START - 1] instanceof Date ? stripTime_(row[COL.START - 1]) : null,
      predecessors: parsePredecessors_(row[COL.PREDECESSORS - 1]),
      pctComplete: Number(row[COL.PCT_COMPLETE - 1]) || 0,
      milestone: row[COL.MILESTONE - 1] === true || row[COL.DURATION - 1] === 0
    });
  });
  return tasks;
}

/** Kahn's algorithm topological sort; throws a descriptive error on a cycle. */
function topoSort_(tasks, byId) {
  var indegree = {};
  var successors = {};
  tasks.forEach(function (t) { indegree[t.id] = 0; successors[t.id] = []; });

  tasks.forEach(function (t) {
    t.predecessors.forEach(function (p) {
      if (!byId[p.id]) throw new Error('Task "' + t.name + '" mereferensikan predecessor ID ' + p.id + ' yang tidak ada.');
      successors[p.id].push(t.id);
      indegree[t.id]++;
    });
  });

  var queue = tasks.filter(function (t) { return indegree[t.id] === 0; }).map(function (t) { return t.id; });
  var order = [];
  while (queue.length) {
    var id = queue.shift();
    order.push(id);
    successors[id].forEach(function (succId) {
      indegree[succId]--;
      if (indegree[succId] === 0) queue.push(succId);
    });
  }

  if (order.length !== tasks.length) {
    throw new Error('Terdeteksi dependency melingkar (circular) di kolom Predecessors. Perbaiki sebelum menjadwalkan ulang.');
  }
  return { order: order, successors: successors };
}

function computeForwardPass_(tasks, byId, order, settings) {
  order.forEach(function (id) {
    var t = byId[id];
    var candidates = [];

    t.predecessors.forEach(function (p) {
      var pred = byId[p.id];
      switch (p.type) {
        case 'FS':
          candidates.push(shiftByWorkdays_(pred.finish, 1 + p.lag, settings.skipWeekends, settings.holidaySet));
          break;
        case 'SS':
          candidates.push(shiftByWorkdays_(pred.start, p.lag, settings.skipWeekends, settings.holidaySet));
          break;
        case 'FF': {
          var targetFinish = shiftByWorkdays_(pred.finish, p.lag, settings.skipWeekends, settings.holidaySet);
          candidates.push(shiftByWorkdays_(targetFinish, -(Math.max(t.duration, 1) - 1), settings.skipWeekends, settings.holidaySet));
          break;
        }
        case 'SF': {
          var targetFinish2 = shiftByWorkdays_(pred.start, p.lag, settings.skipWeekends, settings.holidaySet);
          candidates.push(shiftByWorkdays_(targetFinish2, -(Math.max(t.duration, 1) - 1), settings.skipWeekends, settings.holidaySet));
          break;
        }
      }
    });

    if (candidates.length === 0) {
      var base = t.startPinned || settings.projectStart;
      t.start = shiftByWorkdays_(base, 0, settings.skipWeekends, settings.holidaySet);
    } else {
      t.start = new Date(Math.max.apply(null, candidates.map(function (d) { return d.getTime(); })));
    }

    t.finish = t.milestone
      ? t.start
      : shiftByWorkdays_(t.start, Math.max(t.duration, 1) - 1, settings.skipWeekends, settings.holidaySet);
  });
}

function computeCriticalPath_(tasks, byId, order, successors, settings) {
  var projectEnd = new Date(Math.max.apply(null, tasks.map(function (t) { return t.finish.getTime(); })));

  var reverseOrder = order.slice().reverse();
  reverseOrder.forEach(function (id) {
    var t = byId[id];
    var succIds = successors[id];
    if (succIds.length === 0) {
      t.lateFinish = projectEnd;
    } else {
      var lateStarts = succIds.map(function (sId) { return byId[sId].lateStart; });
      var earliestSuccLS = new Date(Math.min.apply(null, lateStarts.map(function (d) { return d.getTime(); })));
      t.lateFinish = shiftByWorkdays_(earliestSuccLS, -1, settings.skipWeekends, settings.holidaySet);
    }
    t.lateStart = t.milestone
      ? t.lateFinish
      : shiftByWorkdays_(t.lateFinish, -(Math.max(t.duration, 1) - 1), settings.skipWeekends, settings.holidaySet);

    t.slack = workdaysBetween_(t.start, t.lateStart, settings.skipWeekends, settings.holidaySet);
    t.critical = t.slack === 0;
  });

  return projectEnd;
}

/**
 * Recomputes Start/Finish/Critical/Slack for every task in the Tasks sheet
 * and writes the results back. Returns the task list (with computed fields)
 * so callers (e.g. drawGanttChart) don't have to re-read the sheet.
 */
function calculateSchedule() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (!sheet) throw new Error('Sheet "Tasks" tidak ditemukan. Jalankan Timelinea > Initialize dulu.');

  var settings = readSettings_(ss);
  var tasks = readTasks_(sheet);
  if (tasks.length === 0) return [];

  var byId = {};
  tasks.forEach(function (t) {
    if (byId[t.id]) throw new Error('ID task duplikat: ' + t.id);
    byId[t.id] = t;
  });

  var topo = topoSort_(tasks, byId);
  computeForwardPass_(tasks, byId, topo.order, settings);
  computeCriticalPath_(tasks, byId, topo.order, topo.successors, settings);

  tasks.forEach(function (t) {
    sheet.getRange(t.row, COL.START, 1, 1).setValue(t.start);
    sheet.getRange(t.row, COL.FINISH, 1, 1).setValue(t.finish);
    sheet.getRange(t.row, COL.CRITICAL, 1, 1).setValue(t.critical);
    sheet.getRange(t.row, COL.SLACK, 1, 1).setValue(t.slack);
  });

  return tasks;
}
