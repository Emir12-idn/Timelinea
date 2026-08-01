/**
 * Shared layout constants for the Timelinea project scheduler.
 * Keeping every sheet/column reference here avoids magic numbers scattered
 * across Code.gs / Scheduler.gs / Gantt.gs.
 */

var TASKS_SHEET = 'Tasks';
var SETTINGS_SHEET = 'Settings';

// Tasks sheet columns (1-indexed)
var COL = {
  ID: 1,
  NAME: 2,
  DURATION: 3,
  START: 4,
  FINISH: 5,
  PREDECESSORS: 6,
  PCT_COMPLETE: 7,
  RESOURCE: 8,
  MILESTONE: 9,
  CRITICAL: 10,
  SLACK: 11
};

var TASKS_HEADER = [
  'ID', 'Task Name', 'Duration (d)', 'Start', 'Finish',
  'Predecessors', '% Complete', 'Resource', 'Milestone', 'Critical', 'Slack (d)'
];

var TASKS_LAST_COL = 11;      // column K
var GANTT_START_COL = 13;     // column M (leaves column L as a spacer)
var GANTT_MAX_DAYS = 400;     // hard cap to keep the chart within Sheets limits

// Settings sheet cell addresses
var SETTINGS = {
  PROJECT_START: 'B3',
  SKIP_WEEKENDS: 'B4',
  HOLIDAYS_FIRST_ROW: 7,
  HOLIDAYS_COL: 2 // column B
};

var COLOR = {
  BAR_NORMAL: '#4a86e8',
  BAR_NORMAL_DONE: '#1c4587',
  BAR_CRITICAL: '#e06666',
  BAR_CRITICAL_DONE: '#990000',
  MILESTONE: '#000000',
  TODAY_BORDER: '#ff9900',
  WEEKEND_BG: '#f3f3f3',
  HEADER_BG: '#efefef'
};
