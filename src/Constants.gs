/**
 * Shared layout constants for the Timelinea project scheduler.
 * Keeping every sheet/column reference here avoids magic numbers scattered
 * across Code.gs / Scheduler.gs / Gantt.gs.
 */

var TASKS_SHEET = 'Tasks';
var SETTINGS_SHEET = 'Settings';
var RESOURCES_SHEET = 'Resources';
var ISSUES_SHEET = 'Issues';

// Tasks sheet columns (1-indexed). ROW_ACTION sits right after Task Name
// (not at the far end) and is a frozen column — reported that putting it
// past every other column meant scrolling across the whole sheet just to
// reach it, which defeated the point of a quick per-row control.
var COL = {
  ID: 1,
  NAME: 2,
  ROW_ACTION: 3,
  LEVEL: 4,
  DURATION: 5,
  START: 6,
  FINISH: 7,
  PREDECESSORS: 8,
  PCT_COMPLETE: 9,
  RESOURCE: 10,
  COST_RATE: 11,
  PLANNED_COST: 12,
  ACTUAL_COST: 13,
  MILESTONE: 14,
  CRITICAL: 15,
  SLACK: 16,
  BASELINE_START: 17,
  BASELINE_FINISH: 18,
  VARIANCE: 19,
  HAS_ISSUE: 20
};

var TASKS_HEADER = [
  'ID', 'Task Name', '+ / ↓ / -', 'Level', 'Duration (d)', 'Start', 'Finish',
  'Predecessors', '% Complete', 'Assigned To', 'Cost/Day', 'Planned Cost',
  'Actual Cost', 'Milestone', 'Critical', 'Slack (d)',
  'Baseline Start', 'Baseline Finish', 'Variance (d)', 'Ada Masalah?'
];

var TASKS_LAST_COL = 20;   // column T
var FROZEN_COLS = 3;       // ID + Task Name + the +/subtask/- control, always visible regardless of scroll
var ROW_ACTION_COL = COL.ROW_ACTION;
var GANTT_START_COL = 22;  // column V (leaves column U as a spacer)

// Bare symbols on purpose — kept as compact as possible so the column stays
// narrow and reads as a simple control, not another data field to fill in.
var ROW_ACTION_ADD = '+';
var ROW_ACTION_SUBTASK = '↓';
var ROW_ACTION_DELETE = '-';
var ROW_ACTION_ASSIGN = '👤';  // opens the Assigned To picker — the ONE way to set it, replacing a redundant dropdown

// Issues sheet columns (1-indexed) — a running problem/lessons-learned log,
// linked to Tasks by ID but never cleared by "Mulai Project Baru", since the
// whole point is to remember what went wrong across projects, not just one.
var ISSUES_COL = {
  ID: 1,
  TASK_ID: 2,
  TASK_NAME: 3,
  DATE: 4,
  PROBLEM: 5,
  CAUSE: 6,
  RESOLUTION: 7,
  STATUS: 8
};

var ISSUES_HEADER = [
  'ID', 'Task ID', 'Task Name', 'Tanggal Kejadian', 'Deskripsi Masalah',
  'Penyebab', 'Penyelesaian', 'Status'
];

// Resources sheet columns (1-indexed)
var RESOURCES_COL = {
  NAME: 1,
  RATE: 2,
  ROLE: 3,
  ASSIGNED_TASKS: 4,
  TOTAL_DAYS: 5,
  TOTAL_PAY: 6
};

var RESOURCES_HEADER = [
  'Name', 'Rate/Day', 'Role', 'Assigned Tasks', 'Total Days Allocated', 'Total Pay'
];

// Itemized material/goods purchases per task — e.g. a task like "Beli Bahan
// Besi/Baja" often means several different items, not one flat Cost/Day
// figure. Linked to Tasks by ID+Name (same collision-avoidance as Issues,
// since Task IDs restart every "Mulai Project Baru"). Rolls into that
// task's Planned/Actual Cost alongside labor cost and Cost/Day — see
// readPurchaseTotals_ in Scheduler.gs. Reset with Tasks/Resources on a new
// project (unlike Issues, which is a permanent lessons-learned log).
var PURCHASES_SHEET = 'Pembelian Bahan';
var PURCHASES_COL = {
  ID: 1,
  TASK_ID: 2,
  TASK_NAME: 3,
  ITEM: 4,
  QTY: 5,
  UNIT: 6,
  UNIT_PRICE: 7,
  TOTAL: 8
};

var PURCHASES_HEADER = [
  'ID', 'Task ID', 'Task Name', 'Bahan/Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Total'
];

var GANTT_MAX_DAYS = 400;                 // hard cap when rendering one column per day
var GANTT_WEEK_VIEW_THRESHOLD_DAYS = 45;  // beyond this span, switch to one column per week
var GANTT_MAX_WEEKS = 260;                // ~5 years, hard cap when rendering one column per week

// Settings sheet cell addresses
var SETTINGS = {
  PROJECT_START: 'B3',
  SKIP_WEEKENDS: 'B4',
  PROJECT_DEADLINE: 'B5',    // optional: overall target finish date, user-entered
  TOTAL_PLANNED_COST: 'B7',
  TOTAL_ACTUAL_COST: 'B8',
  PROJECTED_FINISH: 'B9',    // computed: latest Finish among top-level tasks
  DEADLINE_STATUS: 'B10',    // computed: PROJECTED_FINISH vs PROJECT_DEADLINE, in words
  PROJECT_STATUS: 'B12',
  FINISHED_AT: 'B13',
  HOLIDAYS_FIRST_ROW: 16,
  HOLIDAYS_COL: 2 // column B
};

var COLOR = {
  // Calm, muted palette for everyday viewing — most people find soft, low-
  // saturation colors easier on the eyes for a sheet they'll look at all day.
  BAR_NORMAL: '#7fa6c9',
  BAR_NORMAL_DONE: '#3d6690',
  BAR_CRITICAL: '#c98c8c',
  BAR_CRITICAL_DONE: '#8a4a4a',
  BAR_SUMMARY: '#7b8794',
  MILESTONE: '#3a3a3a',
  TODAY_BORDER: '#c98a3d',
  WEEKEND_BG: '#f5f4f0',
  HEADER_BG: '#efefef',

  // Sheet theme (header bars, row highlighting) — separate from the Gantt
  // bar palette above so the two can be tuned independently.
  HEADER_ROW_BG: '#5b7c99',
  HEADER_ROW_TEXT: '#ffffff',
  ZEBRA_ROW_BG: '#f7f8fa',
  CRITICAL_ROW_BG: '#f6e9e8',
  TITLE_BAR_BG: '#5b7c99',
  TITLE_BAR_TEXT: '#ffffff',
  GRID_LINE: '#d9d9d9',
  FROZEN_DIVIDER: '#9aa5b1',

  // The one deliberate exception: a late task should NOT be calm — it needs
  // to jump out so it's never missed. Bold, saturated, and given top
  // conditional-format priority (see setupTasksSheet_).
  VARIANCE_LATE_BG: '#e8710a',
  VARIANCE_LATE_TEXT: '#ffffff',

  // Issues sheet
  ISSUE_OPEN_BG: '#f4cccc',
  ISSUE_OPEN_TEXT: '#990000'
};

/** Converts a 1-indexed column number to its A1 letter (1 -> "A", 27 -> "AA"). */
function colLetter_(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}
