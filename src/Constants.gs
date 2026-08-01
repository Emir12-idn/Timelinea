/**
 * Shared layout constants for the Timelinea project scheduler.
 * Keeping every sheet/column reference here avoids magic numbers scattered
 * across Code.gs / Scheduler.gs / Gantt.gs.
 */

var TASKS_SHEET = 'Tasks';
var SETTINGS_SHEET = 'Settings';
var RESOURCES_SHEET = 'Resources';

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
  SLACK: 15
};

var TASKS_HEADER = [
  'ID', 'Task Name', 'Level', 'Duration (d)', 'Start', 'Finish',
  'Predecessors', '% Complete', 'Assigned To', 'Cost/Day', 'Planned Cost',
  'Actual Cost', 'Milestone', 'Critical', 'Slack (d)'
];

var TASKS_LAST_COL = 15;   // column O
var FROZEN_COLS = 2;       // only ID + Task Name — leaves room for the Gantt chart on screen
var GANTT_START_COL = 17;  // column Q (leaves column P as a spacer)

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
  TOTAL_PLANNED_COST: 'B6',
  TOTAL_ACTUAL_COST: 'B7',
  HOLIDAYS_FIRST_ROW: 10,
  HOLIDAYS_COL: 2 // column B
};

var COLOR = {
  BAR_NORMAL: '#4a86e8',
  BAR_NORMAL_DONE: '#1c4587',
  BAR_CRITICAL: '#e06666',
  BAR_CRITICAL_DONE: '#990000',
  BAR_SUMMARY: '#434343',
  MILESTONE: '#000000',
  TODAY_BORDER: '#ff9900',
  WEEKEND_BG: '#f3f3f3',
  HEADER_BG: '#efefef'
};
