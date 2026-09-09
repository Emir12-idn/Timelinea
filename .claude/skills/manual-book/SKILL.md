---
name: manual-book
description: Generates a print-ready, A5 saddle-stitch booklet Operation & Maintenance manual (.docx) for industrial/fabricated equipment (dust collectors, cranes, tanks, conveyors, etc.), in one or several languages, following the exact layout and content conventions this user's freelance documentation work has converged on. Use whenever the user asks to create, update, or extend a "manual book" / O&M manual / instruction manual as a Word document for a machine they fabricate, retrofit, or service — especially when they want it to print and bind the same way as previous manuals.
metadata:
  origin: user
---

# Manual Book Generator

Reusable engine + hard-won conventions for building an Operation & Maintenance
manual as a print-ready A5 booklet .docx, using `docx` (docx-js) via Node.js.
This was built for a dust-collector unit (DCT10000) but the engine and rules
are machine-agnostic — swap the content, keep the format.

## Files in this skill

- `common.js` — shared helpers: color constants, image/icon sizing math
  (`dxaToPx`, `fitIconBox`, `iconForCell`), the DXA↔pixel conversion that
  fixes the "giant icon" bug (see Rules below).
- `build_template.js` — the document engine. Contains ALL structural code
  (page setup, chapter/table/hazard-box builders) and is driven entirely by
  a `T` content object — do not hardcode machine-specific text in here.
- `content_template.js` — the content schema, in English, with every field
  explained inline as a comment. Copy this file, translate the comments away,
  and fill in real values for the new machine and language.
- `icons/` — B&W pictograms.
  - `sym_danger.png`, `sym_warning.png`, `sym_note.png`, `sym_electric.png`
    — standard hazard pictograms (ISO-style triangle/circle). These are
    generic — reuse for ANY machine, any language, unchanged.
  - `simple_fan.png`, `simple_filter.png`, `simple_hopper.png`,
    `simple_panel.png`, `simple_valve.png` — dust-collector component icons.
    **These are NOT generic.** A new machine (crane, tank, conveyor) needs
    its own simple B&W vector-style icons for Chapter 3's component row —
    draw new ones with PIL/Pillow the same way (simple geometric shapes,
    never a stock photo), don't reuse these.
- `examples/` — a finished reference (`content_id.js` from the dust
  collector job) showing what a fully filled-in content file looks like.

## Non-negotiable format rules

These came from real mistakes across many iterations. Do not relitigate them
unless the user explicitly asks for something different.

1. **A5 native pages, not a 2-column landscape emulation.** Page size is
   literally A5 portrait (`8391 x 11906` twips) with a `gutter` margin, one
   logical page per Word page (`PageBreak`, not `ColumnBreak`). This lets
   Word's own **Page Setup → Margins → Multiple pages → Book fold** feature
   do the saddle-stitch imposition (which page goes where on which A4 sheet)
   automatically at print time. Do NOT hand-compute page order — it's
   fragile and breaks every time content length changes.
2. **Every `Table` needs `layout: TableLayoutType.FIXED`.** Without it, Word
   defaults to autofit-to-content and ignores your `columnWidths`, so a
   table with one long cell silently overflows off the page edge. This bit
   us in production — always set it.
3. **Table widths must be visually consistent across the whole document.**
   Compute the usable width once (`pageWidth - leftMargin - rightMargin -
   gutter`) and target the same total (e.g. `6800` twips out of `6811`
   usable on this A5 setup) for every data table, scaling each table's own
   column proportions to hit that total. Image containers (`photoBox`,
   `boxedImage`) are exempt — they size to the image, not the text grid.
4. **Black and white only.** No colored fills except a light gray table
   header (`D9D9D9`, prints fine in grayscale). No colored warning boxes.
5. **Hazard pictograms, not colored text boxes.** Danger/Warning/Note use
   the standard triangle/circle icons via `hazardBox()`, never colored
   background text.
6. **Never invent a "photo."** For real components: either (a) a genuinely
   generic B&W vector/schematic icon, (b) an honestly-sourced reference
   diagram (e.g. extracted from a real reference manual, with a caption
   saying it's a general reference), or (c) an empty bordered placeholder
   box (`photoBox()`) the user fills in later with their own real photo.
   Never fabricate a photo, and never use a different brand's/different
   product's branded photo to represent this unit.
7. **Never write Word-UI-mechanics instructions into the document body.**
   No "klik kanan lalu pilih...", "Update Field", "Change Picture", etc.
   inside any paragraph, table cell, or caption. Those tips belong in chat
   only. This rule was violated once and the user was explicit that it must
   never happen again.
8. **Never guess a technical spec.** If a value isn't confirmed (nameplate,
   real measurement, or a transparent calculation from given dimensions),
   either leave a bracketed placeholder like `[isi sesuai spek aktual]`, show
   the calculation inline (e.g. `"≈ 39.6 (calculated: π×0.128×1.54×64)"`),
   or omit the row entirely rather than invent a number. Ask the user before
   filling anything uncertain.
9. **Blank header on every page**, reserved for the eventual customer's own
   company name/logo (this document is typically white-labeled for a
   freelance client) — a single thin bottom border, no text, no placeholder
   like `[Company Name]` anywhere in the body.
10. **Multi-language = separate .docx files, same shared engine.** Each
    language gets its own `content_<lang>.js` with identical keys, built by
    the same `build_template.js` with a per-language font config (set
    `eastAsia`/`cs` font explicitly for CJK — e.g. `Microsoft YaHei` for
    Chinese, `Yu Gothic` for Japanese — because the default Latin font won't
    render CJK glyphs). Hardware label text physically printed on the real
    component (e.g. Chinese button labels on a Chinese-made controller)
    stays as-is in every language version — it's a literal transcription of
    what's on the unit, not something to translate.

## Chapter structure (reuse as-is unless the machine is structurally very different)

Cover → Table of Contents → 1. Introduction → 2. Technical Specifications →
3. Main Components & Functions → 4. Working Principle → 5. Installation →
6. Control Panel/Console Guide → 7. Operating Guide → 8. Maintenance →
9. Troubleshooting → 10. Occupational Safety → 11. Appendix (wiring diagram,
maintenance log sheet, exploded view).

This generalizes well for most fabricated equipment. **Chapters 3 and 6 are
the ones most likely to need real restructuring** for a mechanically very
different machine (e.g. an overhead crane: Chapter 3's components become
girder/runway, trolley, hoist unit, wire rope or chain, end truck instead of
housing/hopper/fan/pulse-jet/panel; Chapter 6 covers whatever
hoist-brand + remote-type combination is actually installed, since that
varies unit to unit). Everything else — installation checklist shape,
maintenance schedule table, troubleshooting table, safety chapter, appendix
structure — carries over almost unchanged.

## Workflow for a new machine

1. Copy `content_template.js` to `content_<lang>.js` (usually start with the
   customer's/user's own language).
2. Interview the user for real data the same way this job went: ask for
   nameplate photos, datasheets, controller labels — never guess. Flag
   anything unconfirmed explicitly in chat before writing it into the doc.
3. Fill in the content object. Reuse `hazardBox`/`dataTable`/`ol`/`li`
   patterns from `build_template.js` — don't invent new helper functions
   unless the layout genuinely needs one.
4. If new component icons are needed (Rule 6/`icons/` note above), draw
   simple B&W vector shapes with PIL, matching the existing `simple_*.png`
   style (flat, geometric, no gradients/photorealism).
5. Run `node build_template.js` and verify structurally — **LibreOffice is
   commonly unavailable in these sandboxes**, so don't rely on rendering a
   PDF preview. Instead:
   - `unzip -t out.docx` for zip integrity.
   - `python3` + `zipfile` to read `word/document.xml` and grep for
     `<w:tblLayout w:type="fixed"/>` count == `<w:tbl>` count (rule 2),
     `<w:tblW ... w:w="...">` values for width consistency (rule 3),
     `<w:pgSz .../>` for the A5 dimensions, `<wp:extent cx= cy=>` on any
     embedded image and convert EMU→inches (`/914400`) to catch
     oversized/upscaled images before sending the file.
6. Repeat per additional language, translating the content object only —
   never touch `build_template.js` for a language change.
7. Deliver each language as its own separate `.docx` file (Word cannot
   reliably auto-translate a technical document — don't rely on Word's
   built-in Translate feature for this).
