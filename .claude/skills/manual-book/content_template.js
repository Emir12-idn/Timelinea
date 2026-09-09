// CONTENT TEMPLATE — copy this file to content_<lang>.js (e.g. content_id.js,
// content_en.js) and replace every value. Keep the KEYS identical across every
// language file — build_template.js reads the same keys regardless of language.
//
// Rules to keep in mind while filling this in (full detail in SKILL.md):
//  - Never guess a spec value. Use a bracketed placeholder like
//    "[fill in from actual spec]", show your calculation inline, or ask the
//    user rather than inventing a number.
//  - Keep hardware label text (buttons, screen text physically printed on a
//    real controller/nameplate) exactly as it appears on the unit, in every
//    language version — it's a literal transcription, not something to translate.
//  - `hazD`/`hazW`/`hazN` are the DANGER/WARNING/NOTE box labels+generic
//    text shown once in Chapter 1; they're reused throughout the document via
//    hazardBox("danger", T.ch1.hazD.label, "<specific text for this spot>").
//  - Optional image fields (`installImage`, `wiringImage`, `explodedImage`) —
//    leave them `undefined` (or delete the line) to get an empty photoBox()
//    placeholder automatically; only set them to an ImageRun (e.g.
//    `refImg("wiring_diagram", dxaToPx(4500), dxaToPx(2900))` from
//    common.js, after adding the image under a new ref_images/ folder next
//    to your content file) once you have a real, honestly-sourced diagram.

module.exports = {
  cover: {
    title1: "MANUAL BOOK",
    subtitle: "[Operation & Maintenance Guide, translated]",
    product1: "[PRODUCT CATEGORY, e.g. OVERHEAD CRANE]",
    product2: "[PRODUCT SUBTYPE, e.g. SINGLE GIRDER ELECTRIC HOIST CRANE]",
    capacity: "[Capacity / key rating, e.g. Capacity 5 Ton]",
    photoCaption: "[Photo caption for the cover placeholder box]",
    modelLabel: "Model: [MODEL CODE]",
    serialLabel: "Serial No.: [SERIAL NUMBER]",
    yearLabel: "Year of Manufacture: [YEAR]",
  },
  toc: { title: "[Table of Contents, translated]" },
  ch1: {
    title: "[Introduction, translated]",
    s11: "1.1 [About This Document, translated]",
    p11a: "[Official-guide boilerplate paragraph — who must read it, before operating the machine.]",
    p11b: "[Keep-this-document / transfer-with-the-unit paragraph.]",
    s12: "1.2 [Safety Symbols & Warnings, translated]",
    p12a: "[One sentence introducing the hazard symbols below.]",
    hazD: { label: "[DANGER, translated]", text: "[Generic danger-level definition text.]" },
    hazW: { label: "[WARNING, translated]", text: "[Generic warning-level definition text.]" },
    hazN: { label: "[NOTE, translated]", text: "[Generic note-level definition text.]" },
  },
  ch2: {
    title: "[Technical Specifications, translated]",
    // First row = header. Every other row = [Parameter, Value, Unit].
    // Never invent a Value — use "[fill in from actual spec]" or a
    // transparent calculation if you can derive it from given dimensions.
    specTable: [
      ["[Parameter]", "[Value]", "[Unit]"],
      ["[e.g. Model / Unit Type]", "[MODEL CODE]", "-"],
      ["[e.g. Rated Capacity]", "[value]", "[unit]"],
    ],
  },
  ch3: {
    title: "[Main Components & Functions, translated]",
    p3a: "[One sentence: the unit consists of the following main components:]",
    // These 5 icon keys are dust-collector shaped (housingFilter/hopper/
    // blowerFan/pulseJet/panelKontrol) — for a different machine, edit
    // build_template.js's Chapter 3 block to use the right number of
    // components and new icon files (see SKILL.md), then rename these keys
    // to match.
    icons: { housingFilter: "[icon 1 label]", hopper: "[icon 2 label]", blowerFan: "[icon 3 label]", pulseJet: "[icon 4 label]", panelKontrol: "[icon 5 label]" },
    subA: "A. [Component name]", textA: "[What it is / does.]",
    subB: "B. [Component name]", textB: "[What it is / does.]",
    subC: "C. [Component name]", textC: "[What it is / does.]",
    subD: "D. [Component name]", textD: "[What it is / does.]",
    subE: "E. [Component name]", textE: "[What it is / does.]",
    subF: "F. [Component name]", textF: "[What it is / does.]",
  },
  ch4: {
    title: "[Working Principle, translated]",
    p4a: "[One sentence introducing the operating cycle below.]",
    items: [
      "[Step 1 of the working cycle.]",
      "[Step 2.]",
      "[Step 3. Add/remove steps as needed — ol() takes any length array.]",
    ],
    p4b: "[Closing sentence, e.g. what happens to collected byproduct/output.]",
  },
  ch5: {
    title: "[Installation, translated]",
    s51: "5.1 [Site & Foundation Preparation, translated]",
    li51: ["[Checklist item.]", "[Checklist item.]", "[Checklist item.]"],
    s52: "5.2 [Unit Installation, translated]",
    li52: ["[Checklist item.]", "[Checklist item.]"],
    s53: "5.3 [Electrical Connection, translated]",
    hazW53: "[Warning text specific to electrical connection work.]",
    li53: ["[Checklist item.]", "[Checklist item.]"],
    s54: "5.4 [Utility Connection — compressed air / hydraulics / etc, translated]",
    li54: ["[Checklist item.]"],
    s55: "5.5 [Pre-First-Startup Checks, translated]",
    ck55: ["[Checkbox item.]", "[Checkbox item.]", "[Checkbox item.]"],
  },
  ch6: {
    title: "[Control Panel / Remote / Pendant Guide, translated]",
    p6a: "[One sentence: where the main control is and what it does.]",
    photoCaption61: "[Figure 6.1 caption — control exterior]",
    // First row = header ["Button / Indicator", "Function"].
    panelBtnTable: [
      ["[Button / Indicator]", "[Function]"],
      ["[Button name (hardware label if any)]", "[What it does.]"],
    ],
    p6b: "[One sentence introducing the internal components table.]",
    photoCaption62: "[Figure 6.2 caption — internal components]",
    panelCompTable: [
      ["[Component]", "[Function]"],
      ["[e.g. QF1 - Main Breaker]", "[What it does.]"],
    ],
    hazN6: "[Note pointing to the wiring diagram appendix, e.g. 'See Appendix A.']",
    // Rename this whole block's meaning to whatever the real controller is
    // (a timer board, a hoist's own control unit, a radio remote, etc.) —
    // it doesn't have to be a BMK-10-style pulse-jet timer.
    subController: "[How to Set <Controller Name> Parameters, translated]",
    p6c: "[One sentence: per <controller>'s spec, there are N settable parameters.]",
    paramTable: [
      ["[Code]", "[Parameter]", "[Value Range]", "[Current Setting]"],
      ["[code]", "[what it controls]", "[min - max]", "[value, only if confirmed]"],
    ],
    p6d: "[One sentence introducing the button table below.]",
    buttonTable: [
      ["[Button]", "[Function]"],
      ["[button, hardware label if any]", "[what it does]"],
    ],
    p6e: "[Any precondition before setting parameters, e.g. mode switch position.]",
    ol6: ["[Step 1 to change a parameter.]", "[Step 2.]", "[Step 3.]"],
    p6f: "[How the same steps generalize to other parameters.]",
    p6g: "[Any rule-of-thumb starting values / guidance, clearly marked as guidance to re-tune on site.]",
  },
  ch7: {
    title: "[Operating Guide, translated]",
    s71: "7.1 [Start-up Procedure, translated]",
    ol71: ["[Step 1.]", "[Step 2.]", "[Step 3.]"],
    p7a: "[General multi-equipment start sequence note, if relevant.]",
    s72: "7.2 [Normal Operation, translated]",
    li72: ["[Monitoring item.]", "[Monitoring item.]"],
    s73: "7.3 [Shutdown Procedure, translated]",
    ol73: ["[Step 1.]", "[Step 2.]"],
    s74: "7.4 [Emergency Condition / Emergency Stop, translated]",
    hazD74: "[Danger text: what to do in a genuine emergency.]",
  },
  ch8: {
    title: "[Maintenance, translated]",
    s81: "8.1 [Maintenance Schedule, translated]",
    // First row = header: [Item, Daily, Weekly, Monthly, 3-6 Months] (or
    // whatever cadence columns fit this machine).
    maintTable: [
      ["[Inspection Item]", "[Daily]", "[Weekly]", "[Monthly]", "[3-6 Months]"],
      ["[item]", "✓", "", "", ""],
    ],
    s82: "8.2 [Consumable/Wear-Part Maintenance, translated]",
    li82: ["[Maintenance item.]", "[PPE reminder if relevant.]"],
    pInstall: "[Intro sentence for an install/replace procedure, if applicable.]",
    // installImage: refImg("some_key", dxaToPx(4300), dxaToPx(2100)), // optional — omit for an empty placeholder box instead
    ol82: ["[Step 1.]", "[Step 2.]"],
    s83: "8.3 [Another Subsystem's Maintenance, translated]",
    li83: ["[item]"],
    s84: "8.4 [Motor/Drive Maintenance, translated]",
    li84: ["[item]"],
    s85: "8.5 [Electrical Panel Maintenance, translated]",
    li85: ["[item]"],
  },
  ch9: {
    title: "[Troubleshooting, translated]",
    trbTable: [
      ["[Symptom]", "[Possible Cause]", "[Corrective Action]"],
      ["[symptom]", "[cause]", "[action]"],
    ],
  },
  ch10: {
    title: "[Occupational Safety, translated]",
    hazD10: "[Danger text: lockout-tagout before internal maintenance, etc.]",
    li10: ["[Safety rule.]", "[Safety rule.]", "[Safety rule.]"],
  },
  ch11: {
    title: "[Appendix, translated]",
    subA: "[Appendix A - Electrical/Hydraulic Diagram, translated]",
    pA: "[Caption/disclaimer: generic reference, not necessarily this exact unit's diagram, unless confirmed.]",
    // wiringImage: refImg("wiring_diagram", dxaToPx(4500), dxaToPx(2900)), // optional — omit for an empty placeholder box instead
    subB: "[Appendix B - Maintenance History Sheet, translated]",
    maintHistHeader: ["[Date]", "[Maintenance Activity]", "[Technician]", "[Notes]"],
    subC: "[Appendix C - Exploded View / Structural Diagram, translated]",
    pC: "[Intro sentence + instruction to match the legend below to the drawing.]",
    legendTable: [
      ["[Label]", "[Description]"],
      ["[LABEL]", "[what that part of the drawing is]"],
    ],
    // explodedImage: refImg("exploded_view", dxaToPx(4500), dxaToPx(3000)), // optional — omit for an empty placeholder box instead
  },
};
