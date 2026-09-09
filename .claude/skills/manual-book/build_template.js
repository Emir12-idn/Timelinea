// Manual-book engine. See SKILL.md for the rules this encodes.
//
// Usage: copy this whole skill folder into a working directory for the new
// job, fill in content_<lang>.js file(s) (start from content_template.js),
// then run `node build_template.js` here. It auto-discovers every
// content_*.js sitting next to it and builds one .docx per language.
//
// DO NOT put machine-specific text in this file — it only knows the layout.

const fs = require("fs");
const path = require("path");
const C = require("./common.js");
const {
  Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, Packer, SectionType, PageBreak, TableLayoutType,
  VerticalAlign, TableOfContents, HeadingLevel, iconForCell, refImg, dxaToPx,
  Header, WpsShapeRun,
} = C;

// Edit this once per job (e.g. "Manual_Book_OverheadCrane_5T").
const OUTPUT_PREFIX = "Manual_Book";

// Border for both the empty placeholder Shapes and real reference images.
const SHAPE_OUTLINE = { type: "solidFill", solidFillType: "rgb", value: "000000", width: 9525 };

const B = "000000";

function borderless() {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: n, bottom: n, left: n, right: n, insideHorizontal: n, insideVertical: n };
}
function grid() {
  const s = { style: BorderStyle.SINGLE, size: 3, color: B };
  return { top: s, bottom: s, left: s, right: s, insideHorizontal: s, insideVertical: s };
}
function chapter(num, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 40, after: 100 },
    children: [new TextRun({ text: `${num}. ${text}`, bold: true, size: 24, color: B })],
  });
}
function sub(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 140, after: 60 },
    children: [new TextRun({ text, bold: true, size: 19, color: B })],
  });
}
function p(text) {
  return new Paragraph({ spacing: { after: 100, line: 260 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text, size: 17, color: B })] });
}
function li(text) {
  return new Paragraph({ spacing: { after: 45, line: 250 }, indent: { left: 180, hanging: 150 }, children: [new TextRun({ text: "- ", size: 17, color: B }), new TextRun({ text, size: 17, color: B })] });
}
function ck(text) {
  return new Paragraph({ spacing: { after: 45, line: 250 }, indent: { left: 190, hanging: 160 }, children: [new TextRun({ text: "✓ ", bold: true, size: 17, color: B }), new TextRun({ text, size: 17, color: B })] });
}
function ol(items) {
  return items.map((s, i) => new Paragraph({
    spacing: { after: 45, line: 250 }, indent: { left: 210, hanging: 210 },
    children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 17, color: B }), new TextRun({ text: s, size: 17, color: B })],
  }));
}
function tcell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 45, bottom: 45, left: 80, right: 80 },
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(text), bold: !!opts.bold, size: opts.size || 15, color: B })] })],
  });
}
// Rule 3: every table you add should target USABLE_WIDTH (see below), not
// an arbitrary number, so the whole document reads as one consistent grid.
function dataTable(widths, rows, headerFill = "D9D9D9") {
  const total = widths.reduce((a, b2) => a + b2, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED, // Rule 2 — never omit this
    borders: grid(),
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((v, i) => tcell(v, { width: widths[i], bold: ri === 0, fill: ri === 0 ? headerFill : undefined, center: ri === 0 })),
    })),
  });
}
function hazardBox(iconKey, label, text) {
  const iconColWidth = 620;
  const textColWidth = 6180; // (iconColWidth + textColWidth) should equal USABLE_WIDTH
  return new Table({
    width: { size: iconColWidth + textColWidth, type: WidthType.DXA },
    columnWidths: [iconColWidth, textColWidth],
    layout: TableLayoutType.FIXED,
    borders: borderless(),
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: iconColWidth, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 60 }, children: [new Paragraph({ children: [iconForCell(iconKey, iconColWidth, 44, 0.78)] })] }),
        new TableCell({
          width: { size: textColWidth, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 20, bottom: 20, left: 0, right: 0 },
          children: [
            new Paragraph({ spacing: { after: 10 }, children: [new TextRun({ text: label, bold: true, size: 16, color: B })] }),
            new Paragraph({ children: [new TextRun({ text, size: 15, color: B })] }),
          ],
        }),
      ],
    })],
  });
}
function iconLabelCell(iconKey, label, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 50, bottom: 25, left: 25, right: 25 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 18 }, children: [iconForCell(iconKey, width, 44, 0.55)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, size: 13, color: B })] }),
    ],
  });
}
function colBreak() {
  return new Paragraph({ children: [new PageBreak()] }); // Rule 1 — PageBreak, never ColumnBreak
}

// Rule 1: native A5 portrait pages (148 x 210mm), Word's own "Book fold"
// print feature does the saddle-stitch imposition at print time.
const A5_WIDTH = 8391;
const A5_HEIGHT = 11906;
const BOOK_MARGIN = { top: 560, bottom: 560, left: 620, right: 620, gutter: 340 };
// Usable content width after margins + gutter — target this total (or a
// clean round number just under it) for every data table (Rule 3).
const USABLE_WIDTH = A5_WIDTH - BOOK_MARGIN.left - BOOK_MARGIN.right - BOOK_MARGIN.gutter; // 6811
const TABLE_WIDTH = 6800;

function emptyHeader() {
  // Rule 9: blank, no placeholder text — reserved for the eventual owner's
  // own company name/logo.
  return new Header({
    children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: B, space: 4 } },
      children: [new TextRun({ text: "", size: 16 })],
    })],
  });
}
// Rule 6: a real image already carries its own border (see common.js
// refImg's `outline` option) - this just centers it, no table frame.
function boxedImage(imageRun) {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [imageRun] });
}
// Rule 6(c): empty placeholder for a photo the user adds later in Word - a
// real DrawingML rectangle Shape (WpsShapeRun), NOT a table. The user
// selects it and uses Word's Shape Format > Shape Fill > Picture to drop a
// real photo in later; the border stays as the shape's own outline.
function photoBox(caption, widthDxa, heightTwips) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new WpsShapeRun({
      type: "wps",
      transformation: { width: dxaToPx(widthDxa), height: dxaToPx(heightTwips) },
      outline: SHAPE_OUTLINE,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `[ ${caption} ]`, italics: true, size: 14, color: "808080" })],
      })],
    })],
  });
}

// Rule 10: per-language font. Add an entry here for any language whose
// script needs an explicit eastAsia/cs font to render (CJK, Thai, etc.).
const FONT_DEFAULT = { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft YaHei", cs: "Calibri" };
const FONTS = {
  zh: { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft YaHei", cs: "Microsoft YaHei" },
  ja: { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Yu Gothic", cs: "Calibri" },
};
function fontFor(langCode) {
  return FONTS[langCode] || FONT_DEFAULT;
}

function buildManual(langCode, T, outFile) {
  const doc = new Document({
    features: { updateFields: true },
    styles: { default: { document: { run: { font: fontFor(langCode), size: 17, color: B } } } },
    sections: [
      // PAGE 1: COVER
      {
        properties: { type: SectionType.NEXT_PAGE, page: { size: { width: A5_WIDTH, height: A5_HEIGHT }, margin: BOOK_MARGIN } },
        headers: { default: emptyHeader() },
        children: [
          new Paragraph({ spacing: { before: 260 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: T.cover.title1, bold: true, size: 26, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: T.cover.subtitle, italics: true, size: 16, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: T.cover.product1, bold: true, size: 34, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: T.cover.product2, bold: true, size: 19, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, border: { top: { style: BorderStyle.SINGLE, size: 10, color: B, space: 6 }, bottom: { style: BorderStyle.SINGLE, size: 10, color: B, space: 6 } }, children: [new TextRun({ text: T.cover.capacity, bold: true, size: 24, color: B })] }),
          photoBox(T.cover.photoCaption, 4600, 2600),
          new Paragraph({ spacing: { after: 40 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 15 }, children: [new TextRun({ text: T.cover.modelLabel, size: 16, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 15 }, children: [new TextRun({ text: T.cover.serialLabel, size: 16, color: B })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: T.cover.yearLabel, size: 16, color: B })] }),
        ],
      },
      // PAGE 2: TABLE OF CONTENTS
      {
        properties: { type: SectionType.NEXT_PAGE, page: { size: { width: A5_WIDTH, height: A5_HEIGHT }, margin: BOOK_MARGIN } },
        headers: { default: emptyHeader() },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: [new TextRun({ text: T.toc.title, bold: true, size: 26, color: B })] }),
          new TableOfContents(T.toc.title, { hyperlink: true, headingStyleRange: "1-2" }),
        ],
      },
      // BODY
      {
        properties: { type: SectionType.NEXT_PAGE, page: { size: { width: A5_WIDTH, height: A5_HEIGHT }, margin: BOOK_MARGIN } },
        headers: { default: emptyHeader() },
        children: [
          chapter(1, T.ch1.title),
          sub(T.ch1.s11), p(T.ch1.p11a), p(T.ch1.p11b),
          sub(T.ch1.s12), p(T.ch1.p12a),
          hazardBox("danger", T.ch1.hazD.label, T.ch1.hazD.text),
          new Paragraph({ spacing: { after: 90 } }),
          hazardBox("warning", T.ch1.hazW.label, T.ch1.hazW.text),
          new Paragraph({ spacing: { after: 90 } }),
          hazardBox("note", T.ch1.hazN.label, T.ch1.hazN.text),

          colBreak(),
          chapter(2, T.ch2.title),
          dataTable([TABLE_WIDTH * 0.404, TABLE_WIDTH * 0.324, TABLE_WIDTH * 0.272].map(Math.round), T.ch2.specTable),

          colBreak(),
          chapter(3, T.ch3.title),
          p(T.ch3.p3a),
          // NOTE: this 5-icon component row is dust-collector shaped
          // (housing/hopper/fan/pulse-jet/panel). For a structurally
          // different machine, change the icon keys/labels/count here —
          // see SKILL.md "Chapter structure" note.
          new Table({
            width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: [1, 1, 1, 1, 1].map(() => Math.round(TABLE_WIDTH / 5)), layout: TableLayoutType.FIXED, borders: borderless(),
            rows: [new TableRow({ children: [
              iconLabelCell("simple_filter", T.ch3.icons.housingFilter, Math.round(TABLE_WIDTH / 5)), iconLabelCell("simple_hopper", T.ch3.icons.hopper, Math.round(TABLE_WIDTH / 5)), iconLabelCell("simple_fan", T.ch3.icons.blowerFan, Math.round(TABLE_WIDTH / 5)), iconLabelCell("simple_valve", T.ch3.icons.pulseJet, Math.round(TABLE_WIDTH / 5)), iconLabelCell("simple_panel", T.ch3.icons.panelKontrol, Math.round(TABLE_WIDTH / 5)),
            ] })],
          }),
          new Paragraph({ spacing: { before: 100 } }),
          sub(T.ch3.subA), p(T.ch3.textA),
          sub(T.ch3.subB), p(T.ch3.textB),
          sub(T.ch3.subC), p(T.ch3.textC),
          sub(T.ch3.subD), p(T.ch3.textD),
          sub(T.ch3.subE), p(T.ch3.textE),
          sub(T.ch3.subF), p(T.ch3.textF),

          colBreak(),
          chapter(4, T.ch4.title),
          p(T.ch4.p4a),
          ...ol(T.ch4.items),
          p(T.ch4.p4b),

          colBreak(),
          chapter(5, T.ch5.title),
          sub(T.ch5.s51), ...T.ch5.li51.map(li),
          sub(T.ch5.s52), ...T.ch5.li52.map(li),
          sub(T.ch5.s53),
          hazardBox("warning", T.ch1.hazW.label, T.ch5.hazW53),
          new Paragraph({ spacing: { before: 100 } }),
          ...T.ch5.li53.map(li),
          sub(T.ch5.s54), ...T.ch5.li54.map(li),
          sub(T.ch5.s55), ...T.ch5.ck55.map(ck),

          colBreak(),
          chapter(6, T.ch6.title),
          p(T.ch6.p6a),
          photoBox(T.ch6.photoCaption61, 4650, 1600),
          new Paragraph({ spacing: { after: 40 } }),
          dataTable([TABLE_WIDTH * 0.409, TABLE_WIDTH * 0.591].map(Math.round), T.ch6.panelBtnTable),
          new Paragraph({ spacing: { before: 120 } }),
          p(T.ch6.p6b),
          photoBox(T.ch6.photoCaption62, 4650, 1600),
          new Paragraph({ spacing: { after: 40 } }),
          dataTable([TABLE_WIDTH * 0.409, TABLE_WIDTH * 0.591].map(Math.round), T.ch6.panelCompTable),
          hazardBox("note", T.ch1.hazN.label, T.ch6.hazN6),
          new Paragraph({ spacing: { after: 90 } }),
          new Paragraph({ spacing: { before: 140 } }),
          sub(T.ch6.subController),
          p(T.ch6.p6c),
          dataTable([TABLE_WIDTH * 0.14, TABLE_WIDTH * 0.333, TABLE_WIDTH * 0.333, TABLE_WIDTH * 0.194].map(Math.round), T.ch6.paramTable),
          p(T.ch6.p6d),
          dataTable([TABLE_WIDTH * 0.226, TABLE_WIDTH * 0.774].map(Math.round), T.ch6.buttonTable),
          new Paragraph({ spacing: { before: 100 } }),
          p(T.ch6.p6e),
          ...ol(T.ch6.ol6),
          p(T.ch6.p6f),
          p(T.ch6.p6g),

          colBreak(),
          chapter(7, T.ch7.title),
          sub(T.ch7.s71),
          ...ol(T.ch7.ol71),
          p(T.ch7.p7a),
          sub(T.ch7.s72), ...T.ch7.li72.map(li),
          sub(T.ch7.s73),
          ...ol(T.ch7.ol73),
          sub(T.ch7.s74),
          hazardBox("danger", T.ch1.hazD.label, T.ch7.hazD74),

          colBreak(),
          chapter(8, T.ch8.title),
          sub(T.ch8.s81),
          dataTable([TABLE_WIDTH * 0.376, TABLE_WIDTH * 0.151, TABLE_WIDTH * 0.172, TABLE_WIDTH * 0.151, TABLE_WIDTH * 0.150].map(Math.round), T.ch8.maintTable),
          sub(T.ch8.s82), ...T.ch8.li82.map(li),
          p(T.ch8.pInstall),
          // NOTE: reference install-sequence image — dust-collector job used
          // refImg("bag_install", ...) from a real reference manual. For a
          // new machine either source a new honest reference image the same
          // way, or use photoBox() as an empty placeholder instead.
          ...(T.ch8.installImage ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [T.ch8.installImage] })] : []),
          ...ol(T.ch8.ol82),
          sub(T.ch8.s83), ...T.ch8.li83.map(li),
          sub(T.ch8.s84), ...T.ch8.li84.map(li),
          sub(T.ch8.s85), ...T.ch8.li85.map(li),

          colBreak(),
          chapter(9, T.ch9.title),
          dataTable([TABLE_WIDTH * 0.282, TABLE_WIDTH * 0.359, TABLE_WIDTH * 0.359].map(Math.round), T.ch9.trbTable),

          colBreak(),
          chapter(10, T.ch10.title),
          hazardBox("danger", T.ch1.hazD.label, T.ch10.hazD10),
          new Paragraph({ spacing: { before: 110 } }),
          ...T.ch10.li10.map(li),

          colBreak(),
          chapter(11, T.ch11.title),
          sub(T.ch11.subA), p(T.ch11.pA),
          ...(T.ch11.wiringImage ? [boxedImage(T.ch11.wiringImage)] : [photoBox(T.ch11.pA, 4650, 2900)]),

          colBreak(),
          sub(T.ch11.subB),
          dataTable([TABLE_WIDTH * 0.214, TABLE_WIDTH * 0.357, TABLE_WIDTH * 0.184, TABLE_WIDTH * 0.245].map(Math.round), [T.ch11.maintHistHeader, ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]]),
          new Paragraph({ spacing: { before: 200 } }),
          sub(T.ch11.subC), p(T.ch11.pC),
          dataTable([TABLE_WIDTH * 0.323, TABLE_WIDTH * 0.677].map(Math.round), T.ch11.legendTable),
          new Paragraph({ spacing: { before: 100 } }),
          ...(T.ch11.explodedImage ? [boxedImage(T.ch11.explodedImage)] : [photoBox(T.ch11.pC, 4650, 3000)]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(outFile, buf);
    console.log(outFile + " saved");
  });
}

// Auto-discover content_<lang>.js files sitting next to this script.
const files = fs.readdirSync(__dirname).filter((f) => /^content_[a-zA-Z0-9-]+\.js$/.test(f) && f !== "content_template.js");
if (files.length === 0) {
  console.log("No content_<lang>.js files found next to build_template.js. Copy content_template.js to content_<lang>.js and fill it in first.");
  process.exit(1);
}
Promise.all(files.map((f) => {
  const langCode = f.replace(/^content_/, "").replace(/\.js$/, "");
  const T = require(path.join(__dirname, f));
  return buildManual(langCode, T, `${OUTPUT_PREFIX}_${langCode.toUpperCase()}.docx`);
})).then(() => console.log("done"));
