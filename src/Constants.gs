/**
 * Shared layout constants for the Timelinea project scheduler.
 * Keeping every sheet/column reference here avoids magic numbers scattered
 * across Code.gs / Scheduler.gs / Gantt.gs.
 */

var TASKS_SHEET = 'Tasks';
var SETTINGS_SHEET = 'Settings';
var RESOURCES_SHEET = 'Resources';
var ISSUES_SHEET = 'Issues';

// Tasks sheet columns (1-indexed)
var COL = {
  ID: 1,
  NAME: 2,
  LEVEL: 3,
  DURATION: 4,
  START: 5,
  FINISH: 6,
  PREDECESSORS: 7,
  PCT_COMPLETE: 8,
  RESOURCE: 9,
  COST_RATE: 10,
  PLANNED_COST: 11,
  ACTUAL_COST: 12,
  MILESTONE: 13,
  CRITICAL: 14,
  SLACK: 15,
  BASELINE_START: 16,
  BASELINE_FINISH: 17,
  VARIANCE: 18,
  HAS_ISSUE: 19
};

var TASKS_HEADER = [
  'ID', 'Task Name', 'Level', 'Duration (d)', 'Start', 'Finish',
  'Predecessors', '% Complete', 'Assigned To', 'Cost/Day', 'Planned Cost',
  'Actual Cost', 'Milestone', 'Critical', 'Slack (d)',
  'Baseline Start', 'Baseline Finish', 'Variance (d)', 'Ada Masalah?'
];

var TASKS_LAST_COL = 19;   // column S
var FROZEN_COLS = 2;       // only ID + Task Name — leaves room for the Gantt chart on screen
var GANTT_START_COL = 21;  // column U (leaves column T as a spacer)

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
