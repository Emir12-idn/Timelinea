const fs = require("fs");
const {
  Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, ImageRun, Header, Footer,
  PageNumber, NumberFormat, Packer, PageBreak, LevelFormat, convertInchesToTwip,
  TableOfContents, VerticalAlign, PositionalTab, PositionalTabAlignment, PositionalTabLeader,
  PageOrientation, SectionType, ColumnBreak, HeightRule, TableLayoutType, WpsShapeRun,
} = require("docx");

const NAVY = "1F3864";
const BLUE = "2E5C8A";
const TEAL = "2E86AB";
const LIGHT = "EAF1F8";
const GREY = "595959";
const ORANGE = "C55A11";
const RED = "C00000";

const RS = __dirname + "/resized/";
const IMG = {
  panel_closed: RS + "panel_closed.jpg",
  pulse_overhead: RS + "pulse_overhead.jpg",
  panel_wiring: RS + "panel_wiring.jpg",
  pulse_bench: RS + "pulse_bench.jpg",
  forklift: RS + "forklift.jpg",
  unit_outside: RS + "unit_outside.jpg",
  hopper: RS + "hopper.jpg",
  blower: RS + "blower.jpg",
  butterfly: RS + "butterfly.jpg",
  clamp: RS + "clamp.jpg",
};
const IMG_SIZE = {
  panel_closed: [1400, 1054], pulse_overhead: [1054, 1400], panel_wiring: [1400, 1054],
  pulse_bench: [787, 1400], forklift: [1054, 1400], unit_outside: [1400, 1054],
  hopper: [1050, 1400], blower: [1050, 1400], butterfly: [1400, 1400], clamp: [629, 1400],
};

function fitBox(key, maxW, maxH) {
  const [w, h] = IMG_SIZE[key];
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

// ---- Original B&W schematic icons (drawn in-house, not sourced photos) ----
// sym_* (danger/warning/note/electric) are generic hazard pictograms, reused
// for every machine unchanged. simple_* are DUST-COLLECTOR component icons
// (fan/filter/hopper/panel/valve) — for a different machine, draw new B&W
// vector-style icons with PIL/Pillow for that machine's components and add
// them here under new keys; don't reuse these for something they don't depict.
// icon_fan/filterbag/panel/pulsevalve/hopper below are an older, unused,
// more-detailed icon set kept only for reference — the current build uses
// the simple_* set.
const ICONS_DIR = __dirname + "/icons/";
const ICON = {
  fan: ICONS_DIR + "icon_fan.png",
  filterbag: ICONS_DIR + "icon_filterbag.png",
  panel: ICONS_DIR + "icon_panel.png",
  pulsevalve: ICONS_DIR + "icon_pulsevalve.png",
  hopper: ICONS_DIR + "icon_hopper.png",
  danger: ICONS_DIR + "sym_danger.png",
  warning: ICONS_DIR + "sym_warning.png",
  note: ICONS_DIR + "sym_note.png",
  electric: ICONS_DIR + "sym_electric.png",
  // simple-shape variants (basic geometric icons only) — dust-collector specific, see note above
  simple_fan: ICONS_DIR + "simple_fan.png",
  simple_filter: ICONS_DIR + "simple_filter.png",
  simple_panel: ICONS_DIR + "simple_panel.png",
  simple_valve: ICONS_DIR + "simple_valve.png",
  simple_hopper: ICONS_DIR + "simple_hopper.png",
};
const ICON_SIZE = {
  fan: [260, 200], filterbag: [220, 220], panel: [200, 220], pulsevalve: [260, 140],
  hopper: [160, 180], danger: [160, 150], warning: [160, 150], note: [150, 150], electric: [160, 150],
  simple_fan: [100, 100], simple_filter: [100, 100], simple_panel: [100, 100],
  simple_valve: [110, 90], simple_hopper: [100, 100],
};
// docx ImageRun transformation.width/height are PIXELS at 96 DPI (the library
// converts px -> EMU internally via *9525). DXA (twips) are 1/1440 inch.
// Always size images relative to their actual container width via this helper
// -- never pass a raw DXA number as if it were a pixel count.
const DXA_PER_INCH = 1440;
const PX_PER_INCH = 96;
function dxaToPx(dxa) {
  return (dxa / DXA_PER_INCH) * PX_PER_INCH;
}
function fitIconBox(key, maxW, maxH) {
  const [w, h] = ICON_SIZE[key];
  const ratio = Math.min(maxW / w, maxH / h, 1); // never upscale past source resolution
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
function icon(key, maxW, maxH) {
  const size = fitIconBox(key, maxW, maxH);
  return new ImageRun({ type: "png", data: fs.readFileSync(ICON[key]), transformation: size });
}
// Fit an icon inside a table cell of known DXA width, capped to maxHeightPx.
function iconForCell(key, cellDxaWidth, maxHeightPx, paddingRatio = 0.55) {
  const maxWpx = dxaToPx(cellDxaWidth) * paddingRatio;
  return icon(key, maxWpx, maxHeightPx);
}

// Generic reference diagrams (unbranded line drawings) adapted from public
// pulse-jet dust collector documentation, used only for genuinely generic
// engineering content (wiring topology, exploded assembly, filter-bag
// mounting) -- never for anything that depicts a specific vendor's branded
// product as if it were this unit.
// REF/refImg is the dust-collector job's reference-diagram set (extracted,
// with permission of use, from a real competitor IOM manual — see SKILL.md
// rule 6). No ref_images/ directory ships with this skill: for a new
// machine, source new generic/unbranded reference diagrams the same
// honest way (or fall back to photoBox() empty placeholders) and point
// REF_DIR/REF/REF_SIZE at that machine's own images instead of reusing
// wiring_diagram/exploded_view/bag_install, which depict a pulse-jet
// dust collector specifically.
const REF_DIR = __dirname + "/ref_images/";
const REF = {
  wiring_diagram: REF_DIR + "wiring_diagram.jpg",
  exploded_view: REF_DIR + "exploded_view.jpg",
  bag_install: REF_DIR + "bag_install.jpg",
};
const REF_SIZE = {
  wiring_diagram: [1500, 971],
  exploded_view: [1471, 1500],
  bag_install: [1500, 699],
};
function fitRefBox(key, maxW, maxH) {
  const [w, h] = REF_SIZE[key];
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
function refImg(key, maxW, maxH) {
  const size = fitRefBox(key, maxW, maxH);
  return new ImageRun({
    type: "jpg",
    data: fs.readFileSync(REF[key]),
    transformation: size,
    outline: { type: "solidFill", solidFillType: "rgb", value: "000000", width: 9525 },
  });
}

function img(key, maxW, maxH) {
  const size = fitBox(key, maxW, maxH);
  return new ImageRun({
    type: "jpg",
    data: fs.readFileSync(IMG[key]),
    transformation: size,
  });
}

function H1(text, num) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
    children: [new TextRun({ text: (num ? num + ".  " : "") + text, bold: true, color: NAVY, size: 30 })],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: BLUE, size: 24 })],
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 90 },
    children: [new TextRun({ text, bold: true, color: GREY, size: 22 })],
  });
}
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 300 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 21, ...opts.run })],
  });
}
function bulletsConfig() {
  return {
    config: [
      {
        reference: "bullet-list",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 400, hanging: 260 } } } },
        ],
      },
      {
        reference: "check-list",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "✓", alignment: AlignmentType.LEFT,
            style: { run: { color: TEAL, bold: true }, paragraph: { indent: { left: 400, hanging: 260 } } } },
        ],
      },
    ],
  };
}
function bullet(text, ref = "bullet-list") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 90 },
    children: [new TextRun({ text, size: 21 })],
  });
}

function cell(text, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [new TextRun({ text: String(text), bold: !!opts.bold, color: opts.color || "000000", size: opts.size || 20 })];
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    columnSpan: opts.span,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: runs })],
  });
}

function placeholder(text) {
  return new TextRun({ text: "[" + text + "]", italics: true, color: ORANGE, size: 20 });
}

function noteBox(label, text, color) {
  return new Table({
    width: { size: 9350, type: WidthType.DXA },
    columnWidths: [9350],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: color }, bottom: { style: BorderStyle.SINGLE, size: 4, color: color },
      left: { style: BorderStyle.SINGLE, size: 4, color: color }, right: { style: BorderStyle.SINGLE, size: 4, color: color },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9350, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: LIGHT },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: label, bold: true, color, size: 21 })] }),
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text, size: 20 })] }),
            ],
          }),
        ],
      }),
    ],
  });
}

function footerContact() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
        tabStops: [{ type: "right", position: convertInchesToTwip(6.3) }],
        children: [
          new TextRun({ text: "[Nama Perusahaan Anda]  ·  [Alamat]  ·  [Telepon/WA]  ·  [Email/Website]", size: 16, color: GREY }),
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, leader: PositionalTabLeader.NONE, relativeTo: "margin" }),
        ],
      }),
    ],
  });
}

function headerManual(title) {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
        tabStops: [{ type: "right", position: convertInchesToTwip(6.3) }],
        children: [
          new TextRun({ text: "[NAMA PERUSAHAAN ANDA]", size: 16, color: GREY }),
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, leader: PositionalTabLeader.NONE, relativeTo: "margin" }),
          new TextRun({ text: title, size: 16, color: GREY, italics: true }),
        ],
      }),
    ],
  });
}

function footerPageNum() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
        children: [
          new TextRun({ children: ["Halaman ", PageNumber.CURRENT, " dari ", PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
        ],
      }),
    ],
  });
}

function stepList(steps) {
  return steps.map((s, i) => new Paragraph({
    spacing: { after: 90 },
    children: [new TextRun({ text: (i + 1) + ". ", bold: true, color: TEAL, size: 21 }), new TextRun({ text: s, size: 21 })],
  }));
}

module.exports = {
  fs, Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, Header, Footer, PageNumber, NumberFormat,
  Packer, PageBreak, LevelFormat, convertInchesToTwip, TableOfContents, VerticalAlign,
  PositionalTab, PositionalTabAlignment, PositionalTabLeader,
  NAVY, BLUE, TEAL, LIGHT, GREY, ORANGE, RED,
  IMG, IMG_SIZE, fitBox, img, H1, H2, H3, P, bulletsConfig, bullet, cell, placeholder, noteBox, footerContact,
  headerManual, footerPageNum, stepList,
  PageOrientation, SectionType, ColumnBreak, ICON, ICON_SIZE, fitIconBox, icon,
  dxaToPx, iconForCell, HeightRule, REF, REF_SIZE, fitRefBox, refImg, TableLayoutType, WpsShapeRun,
};
