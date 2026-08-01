/**
 * Auto-scheduling engine: parses predecessor links, runs a forward pass to
 * compute Start/Finish per task (honoring FS/SS/FF/SF + lag, like MS Project),
 * then a backward pass to compute slack and flag the critical path. Summary
 * tasks (rows that have subtasks nested under them via the Level column) are
 * excluded from that pass and instead roll up their Start/Finish/% Complete/
 * Cost from their children, bottom-up, once the leaf tasks are scheduled.
 *
 * Simplification (documented in README): the backward/slack pass treats every
 * dependency as Finish-to-Start with zero lag. Forward-pass dates still honor
 * the real link type, so schedules are accurate; only the slack number for
 * tasks linked by SS/FF/SF is an approximation. Predecessors must point at
 * leaf tasks, not summary tasks — link to the relevant child(ren) instead.
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

/** Splits "Subur, Ade" into ["Subur", "Ade"]. Names are matched against the Resources sheet case-insensitively. */
function parseAssignees_(raw) {
  if (!raw) return [];
  return String(raw).split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function readTasks_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, TASKS_LAST_COL).getValues();
  var tasks = [];
  values.forEach(function (row, i) {
    var id = row[COL.ID - 1];
    if (id === '' || id === null) return; // row not filled in yet (no ID) — skip until it has one
    tasks.push({
      row: i + 2,
      id: Number(id),
      name: row[COL.NAME - 1],
      level: Math.max(0, Math.floor(Number(row[COL.LEVEL - 1]) || 0)),
      duration: Math.max(0, Number(row[COL.DURATION - 1]) || 0),
      startPinned: row[COL.START - 1] instanceof Date ? stripTime_(row[COL.START - 1]) : null,
      predecessors: parsePredecessors_(row[COL.PREDECESSORS - 1]),
      pctComplete: Number(row[COL.PCT_COMPLETE - 1]) || 0,
      assignees: parseAssignees_(row[COL.RESOURCE - 1]),
      costRate: Number(row[COL.COST_RATE - 1]) || 0,
      milestoneFlag: row[COL.MILESTONE - 1] === true,
      baselineFinish: row[COL.BASELINE_FINISH - 1] instanceof Date ? stripTime_(row[COL.BASELINE_FINISH - 1]) : null
    });
  });
  return tasks;
}

/** Reads the Resources sheet (Name, Rate/Day). Optional — returns [] if the sheet doesn't exist yet. */
function readResourceRows_(ss) {
  var sheet = ss.getSheetByName(RESOURCES_SHEET);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, RESOURCES_COL.NAME, lastRow - 1, 2).getValues(); // Name, Rate/Day
  var resources = [];
  values.forEach(function (row, i) {
    if (!row[0]) return;
    resources.push({ name: String(row[0]).trim(), rate: Number(row[1]) || 0, row: i + 2 });
  });
  return resources;
}

/**
 * Writes each resource's assigned task list, total allocated days, and
 * total pay (rate/day × total days) back into the Resources sheet.
 */
function updateResourceSheet_(ss, resourceRows, tasks) {
  var sheet = ss.getSheetByName(RESOURCES_SHEET);
  if (!sheet || resourceRows.length === 0) return;

  var byKey = {};
  resourceRows.forEach(function (r) {
    byKey[r.name.toLowerCase()] = { row: r.row, rate: r.rate, taskLabels: [], totalDays: 0 };
  });

  tasks.forEach(function (t) {
    t.assignees.forEach(function (name) {
      var r = byKey[name.toLowerCase()];
      if (!r) return; // unknown names are surfaced separately via computeLeafCost_
      r.taskLabels.push(t.name);
      r.totalDays += Math.max(t.duration, 1);
    });
  });

  Object.keys(byKey).forEach(function (key) {
    var r = byKey[key];
    sheet.getRange(r.row, RESOURCES_COL.ASSIGNED_TASKS).setValue(r.taskLabels.join(', '));
    sheet.getRange(r.row, RESOURCES_COL.TOTAL_DAYS).setValue(r.totalDays);
    sheet.getRange(r.row, RESOURCES_COL.TOTAL_PAY).setValue(r.rate * r.totalDays);
  });
}

/**
 * Determines each task's direct children from the Level column (a task's
 * children are the contiguous run of following rows at exactly level+1,
 * stopping at the first row whose level is <= its own). A task with any
 * children is a summary task and gets excluded from CPM scheduling —
 * its Start/Finish/Duration/% Complete/Cost are rolled up instead.
 */
function buildOutline_(tasks) {
  tasks.forEach(function (t, i) {
    var children = [];
    var childLevel = t.level + 1;
    for (var j = i + 1; j < tasks.length; j++) {
      var u = tasks[j];
      if (u.level <= t.level) break;
      if (u.level === childLevel) children.push(u);
    }
    t.children = children;
    t.isSummary = children.length > 0;
    t.milestone = !t.isSummary && (t.milestoneFlag || t.duration === 0);
  });
}

/** Kahn's algorithm topological sort; throws a descriptive error on a cycle. */
function topoSort_(tasks, byId) {
  var indegree = {};
  var successors = {};
  tasks.forEach(function (t) { indegree[t.id] = 0; successors[t.id] = []; });

  tasks.forEach(function (t) {
    t.predecessors.forEach(function (p) {
      var pred = byId[p.id];
      if (!pred) throw new Error('Task "' + t.name + '" mereferensikan predecessor ID ' + p.id + ' yang tidak ada.');
      if (pred.isSummary) {
        throw new Error('Task "' + t.name + '" tidak bisa punya predecessor ke summary task ("' + pred.name +
          '", ID ' + pred.id + '). Arahkan ke subtask spesifik di dalamnya.');
      }
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

function computeForwardPass_(byId, order, settings) {
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

function computeCriticalPath_(leafTasks, byId, order, successors, settings) {
  var projectEnd = new Date(Math.max.apply(null, leafTasks.map(function (t) { return t.finish.getTime(); })));

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
}

/**
 * Planned/actual cost for a leaf task = labor cost (each assignee's
 * Rate/Day × Duration, from the Resources sheet) + Cost/Day × Duration
 * (materials/equipment; treated as a flat one-time cost for milestones).
 * Assignee names not found in Resources are collected into unknownNames
 * (by reference) so calculateSchedule can warn about typos.
 */
function computeLeafCost_(t, rateByName, unknownNames) {
  var laborCost = t.assignees.reduce(function (sum, name) {
    var key = name.toLowerCase();
    if (!(key in rateByName)) { unknownNames[name] = true; return sum; }
    return sum + rateByName[key] * Math.max(t.duration, 1);
  }, 0);
  var flatCost = t.milestone ? t.costRate : t.costRate * Math.max(t.duration, 1);
  t.plannedCost = laborCost + flatCost;
  t.actualCost = t.plannedCost * (Math.min(Math.max(t.pctComplete, 0), 100) / 100);
}

/**
 * Rolls up Start/Finish/Duration/% Complete/Cost/Critical/Slack for summary
 * tasks from their direct children. Processes rows bottom-to-top so a
 * summary's children (which always appear right after it) are already
 * finalized — including nested summaries — by the time it's their turn.
 */
function computeRollups_(tasks, settings) {
  for (var i = tasks.length - 1; i >= 0; i--) {
    var t = tasks[i];
    if (!t.isSummary) continue;

    var children = t.children;
    t.start = new Date(Math.min.apply(null, children.map(function (c) { return c.start.getTime(); })));
    t.finish = new Date(Math.max.apply(null, children.map(function (c) { return c.finish.getTime(); })));
    t.duration = workdaysBetween_(t.start, t.finish, settings.skipWeekends, settings.holidaySet) + 1;

    var totalDuration = children.reduce(function (sum, c) { return sum + Math.max(c.duration, 1); }, 0) || 1;
    t.pctComplete = children.reduce(function (sum, c) { return sum + Math.max(c.duration, 1) * c.pctComplete; }, 0) / totalDuration;

    t.plannedCost = children.reduce(function (sum, c) { return sum + c.plannedCost; }, 0);
    t.actualCost = children.reduce(function (sum, c) { return sum + c.actualCost; }, 0);
    t.critical = children.some(function (c) { return c.critical; });
    t.slack = Math.min.apply(null, children.map(function (c) { return c.slack; }));
  }
}

/**
 * Writes Total Planned Cost / Total Actual Cost to the Settings sheet as
 * plain values (summed over top-level tasks only, since their cost already
 * rolls up everything beneath them). Plain values instead of a SUMIF formula
 * so this doesn't depend on the spreadsheet's locale-specific formula syntax
 * (e.g. comma vs semicolon argument separators).
 */
function updateSettingsTotals_(ss, tasks) {
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) return;
  var topLevel = tasks.filter(function (t) { return t.level === 0; });
  var totalPlanned = topLevel.reduce(function (sum, t) { return sum + t.plannedCost; }, 0);
  var totalActual = topLevel.reduce(function (sum, t) { return sum + t.actualCost; }, 0);
  sheet.getRange(SETTINGS.TOTAL_PLANNED_COST).setValue(totalPlanned);
  sheet.getRange(SETTINGS.TOTAL_ACTUAL_COST).setValue(totalActual);
}

/**
 * Recomputes Start/Finish/Critical/Slack/Cost for every task in the Tasks
 * sheet (rolling up summary/subtask rows) and writes the results back.
 * Returns the task list (with computed fields) so callers (e.g.
 * drawGanttChart) don't have to re-read the sheet.
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

  buildOutline_(tasks);

  var leafTasks = tasks.filter(function (t) { return !t.isSummary; });
  var leafById = {};
  leafTasks.forEach(function (t) { leafById[t.id] = t; });

  var topo = topoSort_(leafTasks, byId);
  computeForwardPass_(leafById, topo.order, settings);
  computeCriticalPath_(leafTasks, leafById, topo.order, topo.successors, settings);

  var resourceRows = readResourceRows_(ss);
  var rateByName = {};
  resourceRows.forEach(function (r) { rateByName[r.name.toLowerCase()] = r.rate; });
  var unknownNames = {};
  leafTasks.forEach(function (t) { computeLeafCost_(t, rateByName, unknownNames); });

  computeRollups_(tasks, settings);

  tasks.forEach(function (t) {
    sheet.getRange(t.row, COL.START).setValue(t.start);
    sheet.getRange(t.row, COL.FINISH).setValue(t.finish);
    sheet.getRange(t.row, COL.CRITICAL).setValue(t.critical);
    sheet.getRange(t.row, COL.SLACK).setValue(t.slack);
    sheet.getRange(t.row, COL.PLANNED_COST).setValue(t.plannedCost);
    sheet.getRange(t.row, COL.ACTUAL_COST).setValue(t.actualCost);
    if (t.isSummary) {
      sheet.getRange(t.row, COL.DURATION).setValue(t.duration);
      sheet.getRange(t.row, COL.PCT_COMPLETE).setValue(Math.round(t.pctComplete * 10) / 10);
    }
    // Variance vs Baseline Finish (set via Timelinea > Set Baseline): positive
    // = running late, negative = ahead of schedule. Blank until a baseline exists.
    sheet.getRange(t.row, COL.VARIANCE).setValue(
      t.baselineFinish ? signedWorkdaysBetween_(t.baselineFinish, t.finish, settings.skipWeekends, settings.holidaySet) : '');
  });

  updateResourceSheet_(ss, resourceRows, tasks);
  updateSettingsTotals_(ss, tasks);

  if (Object.keys(unknownNames).length) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Nama di "Assigned To" tidak ditemukan di sheet Resources: ' + Object.keys(unknownNames).join(', '),
        'Timelinea', 8);
    } catch (e) { /* best-effort notice only; never break the calculation over this */ }
  }

  return tasks;
}
