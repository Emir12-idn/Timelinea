/**
 * "New Project" archiving: locks a finished project's data into an
 * encrypted, non-standard file (.tla) instead of leaving it as an editable
 * Sheet. The file is unreadable outside Timelinea (no key, no viewer), but
 * can be viewed/printed again (read-only, no save) from inside the app via
 * Timelinea > Lihat Arsip Project. This lets a customer start a fresh
 * project in the same spreadsheet (no need to create a new Sheet) while
 * keeping old project data around but not casually editable/redistributable
 * as a plain spreadsheet.
 *
 * Security note (be upfront about this with buyers): the decryption key is
 * derived partly from a secret embedded in this script. Anyone with editor
 * access to the script (which every buyer has, since it's bound to their
 * own sheet) could in principle read that secret from the source code and
 * decrypt a .tla file manually outside the app. This raises the bar high
 * enough to stop casual copying/sharing, which is the realistic threat for
 * this kind of product — it is not meant to withstand a determined attacker.
 * ARCHIVE_APP_SECRET should be changed to a fresh random value before each
 * batch of copies is sold, not reused verbatim from this repository.
 */

var ARCHIVE_FOLDER_NAME = 'Timelinea Archives';
var ARCHIVE_EXTENSION = '.tla';
var ARCHIVE_MIME_TYPE = 'application/x-timelinea-archive';
var ARCHIVE_APP_SECRET = 'CHANGE-ME-BEFORE-SELLING-3f9Qz7Lm2Rk8VxT1';

// --- Lightweight symmetric cipher (HMAC-SHA256 keystream, XOR) ---------
// Not a substitute for AES, but needs no external library and is opaque
// enough that the .tla file cannot be read by any common application.

function getArchiveKey_() {
  var props = PropertiesService.getDocumentProperties();
  var docSecret = props.getProperty('ARCHIVE_DOC_SECRET');
  if (!docSecret) {
    docSecret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('ARCHIVE_DOC_SECRET', docSecret);
  }
  return ARCHIVE_APP_SECRET + ':' + docSecret;
}

function keystreamBytes_(key, ivB64, length) {
  var bytes = [];
  var counter = 0;
  while (bytes.length < length) {
    bytes = bytes.concat(Utilities.computeHmacSha256Signature(ivB64 + ':' + counter, key));
    counter++;
  }
  return bytes.slice(0, length);
}

function xorBytes_(dataBytes, keyBytes) {
  var out = [];
  for (var i = 0; i < dataBytes.length; i++) {
    out.push((dataBytes[i] & 0xFF) ^ (keyBytes[i] & 0xFF));
  }
  return out;
}

function encryptText_(plainText) {
  var key = getArchiveKey_();
  var ivB64 = Utilities.base64Encode(Utilities.getUuid());
  var dataBytes = Utilities.newBlob(plainText).getBytes();
  var cipherBytes = xorBytes_(dataBytes, keystreamBytes_(key, ivB64, dataBytes.length));
  return ivB64 + '.' + Utilities.base64Encode(cipherBytes);
}

function decryptText_(payload) {
  var key = getArchiveKey_();
  var sep = payload.indexOf('.');
  var ivB64 = payload.substring(0, sep);
  var cipherBytes = Utilities.base64Decode(payload.substring(sep + 1));
  var plainBytes = xorBytes_(cipherBytes, keystreamBytes_(key, ivB64, cipherBytes.length));
  return Utilities.newBlob(plainBytes).getDataAsString();
}

// --- Archiving --------------------------------------------------------

function getArchiveFolder_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var parents = DriveApp.getFileById(ss.getId()).getParents();
  var parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var existing = parentFolder.getFoldersByName(ARCHIVE_FOLDER_NAME);
  return existing.hasNext() ? existing.next() : parentFolder.createFolder(ARCHIVE_FOLDER_NAME);
}

function snapshotSheetData_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { headers: [], rows: [] };
  var values = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  return { headers: values[0], rows: values.slice(1) };
}

function archiveCurrentProject_(projectLabel) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tasksSheet = ss.getSheetByName(TASKS_SHEET);
  var resourcesSheet = ss.getSheetByName(RESOURCES_SHEET);
  var purchasesSheet = ss.getSheetByName(PURCHASES_SHEET);
  var settingsSheet = ss.getSheetByName(SETTINGS_SHEET);

  var snapshot = {
    projectLabel: projectLabel,
    archivedAt: new Date().toISOString(),
    tasks: tasksSheet ? snapshotSheetData_(tasksSheet) : null,
    resources: resourcesSheet ? snapshotSheetData_(resourcesSheet) : null,
    purchases: purchasesSheet ? snapshotSheetData_(purchasesSheet) : null,
    settingsNote: settingsSheet ? {
      projectStart: settingsSheet.getRange(SETTINGS.PROJECT_START).getDisplayValue(),
      totalPlanned: settingsSheet.getRange(SETTINGS.TOTAL_PLANNED_COST).getDisplayValue(),
      totalActual: settingsSheet.getRange(SETTINGS.TOTAL_ACTUAL_COST).getDisplayValue()
    } : null
  };

  var encrypted = encryptText_(JSON.stringify(snapshot));
  var fileName = projectLabel.replace(/[\\/:*?"<>|]/g, '-') + ARCHIVE_EXTENSION;
  return getArchiveFolder_().createFile(fileName, encrypted, ARCHIVE_MIME_TYPE);
}

/** Archives the current Tasks/Resources data, then clears Tasks for a fresh project (same sheet, no new file). */
function startNewProject() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tasksSheet = ss.getSheetByName(TASKS_SHEET);
  if (!tasksSheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }

  if (isProjectLocked_(ss)) {
    ui.alert('Project ini sedang terkunci (ditandai selesai). Buka dulu lewat Timelinea > Buka Kunci ' +
      'Project sebelum memulai project baru.');
    return;
  }

  var response = ui.prompt(
    'Mulai Project Baru',
    'Project yang sedang berjalan akan dikunci sebagai arsip (hanya bisa dilihat lagi lewat ' +
    'Timelinea > Lihat Arsip Project, tidak bisa diedit) dan sheet Tasks akan dikosongkan untuk ' +
    'project baru. Beri nama untuk project ini:',
    ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  var label = response.getResponseText().trim() ||
    ('Project ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));

  archiveCurrentProject_(label);

  var lastRow = tasksSheet.getLastRow();
  if (lastRow > 1) {
    tasksSheet.getRange(2, 1, lastRow - 1, TASKS_LAST_COL).clearContent();
    for (var r = 2; r <= lastRow; r++) {
      var depth = tasksSheet.getRowGroupDepth(r);
      if (depth > 0) tasksSheet.getRange(r, 1).shiftRowGroupDepth(-depth);
    }
  }
  clearGanttArea_(tasksSheet);

  // Purchases are tied to specific Task IDs, which restart from 1 on every
  // new project — old purchase rows would otherwise silently attach to
  // whatever unrelated task happens to get the same ID next. Cleared here
  // (already captured in the archive above), unlike Resources, which is
  // usually the same people/rates reused project to project.
  var purchasesSheet = ss.getSheetByName(PURCHASES_SHEET);
  if (purchasesSheet) {
    var purchasesLastRow = purchasesSheet.getLastRow();
    if (purchasesLastRow > 1) purchasesSheet.getRange(2, 1, purchasesLastRow - 1, PURCHASES_HEADER.length).clearContent();
  }

  var settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (settingsSheet) settingsSheet.getRange(SETTINGS.PROJECT_START).setValue(stripTime_(new Date()));

  ui.alert('Project "' + label + '" sudah diarsipkan. Sheet Tasks sudah dikosongkan untuk project baru.');
}

// --- Read-only viewer (HtmlService dialog) -----------------------------

function openArchiveViewer() {
  var html = HtmlService.createHtmlOutputFromFile('ArchiveDialog').setWidth(760).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Arsip Project (Read-only)');
}

/** Called from ArchiveDialog.html via google.script.run. */
function listArchives() {
  var files = getArchiveFolder_().getFiles();
  var items = [];
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf(ARCHIVE_EXTENSION) === -1) continue;
    items.push({
      id: f.getId(),
      name: f.getName(),
      date: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    });
  }
  items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return items;
}

function escapeHtml_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function archiveTableHtml_(section) {
  if (!section || !section.headers || section.headers.length === 0) return '<p><i>(kosong)</i></p>';
  var html = '<table class="arc-table"><tr>';
  section.headers.forEach(function (c) { html += '<th>' + escapeHtml_(c) + '</th>'; });
  html += '</tr>';
  section.rows.forEach(function (row) {
    html += '<tr>';
    row.forEach(function (c) { html += '<td>' + escapeHtml_(c) + '</td>'; });
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

/** Called from ArchiveDialog.html via google.script.run; decrypts and renders one archive. */
function getArchiveHtml(fileId) {
  var encrypted = DriveApp.getFileById(fileId).getBlob().getDataAsString();
  var snapshot = JSON.parse(decryptText_(encrypted));

  var html = '<h2>' + escapeHtml_(snapshot.projectLabel) + '</h2>';
  html += '<p><i>Diarsipkan: ' + escapeHtml_(snapshot.archivedAt) + '</i></p>';
  if (snapshot.settingsNote) {
    html += '<p>Tanggal mulai: ' + escapeHtml_(snapshot.settingsNote.projectStart) +
      ' | Total Planned Cost: ' + escapeHtml_(snapshot.settingsNote.totalPlanned) +
      ' | Total Actual Cost: ' + escapeHtml_(snapshot.settingsNote.totalActual) + '</p>';
  }
  html += '<h3>Tasks</h3>' + archiveTableHtml_(snapshot.tasks);
  html += '<h3>Resources</h3>' + archiveTableHtml_(snapshot.resources);
  html += '<h3>Pembelian Bahan</h3>' + archiveTableHtml_(snapshot.purchases);
  return html;
}
