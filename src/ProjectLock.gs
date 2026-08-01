/**
 * "Tandai Project Selesai" locks Tasks/Settings/Resources using Google
 * Sheets' native Protection service — unlike Drive sharing permissions,
 * this genuinely blocks edits regardless of whether someone has Editor
 * access to the file. It's the right tool for "this project is closed,
 * nobody should change it anymore" (as opposed to Archive.gs, which is for
 * moving old project data out of the way entirely to start a new project in
 * the same file).
 *
 * The Issues sheet is deliberately left unprotected, since post-project
 * notes/lessons-learned are often written after the project is marked done.
 */

var LOCKED_SHEETS_ = [TASKS_SHEET, SETTINGS_SHEET, RESOURCES_SHEET];
var LOCK_DESCRIPTION_ = 'Timelinea: Project Selesai (terkunci)';

function isProjectLocked_(ss) {
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (!sheet) return false;
  return sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
    .some(function (p) { return p.getDescription() === LOCK_DESCRIPTION_; });
  // Matched by description (not just "any protection exists") so a protection
  // the user set up themselves for an unrelated reason isn't mistaken for a
  // Timelinea lock, and isn't wiped out by unlockProject() below.
}

/**
 * Software backstop for the spreadsheet OWNER specifically. Sheets'
 * Protection API cannot exclude the file owner — Protection.removeEditor(s)
 * is documented to silently have no effect when the target is the owner —
 * so for the common case where the buyer owns their own copy of the sheet,
 * protect() alone would make "Tandai Project Selesai" a no-op for exactly
 * the person it's meant to stop from absent-mindedly editing. This onEdit
 * hook (wired in Triggers.gs) adds a real, enforced backstop on top: a
 * single-cell edit is reverted automatically using e.oldValue; a multi-cell
 * edit (e.g. pasting a block) has no old values to restore, so it gets a
 * loud warning instead asking for a manual Ctrl+Z. Not a perfect guarantee
 * for multi-cell edits, but far better than silently doing nothing.
 */
function enforceLockOnEdit_(e) {
  var isSingleCell = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
  var reverted = true;

  if (isSingleCell) {
    var oldValue = e.oldValue;
    if (oldValue === 'TRUE') oldValue = true;
    else if (oldValue === 'FALSE') oldValue = false;
    if (oldValue === undefined) {
      e.range.clearContent();
    } else {
      e.range.setValue(oldValue);
    }
  } else {
    reverted = false;
  }

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Project ini terkunci (ditandai selesai) — edit dibatalkan otomatis. Buka dulu lewat Timelinea > ' +
      'Buka Kunci Project untuk mengedit.' +
      (reverted ? '' : ' Perubahan pada banyak sel sekaligus tidak bisa dibatalkan otomatis — tekan Ctrl+Z.'),
      'Timelinea — Terkunci', 6);
  } catch (err) { /* best-effort notice only */ }
}

function markProjectFinished() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!settingsSheet) { ui.alert('Jalankan Timelinea > Initialize dulu.'); return; }

  if (isProjectLocked_(ss)) {
    ui.alert('Project ini sudah ditandai selesai dan terkunci.');
    return;
  }

  var response = ui.alert(
    'Tandai Project Selesai',
    'Sheet Tasks, Settings, dan Resources akan dikunci sampai dibuka kembali lewat Timelinea > Buka Kunci ' +
    'Project. Ini benar-benar memblokir orang lain yang diberi akses Editor ke file ini. Untuk Anda sendiri ' +
    'sebagai pemilik file (Google Sheets tidak mengizinkan pemilik dikunci total), Timelinea akan membatalkan ' +
    'otomatis tiap edit satu-sel dan memberi peringatan kalau Anda mengedit banyak sel sekaligus (mis. paste) — ' +
    'bukan jaminan mutlak, tapi cukup untuk mencegah salah edit tanpa sadar. Sheet Issues tetap bisa diedit ' +
    'untuk catatan pasca-project. Lanjutkan?',
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  // Write the status fields first — once the sheet is protected, even this
  // script would need to already be excluded from editing to fail, but
  // ordering it before protect() avoids any ambiguity.
  settingsSheet.getRange(SETTINGS.PROJECT_STATUS).setValue('Selesai');
  settingsSheet.getRange(SETTINGS.FINISHED_AT).setValue(new Date()).setNumberFormat('yyyy-MM-dd HH:mm');

  LOCKED_SHEETS_.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    var protection = sheet.protect().setDescription(LOCK_DESCRIPTION_);
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  });

  ui.alert('Project ditandai selesai dan terkunci. Gunakan Timelinea > Buka Kunci Project untuk mengedit lagi.');
}

function unlockProject() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!isProjectLocked_(ss)) {
    ui.alert('Project ini sedang tidak terkunci.');
    return;
  }

  var response = ui.alert(
    'Buka Kunci Project',
    'Ini akan membuka kembali sheet Tasks, Settings, dan Resources supaya bisa diedit. Lanjutkan?',
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  LOCKED_SHEETS_.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) {
      if (p.getDescription() === LOCK_DESCRIPTION_ && p.canEdit()) p.remove();
    });
  });

  var settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (settingsSheet) settingsSheet.getRange(SETTINGS.PROJECT_STATUS).setValue('Aktif');

  ui.alert('Project dibuka kembali dan bisa diedit.');
}
