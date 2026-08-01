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
  return sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length > 0;
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
    'Sheet Tasks, Settings, dan Resources akan dikunci (tidak bisa diedit siapa pun, termasuk yang ' +
    'punya akses Editor ke file ini) sampai dibuka kembali lewat Timelinea > Buka Kunci Project. ' +
    'Sheet Issues tetap bisa diedit untuk catatan pasca-project. Lanjutkan?',
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
      if (p.canEdit()) p.remove();
    });
  });

  var settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (settingsSheet) settingsSheet.getRange(SETTINGS.PROJECT_STATUS).setValue('Aktif');

  ui.alert('Project dibuka kembali dan bisa diedit.');
}
