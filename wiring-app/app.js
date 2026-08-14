/* ============================================================
   WireSim Web — original HTML/CSS/JS clone of an industrial
   automation wiring/circuit simulator UI. Not affiliated with
   or copying assets from any third-party product.
   ============================================================ */

(() => {
"use strict";

/* ---------------- Component library ---------------- */

const svg = (w,h,inner) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const COMP_DEFS = {

  /* ---- Fontes (power sources) ---- */
  power: {
    label: "Fonte 24V DC", w: 110, h: 100, isSource: true,
    terminals: [
      { id:"V1", x:14, y:100, pole:"pos" }, { id:"V2", x:34, y:100, pole:"pos" },
      { id:"N1", x:62, y:100, pole:"neg" }, { id:"N2", x:82, y:100, pole:"neg" },
      { id:"OK", x:100,y:100, pole:"signal" }
    ],
    icon: (c) => svg(110,100,`
      <rect x="2" y="2" width="106" height="96" rx="8" fill="#1b2530" stroke="#0d84ff" stroke-width="2"/>
      <circle cx="16" cy="16" r="4" fill="#ffce54"/>
      <text x="55" y="40" text-anchor="middle" fill="#58b8ff" font-size="18" font-weight="800">24V</text>
      <text x="55" y="58" text-anchor="middle" fill="#8fa6b8" font-size="10">DC 2.5A</text>
      <text x="14" y="94" fill="#5fd88a" font-size="8">+V</text><text x="34" y="94" fill="#5fd88a" font-size="8">+V</text>
      <text x="58" y="94" fill="#ff8a8a" font-size="8">-V</text><text x="78" y="94" fill="#ff8a8a" font-size="8">-V</text>
    `)
  },
  acSource: {
    label: "Fonte AC 220V", w: 100, h: 90, isSource: true,
    terminals: [ { id:"L", x:20, y:90, pole:"pos" }, { id:"N", x:70, y:90, pole:"neg" } ],
    icon: (c) => svg(100,90,`
      <rect x="2" y="2" width="96" height="78" rx="8" fill="#1b2530" stroke="#f4b400" stroke-width="2"/>
      <path d="M12 45 q8 -18 16 0 t16 0 t16 0 t16 0" stroke="#f4b400" stroke-width="2.5" fill="none"/>
      <text x="50" y="30" text-anchor="middle" fill="#ffd873" font-size="15" font-weight="800">220V</text>
      <text x="20" y="72" fill="#5fd88a" font-size="8">L</text><text x="70" y="72" fill="#ff8a8a" font-size="8">N</text>
    `)
  },
  threePhaseSource: {
    label: "Fonte Trifásica 380V", w: 120, h: 90, isSource: true,
    terminals: [
      { id:"L1", x:15, y:90, pole:"pos" }, { id:"L2", x:40, y:90, pole:"pos" },
      { id:"L3", x:65, y:90, pole:"pos" }, { id:"N", x:100, y:90, pole:"neg" }
    ],
    icon: (c) => svg(120,90,`
      <rect x="2" y="2" width="116" height="78" rx="8" fill="#1b2530" stroke="#f4b400" stroke-width="2"/>
      <text x="60" y="32" text-anchor="middle" fill="#ffd873" font-size="14" font-weight="800">380V</text>
      <text x="60" y="50" text-anchor="middle" fill="#8fa6b8" font-size="9">3~ 50/60Hz</text>
      <text x="12" y="72" fill="#5fd88a" font-size="7">L1</text><text x="37" y="72" fill="#5fd88a" font-size="7">L2</text>
      <text x="62" y="72" fill="#5fd88a" font-size="7">L3</text><text x="94" y="72" fill="#ff8a8a" font-size="7">N</text>
    `)
  },
  switchingSupply: {
    label: "Fonte Chaveada", w: 130, h: 110, converter: { inHot:"L", inReturn:"N" },
    terminals: [
      { id:"L", x:15, y:0 }, { id:"N", x:35, y:0 },
      { id:"+V", x:80, y:110, pole:"pos" }, { id:"-V", x:105, y:110, pole:"neg" }
    ],
    icon: (c) => { const on = c.state.on; return svg(130,110,`
      <rect x="2" y="2" width="126" height="106" rx="8" fill="#2a323d" stroke="#555" stroke-width="1.5"/>
      <text x="65" y="20" text-anchor="middle" fill="#9aa6b2" font-size="8">IN 100-240VAC</text>
      <circle cx="118" cy="14" r="5" fill="${on?'#2fbf6a':'#4a5568'}"/>
      <line x1="8" y1="30" x2="122" y2="30" stroke="#444" stroke-width="1"/>
      <text x="65" y="62" text-anchor="middle" fill="${on?'#58e08a':'#5b6675'}" font-size="18" font-weight="800">24V</text>
      <text x="65" y="78" text-anchor="middle" fill="#8fa6b8" font-size="9">OUT DC 2.5A</text>
      <text x="15" y="104" fill="#5fd88a" font-size="7">L</text><text x="35" y="104" fill="#5fd88a" font-size="7">N</text>
      <text x="76" y="104" fill="#5fd88a" font-size="7">+V</text><text x="100" y="104" fill="#ff8a8a" font-size="7">-V</text>
    `); }
  },

  /* ---- Proteção (protection) ---- */
  breaker: {
    label: "Disjuntor", w: 40, h: 80, switchable: true, defaultClosed: true,
    terminals: [ { id:"L", x:20, y:0 }, { id:"T", x:20, y:80 } ],
    icon: (c) => { const closed = c.state.closed; return svg(40,80,`
      <rect x="3" y="3" width="34" height="74" rx="5" fill="#f2f4f6" stroke="#555" stroke-width="1.5"/>
      <line x1="20" y1="6" x2="20" y2="74" stroke="#ccc" stroke-width="2" stroke-dasharray="3 3"/>
      <rect x="13" y="${closed?10:26}" width="14" height="${closed?60:44}" rx="4" fill="${closed?'#2fbf6a':'#e5484d'}"/>
      <text x="20" y="${closed?18:34}" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">${closed?"I":"O"}</text>
    `); }
  },
  fuse: {
    label: "Fusível", w: 36, h: 70, switchable: true, defaultClosed: true,
    terminals: [ { id:"L", x:18, y:0 }, { id:"T", x:18, y:70 } ],
    icon: (c) => { const closed = c.state.closed; return svg(36,70,`
      <rect x="8" y="4" width="20" height="62" rx="10" fill="#eef3f7" stroke="#8899a6" stroke-width="1.5"/>
      ${closed?`<line x1="18" y1="10" x2="18" y2="60" stroke="#c9a227" stroke-width="2"/>`
               :`<path d="M18 22 L24 32 L13 40 L22 50" stroke="#e5484d" stroke-width="2" fill="none"/>`}
      <circle cx="18" cy="6" r="4" fill="#8899a6"/><circle cx="18" cy="64" r="4" fill="#8899a6"/>
    `); }
  },
  thermalOverload: {
    label: "Relé Térmico", w: 54, h: 80, switchable: true, defaultClosed: true,
    terminals: [ { id:"95", x:27, y:0 }, { id:"96", x:27, y:80 } ],
    icon: (c) => { const closed = c.state.closed; return svg(54,80,`
      <rect x="3" y="3" width="48" height="74" rx="5" fill="#f2f4f6" stroke="#555" stroke-width="1.5"/>
      <path d="M15 14 q9 8 0 16 q-9 8 0 16 q9 8 0 16" stroke="#e07b00" stroke-width="2.5" fill="none"/>
      <rect x="30" y="${closed?12:26}" width="12" height="${closed?54:40}" rx="4" fill="${closed?'#2fbf6a':'#e5484d'}"/>
      <text x="36" y="${closed?20:34}" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">${closed?"95":"TRIP"}</text>
    `); }
  },

  /* ---- Comando (command / sensing) ---- */
  button: {
    label: "Botão (NA)", w: 44, h: 44, switchable: true, defaultClosed: false,
    terminals: [ { id:"1", x:0, y:22 }, { id:"2", x:44, y:22 } ],
    icon: (c) => { const pressed = c.state.closed; return svg(44,44,`
      <circle cx="22" cy="22" r="19" fill="#dfe3e8" stroke="#555" stroke-width="1.5"/>
      <circle cx="22" cy="22" r="13" fill="${pressed?'#2fbf6a':'#e5484d'}"/>
    `); }
  },
  emergencyStop: {
    label: "Botão de Emergência", w: 50, h: 50, switchable: true, defaultClosed: true,
    terminals: [ { id:"1", x:0, y:25 }, { id:"2", x:50, y:25 } ],
    icon: (c) => { const pressed = !c.state.closed; return svg(50,50,`
      <circle cx="25" cy="25" r="22" fill="#2a2a2a"/>
      <circle cx="25" cy="25" r="${pressed?15:18}" fill="#e5484d" stroke="#8a0000" stroke-width="2"/>
      ${pressed?`<circle cx="25" cy="25" r="6" fill="#8a0000"/>`:""}
    `); }
  },
  selector: {
    label: "Seletora (2 pos.)", w: 54, h: 54, switchable: true, defaultClosed: true,
    terminals: [ { id:"C", x:0, y:27 }, { id:"NO", x:54, y:27 } ],
    icon: (c) => { const angle = c.state.closed ? -28 : 28; return svg(54,54,`
      <circle cx="27" cy="27" r="22" fill="#2a323d" stroke="#111" stroke-width="2"/>
      <g transform="rotate(${angle} 27 27)"><rect x="24" y="6" width="6" height="22" rx="3" fill="#f4b400"/></g>
      <circle cx="27" cy="27" r="4" fill="#c7cdd4"/>
    `); }
  },
  selector3: {
    label: "Seletora Man-0-Auto", w: 60, h: 60, selector3: true, defaultPos: 1,
    terminals: [ { id:"C", x:0, y:30 }, { id:"NO1", x:60, y:6 }, { id:"NO2", x:60, y:54 } ],
    icon: (c) => { const pos = c.state.pos; const angle = pos===0?-35:pos===2?35:0; return svg(60,60,`
      <circle cx="30" cy="30" r="24" fill="#2a323d" stroke="#111" stroke-width="2"/>
      <g transform="rotate(${angle} 30 30)"><rect x="26" y="6" width="8" height="26" rx="4" fill="#f4b400"/></g>
      <circle cx="30" cy="30" r="5" fill="#c7cdd4"/>
      <text x="10" y="56" font-size="7" fill="#9aa6b2">M</text><text x="27" y="56" font-size="7" fill="#9aa6b2">0</text><text x="44" y="56" font-size="7" fill="#9aa6b2">A</text>
    `); }
  },
  limitSwitch: {
    label: "Fim de Curso (NA)", w: 46, h: 46, switchable: true, defaultClosed: false,
    terminals: [ { id:"1", x:0, y:23 }, { id:"2", x:46, y:23 } ],
    icon: (c) => { const closed = c.state.closed; return svg(46,46,`
      <rect x="3" y="18" width="40" height="20" rx="4" fill="#e9ecef" stroke="#555" stroke-width="1.5"/>
      <line x1="8" y1="18" x2="${closed?30:38}" y2="4" stroke="#333" stroke-width="3" stroke-linecap="round"/>
      <circle cx="8" cy="18" r="3" fill="#333"/>
      <circle cx="23" cy="28" r="3" fill="${closed?'#2fbf6a':'#c7cdd4'}"/>
    `); }
  },
  proximitySensor: {
    label: "Sensor Indutivo (NA)", w: 50, h: 40, switchable: true, defaultClosed: false,
    terminals: [ { id:"1", x:0, y:20 }, { id:"2", x:50, y:20 } ],
    icon: (c) => { const on = c.state.closed; return svg(50,40,`
      <rect x="4" y="10" width="42" height="20" rx="10" fill="#2a323d" stroke="#111" stroke-width="1.5"/>
      <circle cx="25" cy="20" r="4" fill="${on?'#2fbf6a':'#555'}"/>
      <rect x="0" y="16" width="6" height="8" fill="#8899a6"/><rect x="44" y="16" width="6" height="8" fill="#8899a6"/>
    `); }
  },

  /* ---- Atuação (actuation) ---- */
  contactor: {
    label: "Contator", w: 100, h: 100, coil: true,
    contacts: [ { a:"13", b:"14", type:"NO" }, { a:"21", b:"22", type:"NC" } ],
    terminals: [
      { id:"A1", x:15, y:0 }, { id:"A2", x:15, y:100 },
      { id:"13", x:85, y:0 }, { id:"14", x:85, y:34 },
      { id:"21", x:85, y:66 }, { id:"22", x:85, y:100 }
    ],
    icon: (c) => { const on = c.state.energized; return svg(100,100,`
      <rect x="2" y="2" width="96" height="96" rx="6" fill="#e9ecef" stroke="#555" stroke-width="1.5"/>
      <rect x="8" y="35" width="20" height="30" rx="3" fill="${on?'#f4b400':'#c7cdd4'}" stroke="#666"/>
      <text x="18" y="54" text-anchor="middle" font-size="8" font-weight="700">${on?"ON":"—"}</text>
      <text x="18" y="12" text-anchor="middle" font-size="7" fill="#333">A1</text>
      <text x="18" y="96" text-anchor="middle" font-size="7" fill="#333">A2</text>
      <line x1="85" y1="8" x2="85" y2="30" stroke="#333" stroke-width="3"/>
      <line x1="85" y1="38" x2="85" y2="30" stroke="${on?'#2fbf6a':'#e5484d'}" stroke-width="3" stroke-dasharray="${on?'0':'2 2'}"/>
      <text x="72" y="16" font-size="7" fill="#333">13</text><text x="72" y="42" font-size="7" fill="#333">14</text>
      <line x1="85" y1="62" x2="85" y2="92" stroke="${!on?'#2fbf6a':'#e5484d'}" stroke-width="3" stroke-dasharray="${!on?'0':'2 2'}"/>
      <line x1="85" y1="92" x2="85" y2="96" stroke="#333" stroke-width="3"/>
      <text x="72" y="70" font-size="7" fill="#333">21</text><text x="72" y="98" font-size="7" fill="#333">22</text>
    `); }
  },
  relay: {
    label: "Relé de Controle", w: 70, h: 90, coil: true,
    contacts: [ { a:"C", b:"NO", type:"NO" }, { a:"C", b:"NC", type:"NC" } ],
    terminals: [
      { id:"A1", x:8, y:0 }, { id:"A2", x:8, y:90 },
      { id:"C", x:62, y:45 }, { id:"NO", x:62, y:10 }, { id:"NC", x:62, y:80 }
    ],
    icon: (c) => { const on = c.state.energized; return svg(70,90,`
      <rect x="2" y="2" width="66" height="86" rx="6" fill="#e9ecef" stroke="#555" stroke-width="1.5"/>
      <rect x="6" y="33" width="18" height="24" rx="3" fill="${on?'#f4b400':'#c7cdd4'}" stroke="#666"/>
      <circle cx="62" cy="45" r="3" fill="#333"/>
      <line x1="62" y1="45" x2="62" y2="${on?12:78}" stroke="#333" stroke-width="2"/>
      <circle cx="62" cy="10" r="3" fill="${on?'#2fbf6a':'#c7cdd4'}"/>
      <circle cx="62" cy="80" r="3" fill="${!on?'#2fbf6a':'#c7cdd4'}"/>
      <text x="16" y="12" font-size="7" fill="#333">A1</text><text x="16" y="86" font-size="7" fill="#333">A2</text>
    `); }
  },
  timerRelay: {
    label: "Relé de Tempo (ON)", w: 90, h: 90, coil: true, timer: true, defaultDelayMs: 3000,
    contacts: [ { a:"15", b:"16", type:"NO", useDelay:true } ],
    terminals: [ { id:"A1", x:10, y:0 }, { id:"A2", x:10, y:90 }, { id:"15", x:80, y:0 }, { id:"16", x:80, y:90 } ],
    icon: (c) => {
      const on = c.state.energized, closed = c.state.contactClosed;
      let label;
      if (!on) label = "0s";
      else if (closed) label = "ON";
      else label = Math.max(0, Math.ceil(((c.state.delayMs||3000) - (Date.now()-(c.state.energizedAt||Date.now())))/1000)) + "s";
      return svg(90,90,`
        <rect x="2" y="2" width="86" height="86" rx="6" fill="#e9ecef" stroke="#555" stroke-width="1.5"/>
        <rect x="8" y="30" width="22" height="30" rx="3" fill="${on?'#f4b400':'#c7cdd4'}" stroke="#666"/>
        <circle cx="19" cy="45" r="9" fill="none" stroke="#333" stroke-width="1.5"/>
        <line x1="19" y1="45" x2="19" y2="39" stroke="#333" stroke-width="1.5"/><line x1="19" y1="45" x2="23" y2="45" stroke="#333" stroke-width="1.5"/>
        <text x="19" y="76" text-anchor="middle" font-size="8" font-weight="700">${label}</text>
        <line x1="75" y1="8" x2="75" y2="35" stroke="#333" stroke-width="3"/>
        <line x1="75" y1="55" x2="75" y2="82" stroke="#333" stroke-width="3"/>
        <line x1="75" y1="35" x2="75" y2="55" stroke="${closed?'#2fbf6a':'#e5484d'}" stroke-width="3" stroke-dasharray="${closed?'0':'3 3'}"/>
        <text x="10" y="12" font-size="7" fill="#333">A1</text><text x="10" y="88" font-size="7" fill="#333">A2</text>
      `);
    }
  },

  /* ---- Cargas (loads / displays) ---- */
  plc: {
    label: "CLP", w: 170, h: 100, isLoad: true,
    terminals: [ { id:"L", x:20, y:100 }, { id:"N", x:40, y:100 } ],
    icon: (c) => { const on = c.state.on; return svg(170,100,`
      <rect x="2" y="2" width="166" height="96" rx="6" fill="#2a323d" stroke="#111" stroke-width="2"/>
      <rect x="14" y="12" width="60" height="34" rx="3" fill="${on?'#0d84ff':'#10151c'}"/>
      <text x="44" y="33" text-anchor="middle" font-size="9" fill="${on?'#fff':'#3a4552'}">RUN</text>
      ${Array.from({length:8}).map((_,i)=>`<rect x="${10+i*19}" y="86" width="10" height="8" fill="#8b96a3"/>`).join("")}
      <text x="120" y="30" fill="#9aa6b2" font-size="10">CLP</text>
    `); }
  },
  hmi: {
    label: "IHM", w: 150, h: 100, isLoad: true,
    terminals: [ { id:"L", x:20, y:100 }, { id:"N", x:40, y:100 } ],
    icon: (c) => { const on = c.state.on; return svg(150,100,`
      <rect x="2" y="2" width="146" height="96" rx="8" fill="#12161c" stroke="#333" stroke-width="2"/>
      <rect x="12" y="12" width="126" height="66" rx="3" fill="${on?'#1976d2':'#0a0d11'}"/>
      ${on?`<circle cx="75" cy="45" r="14" fill="#8fd3ff"/><text x="75" y="49" text-anchor="middle" font-size="10" fill="#0d2b45" font-weight="700">ON</text>`:""}
    `); }
  },
  motor: {
    label: "Motor", w: 80, h: 80, isLoad: true,
    terminals: [ { id:"U", x:0, y:40 }, { id:"V", x:80, y:40 } ],
    icon: (c) => svg(80,80,`
      <circle cx="40" cy="40" r="36" fill="#2fbf6a" stroke="#1c7d45" stroke-width="3"/>
      <g class="motor-spoke"><line x1="40" y1="10" x2="40" y2="70" stroke="#1c7d45" stroke-width="3"/><line x1="10" y1="40" x2="70" y2="40" stroke="#1c7d45" stroke-width="3"/></g>
      <circle cx="40" cy="40" r="16" fill="#eafff1"/>
      <text x="40" y="45" text-anchor="middle" font-size="16" font-weight="800" fill="#1c7d45">M</text>
    `)
  },
  threePhaseMotor: {
    label: "Motor Trifásico", w: 90, h: 90, isLoad: true,
    terminals: [ { id:"U", x:15, y:90 }, { id:"V", x:45, y:90 }, { id:"W", x:75, y:90 } ],
    icon: (c) => svg(90,90,`
      <circle cx="45" cy="45" r="40" fill="#2fbf6a" stroke="#1c7d45" stroke-width="3"/>
      <g class="motor-spoke"><line x1="45" y1="12" x2="45" y2="78" stroke="#1c7d45" stroke-width="3"/><line x1="12" y1="45" x2="78" y2="45" stroke="#1c7d45" stroke-width="3"/></g>
      <circle cx="45" cy="45" r="18" fill="#eafff1"/>
      <text x="45" y="49" text-anchor="middle" font-size="12" font-weight="800" fill="#1c7d45">3~M</text>
    `)
  },
  lamp: {
    label: "Sinaleiro", w: 30, h: 30, isLoad: true,
    terminals: [ { id:"1", x:0, y:15 }, { id:"2", x:30, y:15 } ],
    icon: (c) => { const on = c.state.on; const color = c.state.color || "#ffce29";
      return svg(30,30,`<g class="glow"><circle cx="15" cy="15" r="12" fill="${on?color:'#5b5f66'}" stroke="#333" stroke-width="1.5"/></g>`); }
  },
  terminalBlock: {
    label: "Bornes", w: 170, h: 26, bus: true,
    terminals: Array.from({length:6}).map((_,i)=>({ id:"T"+(i+1), x: 14 + i*30, y: 0 })),
    icon: (c) => svg(170,26,`
      <rect x="1" y="1" width="168" height="24" rx="3" fill="#d8cdb0" stroke="#8a7f5e" stroke-width="1.5"/>
      ${Array.from({length:6}).map((_,i)=>`<line x1="${14+i*30}" y1="1" x2="${14+i*30}" y2="25" stroke="#8a7f5e" stroke-width="1"/>`).join("")}
    `)
  }
};

const PALETTE_ITEMS = [
  { cat:"Fontes", type:"power" },
  { cat:"Fontes", type:"acSource" },
  { cat:"Fontes", type:"threePhaseSource" },
  { cat:"Fontes", type:"switchingSupply" },
  { cat:"Proteção", type:"breaker" },
  { cat:"Proteção", type:"fuse" },
  { cat:"Proteção", type:"thermalOverload" },
  { cat:"Comando", type:"button" },
  { cat:"Comando", type:"emergencyStop" },
  { cat:"Comando", type:"selector" },
  { cat:"Comando", type:"selector3" },
  { cat:"Comando", type:"limitSwitch" },
  { cat:"Comando", type:"proximitySensor" },
  { cat:"Atuação", type:"contactor" },
  { cat:"Atuação", type:"relay" },
  { cat:"Atuação", type:"timerRelay" },
  { cat:"Cargas", type:"motor" },
  { cat:"Cargas", type:"threePhaseMotor" },
  { cat:"Cargas", type:"lamp", label:"Sinaleiro verde", extra:{ color:"#2fbf6a" } },
  { cat:"Cargas", type:"lamp", label:"Sinaleiro vermelho", extra:{ color:"#e5484d" } },
  { cat:"Cargas", type:"lamp", label:"Sinaleiro amarelo", extra:{ color:"#ffce29" } },
  { cat:"Cargas", type:"hmi" },
  { cat:"Cargas", type:"plc" },
  { cat:"Outros", type:"terminalBlock" }
];

/* ---------------- i18n ---------------- */
const LANGS = ["pt","en","id"];
const I18N = {
  pt: { comps:"Componentes", sheet:"Nesta folha", wire:"FIO", validateOk:"Circuito OK — todos os terminais principais conectados.",
        validateBad:(n)=>`${n} terminal(is) sem conexão.`, sim_on:"Simulação iniciada", sim_off:"Simulação parada",
        deleted:"Item excluído", noSelection:"Selecione um componente ou fio para excluir",
        collab:"Modo colaborativo (demonstração)", measure:(v)=>`Medição: ${v}` },
  en: { comps:"Components", sheet:"On this sheet", wire:"WIRE", validateOk:"Circuit OK — all main terminals connected.",
        validateBad:(n)=>`${n} unconnected terminal(s).`, sim_on:"Simulation started", sim_off:"Simulation stopped",
        deleted:"Item deleted", noSelection:"Select a component or wire to delete",
        collab:"Collaborative mode (demo)", measure:(v)=>`Reading: ${v}` },
  id: { comps:"Komponen", sheet:"Di lembar ini", wire:"KABEL", validateOk:"Sirkuit OK — semua terminal utama tersambung.",
        validateBad:(n)=>`${n} terminal belum tersambung.`, sim_on:"Simulasi dimulai", sim_off:"Simulasi dihentikan",
        deleted:"Item dihapus", noSelection:"Pilih komponen atau kabel untuk dihapus",
        collab:"Mode kolaborasi (demo)", measure:(v)=>`Hasil ukur: ${v}` }
};
let langIdx = 0;
const t = (k, ...a) => { const v = I18N[LANGS[langIdx]][k]; return typeof v === "function" ? v(...a) : v; };

/* ---------------- State ---------------- */
let sheets = [];
let currentSheetId = null;
let mode = "select";
let simulating = false;
let zoom = 1, panX = 40, panY = 40;
let selectedCompId = null, selectedWireId = null;
let pendingWire = null;
let dragState = null, panState = null;
let multimeterOn = false;
let uidN = 1;
let currentPosNet = new Set(), currentNegNet = new Set();
let simTimer = null, simTickTimer = null, simSeconds = 0;

const uid = (p) => p + (uidN++);
const key = (compId, termId) => compId + "::" + termId;
const getSheet = () => sheets.find(s => s.id === currentSheetId);

/* ---------------- DOM refs ---------------- */
const $ = (id) => document.getElementById(id);
const world = $("world"), wireLayer = $("wireLayer"), componentLayer = $("componentLayer");
const canvasWrap = $("canvasWrap"), sheetTabsEl = $("sheetTabs");
const paletteEl = $("palette"), paletteList = $("paletteList");
const layersPanel = $("layersPanel"), layersList = $("layersList");
const toastEl = $("toast"), tutorialPop = $("tutorialPop"), hintEl = $("hint");

/* ---------------- Persistence ---------------- */
function save() {
  try { localStorage.setItem("wiresim_state", JSON.stringify({ sheets, currentSheetId, uidN })); } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem("wiresim_state");
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.sheets || !data.sheets.length) return false;
    sheets = data.sheets; currentSheetId = data.currentSheetId; uidN = data.uidN || 1;
    return true;
  } catch (e) { return false; }
}

/* ---------------- Instance state helpers ---------------- */
function makeInitialState(type, def, extra) {
  const state = {};
  if (def.switchable) state.closed = !!def.defaultClosed;
  if (def.selector3) state.pos = def.defaultPos ?? 1;
  if (def.coil) {
    state.energized = false;
    if (def.timer) { state.wasEnergized = false; state.contactClosed = false; state.delayMs = def.defaultDelayMs || 3000; }
  }
  if (def.converter) state.on = false;
  if (def.isLoad) state.on = false;
  if (type === "lamp") state.color = "#ffce29";
  return Object.assign(state, extra || {});
}

function demoSheet() {
  const s = { id: uid("sheet"), name: "1. Folha 1", components: [], wires: [] };
  const add = (type, x, y, extra) => {
    const def = COMP_DEFS[type];
    const comp = { id: uid("c"), type, x, y, state: makeInitialState(type, def, extra), label: def.label };
    s.components.push(comp);
    return comp;
  };
  const acSrc  = add("acSource", 20, 30);
  const supply = add("switchingSupply", 170, 10);
  const brk    = add("breaker", 350, 30);
  const estop  = add("emergencyStop", 430, 55);
  const btn    = add("button", 520, 53);
  const cont   = add("contactor", 620, 10);
  const motor  = add("motor", 820, 20);
  const timer  = add("timerRelay", 620, 170);
  const lampG  = add("lamp", 830, 160, { color:"#2fbf6a" });
  const lampR  = add("lamp", 830, 220, { color:"#e5484d" });
  const lampY  = add("lamp", 760, 310, { color:"#ffce29" });

  const wire = (a,at,b,bt) => s.wires.push({ id: uid("w"), a:{compId:a.id,terminalId:at}, b:{compId:b.id,terminalId:bt} });
  wire(acSrc,"L", supply,"L");
  wire(acSrc,"N", supply,"N");
  wire(supply,"+V", brk,"L");
  wire(brk,"T", estop,"1");
  wire(estop,"2", btn,"1");
  wire(btn,"2", cont,"A1");
  wire(supply,"-V", cont,"A2");
  wire(supply,"+V", cont,"13");
  wire(cont,"14", motor,"U");
  wire(supply,"-V", motor,"V");
  wire(cont,"14", lampG,"1");
  wire(supply,"-V", lampG,"2");
  wire(supply,"+V", cont,"21");
  wire(cont,"22", lampR,"1");
  wire(supply,"-V", lampR,"2");
  wire(btn,"2", timer,"A1");
  wire(supply,"-V", timer,"A2");
  wire(supply,"+V", timer,"15");
  wire(timer,"16", lampY,"1");
  wire(supply,"-V", lampY,"2");
  return s;
}

/* ---------------- Rendering: palette ---------------- */
function renderPalette() {
  paletteList.innerHTML = "";
  let lastCat = null;
  PALETTE_ITEMS.forEach(item => {
    if (item.cat !== lastCat) {
      lastCat = item.cat;
      const h = document.createElement("div");
      h.className = "palette-section";
      h.textContent = item.cat;
      paletteList.appendChild(h);
    }
    const def = COMP_DEFS[item.type];
    const previewComp = { state: makeInitialState(item.type, def, item.extra) };
    const el = document.createElement("div");
    el.className = "palette-item";
    el.innerHTML = def.icon(previewComp) + `<span>${item.label || def.label}</span>`;
    el.addEventListener("pointerdown", (e) => startPaletteDrag(e, item));
    paletteList.appendChild(el);
  });
  document.querySelector("#palette .palette-head h3").textContent = t("comps");
  document.querySelector("#layersPanel .palette-head h3").textContent = t("sheet");
  $("modeWire").textContent = t("wire");
}

/* ---------------- Rendering: sheet tabs ---------------- */
function renderSheetTabs() {
  sheetTabsEl.innerHTML = "";
  sheets.forEach((s, i) => {
    const tab = document.createElement("div");
    tab.className = "sheet-tab" + (s.id === currentSheetId ? " active" : "");
    tab.textContent = `${i+1}. ${s.name.replace(/^\d+\.\s*/,"")}`;
    tab.addEventListener("click", () => { currentSheetId = s.id; deselectAll(); renderAll(); renderSheetTabs(); save(); });
    sheetTabsEl.appendChild(tab);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "sheet-add"; addBtn.textContent = "+"; addBtn.title = "Nova folha";
  addBtn.addEventListener("click", () => {
    const n = sheets.length + 1;
    const s = { id: uid("sheet"), name: `Folha ${n}`, components: [], wires: [] };
    sheets.push(s); currentSheetId = s.id; deselectAll(); renderAll(); renderSheetTabs(); save();
  });
  sheetTabsEl.appendChild(addBtn);
}

/* ---------------- Rendering: components + wires ---------------- */
function terminalKeyState(k) {
  if (currentPosNet.has(k)) return "pos";
  if (currentNegNet.has(k)) return "neg";
  return null;
}

function renderComponents() {
  componentLayer.innerHTML = "";
  const sheet = getSheet();
  if (!sheet) return;
  sheet.components.forEach(comp => {
    const def = COMP_DEFS[comp.type];
    const el = document.createElement("div");
    el.className = "comp" + (comp.id === selectedCompId ? " selected" : "");
    const energized = def.isLoad ? comp.state.on
      : def.coil ? comp.state.energized
      : def.converter ? comp.state.on
      : def.isSource ? simulating
      : false;
    if (energized) el.classList.add("energized");
    if ((comp.type === "motor" || comp.type === "threePhaseMotor") && energized) el.classList.add("spin");
    el.style.left = comp.x + "px"; el.style.top = comp.y + "px";
    el.style.width = def.w + "px"; el.style.height = def.h + "px";
    el.dataset.id = comp.id;
    el.innerHTML = `<div class="comp-body glow">${def.icon(comp)}</div><div class="comp-label">${comp.label || def.label}</div>`;
    def.terminals.forEach(term => {
      const td = document.createElement("div");
      td.className = "term";
      td.style.left = term.x + "px"; td.style.top = term.y + "px";
      const st = terminalKeyState(key(comp.id, term.id));
      if (simulating && st) td.classList.add("energized");
      if (pendingWire && pendingWire.compId === comp.id && pendingWire.terminalId === term.id) td.classList.add("pending");
      td.title = term.id;
      td.addEventListener("pointerdown", (e) => handleTerminalPointerDown(e, comp, term));
      el.appendChild(td);
    });
    el.addEventListener("pointerdown", (e) => handleCompPointerDown(e, comp));
    componentLayer.appendChild(el);
  });
}

function wirePath(sheet, w) {
  const ca = sheet.components.find(c => c.id === w.a.compId);
  const cb = sheet.components.find(c => c.id === w.b.compId);
  if (!ca || !cb) return null;
  const ta = COMP_DEFS[ca.type].terminals.find(t => t.id === w.a.terminalId);
  const tb = COMP_DEFS[cb.type].terminals.find(t => t.id === w.b.terminalId);
  if (!ta || !tb) return null;
  return { x1: ca.x + ta.x, y1: ca.y + ta.y, x2: cb.x + tb.x, y2: cb.y + tb.y };
}

function renderWires() {
  wireLayer.innerHTML = "";
  const sheet = getSheet();
  if (!sheet) return;
  sheet.wires.forEach(w => {
    const p = wirePath(sheet, w);
    if (!p) return;
    const mx = (p.x1 + p.x2) / 2;
    const d = `M ${p.x1} ${p.y1} C ${mx} ${p.y1}, ${mx} ${p.y2}, ${p.x2} ${p.y2}`;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    const ka = key(w.a.compId, w.a.terminalId), kb = key(w.b.compId, w.b.terminalId);
    const energized = simulating && (currentPosNet.has(ka) || currentNegNet.has(ka) || currentPosNet.has(kb) || currentNegNet.has(kb));
    path.setAttribute("class", "wire-line" + (energized ? " energized" : "") + (w.id === selectedWireId ? " selected" : ""));
    path.addEventListener("pointerdown", (e) => { e.stopPropagation(); onWireClick(w); });
    wireLayer.appendChild(path);
  });
  if (pendingWire) {
    const sheetNow = getSheet();
    const comp = sheetNow.components.find(c => c.id === pendingWire.compId);
    const term = COMP_DEFS[comp.type].terminals.find(t => t.id === pendingWire.terminalId);
    const x1 = comp.x + term.x, y1 = comp.y + term.y;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", pendingWire.mx ?? x1); line.setAttribute("y2", pendingWire.my ?? y1);
    line.setAttribute("class", "wire-temp");
    line.id = "tempWire";
    wireLayer.appendChild(line);
  }
}

function renderLayers() {
  layersList.innerHTML = "";
  const sheet = getSheet();
  if (!sheet) return;
  sheet.components.forEach(comp => {
    const def = COMP_DEFS[comp.type];
    const row = document.createElement("div");
    row.className = "layer-row" + (comp.id === selectedCompId ? " selected" : "");
    row.innerHTML = `<span class="dot"></span><span>${comp.label || def.label}</span><button class="del" title="Excluir">🗑</button>`;
    row.addEventListener("click", (e) => {
      if (e.target.closest(".del")) { deleteComponent(comp.id); return; }
      selectedCompId = comp.id; selectedWireId = null; renderAll();
    });
    layersList.appendChild(row);
  });
}

function renderAll() { renderComponents(); renderWires(); renderLayers(); }

/* ---------------- Transform / zoom / pan ---------------- */
function updateTransform() {
  world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  $("zoomLabel").textContent = Math.round(zoom * 100) + "%";
}
function worldPoint(clientX, clientY) {
  const rect = canvasWrap.getBoundingClientRect();
  return { x: (clientX - rect.left - panX) / zoom, y: (clientY - rect.top - panY) / zoom };
}

/* ---------------- Simulation ---------------- */
function buildAdjacency(sheet) {
  const adj = {};
  const link = (k1, k2) => { (adj[k1] = adj[k1] || new Set()).add(k2); (adj[k2] = adj[k2] || new Set()).add(k1); };
  sheet.wires.forEach(w => link(key(w.a.compId, w.a.terminalId), key(w.b.compId, w.b.terminalId)));
  sheet.components.forEach(c => {
    const def = COMP_DEFS[c.type];
    if (def.switchable && c.state.closed) {
      const ids = def.terminals.map(x => x.id);
      link(key(c.id, ids[0]), key(c.id, ids[1]));
    }
    if (def.selector3) {
      if (c.state.pos === 0) link(key(c.id,"C"), key(c.id,"NO1"));
      else if (c.state.pos === 2) link(key(c.id,"C"), key(c.id,"NO2"));
    }
    if (def.coil && def.contacts) {
      def.contacts.forEach(ct => {
        const active = ct.useDelay ? !!c.state.contactClosed : (ct.type === "NO" ? c.state.energized : !c.state.energized);
        if (active) link(key(c.id, ct.a), key(c.id, ct.b));
      });
    }
    if (def.bus) {
      const ids = def.terminals.map(x => x.id);
      for (let i = 1; i < ids.length; i++) link(key(c.id, ids[0]), key(c.id, ids[i]));
    }
  });
  return adj;
}
function bfs(adj, seeds) {
  const visited = new Set(seeds), queue = [...seeds];
  while (queue.length) {
    const cur = queue.shift();
    (adj[cur] || new Set()).forEach(n => { if (!visited.has(n)) { visited.add(n); queue.push(n); } });
  }
  return visited;
}
function seedKeys(sheet, pole) {
  const out = [];
  sheet.components.forEach(c => {
    const def = COMP_DEFS[c.type];
    if (def.isSource) def.terminals.forEach(term => { if (term.pole === pole) out.push(key(c.id, term.id)); });
    if (def.converter && c.state.on) def.terminals.forEach(term => { if (term.pole === pole) out.push(key(c.id, term.id)); });
  });
  return out;
}
function computeNets(sheet) {
  let posNet = new Set(), negNet = new Set();
  for (let iter = 0; iter < 6; iter++) {
    const adj = buildAdjacency(sheet);
    posNet = bfs(adj, seedKeys(sheet, "pos"));
    negNet = bfs(adj, seedKeys(sheet, "neg"));
    sheet.components.forEach(c => {
      const def = COMP_DEFS[c.type];
      if (def.coil) {
        c.state.energized = posNet.has(key(c.id, "A1")) && negNet.has(key(c.id, "A2"));
        if (def.timer) {
          if (c.state.energized) {
            if (!c.state.wasEnergized) { c.state.energizedAt = Date.now(); c.state.wasEnergized = true; }
            c.state.contactClosed = (Date.now() - c.state.energizedAt) >= (c.state.delayMs || def.defaultDelayMs || 3000);
          } else {
            c.state.wasEnergized = false;
            c.state.contactClosed = false;
          }
        }
      }
      if (def.converter) {
        c.state.on = posNet.has(key(c.id, def.converter.inHot)) && negNet.has(key(c.id, def.converter.inReturn));
      }
    });
  }
  return { posNet, negNet };
}
function updateLoadStates(sheet, posNet, negNet) {
  sheet.components.forEach(c => {
    const def = COMP_DEFS[c.type];
    if (def.isLoad) {
      const hasPos = def.terminals.some(term => posNet.has(key(c.id, term.id)));
      const hasNeg = def.terminals.some(term => negNet.has(key(c.id, term.id)));
      c.state.on = hasPos && hasNeg;
    }
  });
}
function runSimulation() {
  const sheet = getSheet();
  if (!simulating || !sheet) { currentPosNet = new Set(); currentNegNet = new Set(); return; }
  const { posNet, negNet } = computeNets(sheet);
  currentPosNet = posNet; currentNegNet = negNet;
  updateLoadStates(sheet, posNet, negNet);
}

function setSimulating(on) {
  simulating = on;
  const btn = $("btnSimulate");
  btn.classList.toggle("on", on);
  btn.textContent = on ? "■" : "▶";
  if (on) {
    simSeconds = 0;
    simTimer = setInterval(() => {
      simSeconds++;
      const m = String(Math.floor(simSeconds/60)).padStart(2,"0");
      const s = String(simSeconds%60).padStart(2,"0");
      $("timer").textContent = `${m}:${s}`;
    }, 1000);
    simTickTimer = setInterval(() => { runSimulation(); renderAll(); }, 300);
  } else {
    clearInterval(simTimer); simTimer = null; $("timer").textContent = "00:00";
    clearInterval(simTickTimer); simTickTimer = null;
  }
  runSimulation();
  renderAll();
  toast(on ? t("sim_on") : t("sim_off"));
}

/* ---------------- Component add / move / delete ---------------- */
function addComponent(type, x, y, extra, labelOverride) {
  const def = COMP_DEFS[type];
  const state = makeInitialState(type, def, extra);
  const comp = { id: uid("c"), type, x: Math.round(x - def.w/2), y: Math.round(y - def.h/2), state, label: labelOverride || def.label };
  getSheet().components.push(comp);
  selectedCompId = comp.id; selectedWireId = null;
  runSimulation(); renderAll(); save();
}
function deleteComponent(id) {
  const sheet = getSheet();
  sheet.components = sheet.components.filter(c => c.id !== id);
  sheet.wires = sheet.wires.filter(w => w.a.compId !== id && w.b.compId !== id);
  if (selectedCompId === id) selectedCompId = null;
  runSimulation(); renderAll(); save();
}
function deleteWire(id) {
  const sheet = getSheet();
  sheet.wires = sheet.wires.filter(w => w.id !== id);
  if (selectedWireId === id) selectedWireId = null;
  runSimulation(); renderAll(); save();
}
function deleteSelected() {
  if (selectedCompId) { deleteComponent(selectedCompId); toast(t("deleted")); }
  else if (selectedWireId) { deleteWire(selectedWireId); toast(t("deleted")); }
  else toast(t("noSelection"));
}
function deselectAll() { selectedCompId = null; selectedWireId = null; pendingWire = null; }

/* ---------------- Pointer interaction ---------------- */
function handleCompPointerDown(e, comp) {
  if (multimeterOn) { e.stopPropagation(); showMeasurement(comp, null); return; }
  if (mode === "wire") return;
  if (simulating) {
    const def = COMP_DEFS[comp.type];
    if (def.switchable) { comp.state.closed = !comp.state.closed; runSimulation(); renderAll(); save(); }
    else if (def.selector3) { comp.state.pos = (comp.state.pos + 1) % 3; runSimulation(); renderAll(); save(); }
    else if (def.coil) toast(`${comp.label || def.label}: bobina ${comp.state.energized ? "energizada" : "desenergizada"}`);
    else if (def.converter) toast(`${comp.label || def.label}: ${comp.state.on ? "alimentado" : "sem alimentação"}`);
    else if (def.isLoad) toast(`${comp.label || def.label}: ${comp.state.on ? "ligado" : "desligado"}`);
    return;
  }
  e.stopPropagation();
  selectedCompId = comp.id; selectedWireId = null;
  const wp = worldPoint(e.clientX, e.clientY);
  dragState = { id: comp.id, dx: wp.x - comp.x, dy: wp.y - comp.y };
  renderAll();
  window.addEventListener("pointermove", onCompDragMove);
  window.addEventListener("pointerup", onCompDragUp, { once: true });
}
function onCompDragMove(e) {
  if (!dragState) return;
  const sheet = getSheet();
  const comp = sheet.components.find(c => c.id === dragState.id);
  if (!comp) return;
  const wp = worldPoint(e.clientX, e.clientY);
  comp.x = Math.round(wp.x - dragState.dx);
  comp.y = Math.round(wp.y - dragState.dy);
  renderComponents(); renderWires();
}
function onCompDragUp() {
  dragState = null;
  window.removeEventListener("pointermove", onCompDragMove);
  save();
}

function handleTerminalPointerDown(e, comp, term) {
  e.stopPropagation();
  if (multimeterOn) { showMeasurement(comp, term); return; }
  if (mode !== "wire") { handleCompPointerDown(e, comp); return; }
  if (!pendingWire) {
    pendingWire = { compId: comp.id, terminalId: term.id };
    renderComponents(); renderWires();
    window.addEventListener("pointermove", onWireTempMove);
  } else {
    if (pendingWire.compId === comp.id && pendingWire.terminalId === term.id) {
      pendingWire = null;
    } else {
      const sheet = getSheet();
      const exists = sheet.wires.some(w =>
        (w.a.compId===pendingWire.compId && w.a.terminalId===pendingWire.terminalId && w.b.compId===comp.id && w.b.terminalId===term.id) ||
        (w.b.compId===pendingWire.compId && w.b.terminalId===pendingWire.terminalId && w.a.compId===comp.id && w.a.terminalId===term.id));
      if (!exists) {
        sheet.wires.push({ id: uid("w"), a: { compId: pendingWire.compId, terminalId: pendingWire.terminalId }, b: { compId: comp.id, terminalId: term.id } });
        save();
      }
      pendingWire = null;
    }
    window.removeEventListener("pointermove", onWireTempMove);
    runSimulation();
    renderComponents(); renderWires();
  }
}
function onWireTempMove(e) {
  if (!pendingWire) return;
  const wp = worldPoint(e.clientX, e.clientY);
  pendingWire.mx = wp.x; pendingWire.my = wp.y;
  renderWires();
}
function onWireClick(w) {
  if (mode === "wire") return;
  selectedWireId = w.id; selectedCompId = null; renderAll();
}

/* Canvas background click: cancel pending wire / deselect / start pan */
canvasWrap.addEventListener("pointerdown", (e) => {
  if (e.target !== canvasWrap && e.target !== world) return;
  if (mode === "pan") {
    panState = { sx: e.clientX, sy: e.clientY, ox: panX, oy: panY };
    canvasWrap.classList.add("panning");
    window.addEventListener("pointermove", onPanMove);
    window.addEventListener("pointerup", onPanUp, { once: true });
    return;
  }
  if (pendingWire) { pendingWire = null; window.removeEventListener("pointermove", onWireTempMove); renderWires(); }
  deselectAll(); renderAll();
});
function onPanMove(e) {
  if (!panState) return;
  panX = panState.ox + (e.clientX - panState.sx);
  panY = panState.oy + (e.clientY - panState.sy);
  updateTransform();
}
function onPanUp() {
  panState = null; canvasWrap.classList.remove("panning");
  window.removeEventListener("pointermove", onPanMove);
}

/* Palette custom drag-to-place */
function startPaletteDrag(e, item) {
  e.preventDefault();
  const def = COMP_DEFS[item.type];
  const previewComp = { state: makeInitialState(item.type, def, item.extra) };
  const ghost = document.createElement("div");
  ghost.style.position = "fixed"; ghost.style.zIndex = 999; ghost.style.pointerEvents = "none";
  ghost.style.left = e.clientX - def.w/2 + "px"; ghost.style.top = e.clientY - def.h/2 + "px";
  ghost.style.opacity = "0.85";
  ghost.innerHTML = def.icon(previewComp);
  document.body.appendChild(ghost);
  showHint(item.label || def.label);
  function move(ev) {
    ghost.style.left = ev.clientX - def.w/2 + "px";
    ghost.style.top = ev.clientY - def.h/2 + "px";
  }
  function up(ev) {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    ghost.remove(); hideHint();
    const rect = canvasWrap.getBoundingClientRect();
    if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
      const wp = worldPoint(ev.clientX, ev.clientY);
      addComponent(item.type, wp.x, wp.y, item.extra, item.label);
    }
  }
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/* ---------------- Toolbar buttons ---------------- */
function setMode(m) {
  mode = m;
  pendingWire = null;
  window.removeEventListener("pointermove", onWireTempMove);
  $("modeSelect").classList.toggle("active", m === "select");
  $("modeWire").classList.toggle("wire-on", m === "wire");
  canvasWrap.classList.toggle("wire-mode", m === "wire");
  canvasWrap.classList.toggle("pan-mode", m === "pan");
  $("btnPan").classList.toggle("toggled", m === "pan");
  renderWires();
}
$("modeSelect").addEventListener("click", () => setMode("select"));
$("modeWire").addEventListener("click", () => setMode(mode === "wire" ? "select" : "wire"));
$("btnPan").addEventListener("click", () => setMode(mode === "pan" ? "select" : "pan"));
$("btnSimulate").addEventListener("click", () => setSimulating(!simulating));

$("btnMenu").addEventListener("click", () => { paletteEl.classList.toggle("open"); layersPanel.classList.remove("open"); });
$("btnClosePalette").addEventListener("click", () => paletteEl.classList.remove("open"));
$("btnTree").addEventListener("click", () => { layersPanel.classList.toggle("open"); paletteEl.classList.remove("open"); renderLayers(); });
$("btnCloseLayers").addEventListener("click", () => layersPanel.classList.remove("open"));

$("btnTools").addEventListener("click", () => {
  const grid = canvasWrap.style.backgroundImage === "none" ? "" : "none";
  canvasWrap.style.backgroundImage = grid;
  toast(grid === "none" ? "Grade desativada" : "Grade ativada");
});
$("btnDoc").addEventListener("click", () => {
  const n = sheets.length + 1;
  const s = { id: uid("sheet"), name: `Folha ${n}`, components: [], wires: [] };
  sheets.push(s); currentSheetId = s.id; deselectAll(); renderAll(); renderSheetTabs(); save();
  toast("Nova folha criada");
});
$("btnTutorial").addEventListener("click", showTutorial);
$("btnCollab").addEventListener("click", () => toast(t("collab")));
$("btnLang").addEventListener("click", () => { langIdx = (langIdx + 1) % LANGS.length; renderPalette(); toast("Language: " + LANGS[langIdx].toUpperCase()); });
$("btnRename").addEventListener("click", () => {
  const sheet = getSheet();
  const name = prompt("Nome da folha:", sheet.name);
  if (name) { sheet.name = name; renderSheetTabs(); save(); }
});
$("btnRefresh").addEventListener("click", () => { setSimulating(false); toast("Simulação reiniciada"); });
$("btnExpand").addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
});

$("zoomIn").addEventListener("click", () => { zoom = Math.min(2.5, +(zoom + 0.1).toFixed(2)); updateTransform(); });
$("zoomOut").addEventListener("click", () => { zoom = Math.max(0.25, +(zoom - 0.1).toFixed(2)); updateTransform(); });
canvasWrap.addEventListener("wheel", (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoom = Math.min(2.5, Math.max(0.25, +(zoom + (e.deltaY < 0 ? 0.08 : -0.08)).toFixed(2)));
  updateTransform();
}, { passive: false });

$("btnMultimeter").addEventListener("click", () => {
  multimeterOn = !multimeterOn;
  $("btnMultimeter").classList.toggle("active", multimeterOn);
  toast(multimeterOn ? "Multímetro ativo — clique em um fio ou terminal" : "Multímetro desativado");
});
$("btnValidate").addEventListener("click", validateCircuit);
$("btnDelete").addEventListener("click", deleteSelected);

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && !e.target.isContentEditable && document.activeElement.tagName !== "INPUT") {
    e.preventDefault(); deleteSelected();
  }
  if (e.key === "Escape") { pendingWire = null; deselectAll(); renderAll(); }
});

/* ---------------- Validate / measure / toast / tutorial ---------------- */
function validateCircuit() {
  const sheet = getSheet();
  let unconnected = 0;
  sheet.components.forEach(c => {
    const def = COMP_DEFS[c.type];
    def.terminals.forEach(term => {
      if (term.pole === "signal") return;
      const k = key(c.id, term.id);
      const wired = sheet.wires.some(w => key(w.a.compId,w.a.terminalId) === k || key(w.b.compId,w.b.terminalId) === k);
      if (!wired) unconnected++;
    });
  });
  toast(unconnected === 0 ? t("validateOk") : t("validateBad", unconnected));
}
function showMeasurement(comp, term) {
  const def = COMP_DEFS[comp.type];
  const label0 = comp.label || def.label;
  let label, value;
  if (term) {
    const k = key(comp.id, term.id);
    const st = simulating ? terminalKeyState(k) : null;
    label = `${label0} · ${term.id}`;
    value = st === "pos" ? "fase / positivo ativo" : st === "neg" ? "neutro / retorno" : "sem tensão";
  } else {
    label = label0;
    value = def.isLoad ? (comp.state.on ? "energizado" : "sem tensão")
      : def.coil ? (comp.state.energized ? "bobina energizada" : "bobina desligada")
      : def.converter ? (comp.state.on ? "saída energizada" : "sem alimentação")
      : "—";
  }
  toast(`${t("measure", value)} — ${label}`);
}
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}
function showHint(msg) { hintEl.textContent = msg; hintEl.classList.add("show"); }
function hideHint() { hintEl.classList.remove("show"); }

const TUTORIAL_STEPS = [
  { title: "Bem-vindo!", body: "Este é um simulador de automação industrial com uma biblioteca completa: fontes AC/DC, proteção, comando, contatores/relés, motores e sinaleiros. Abra o menu ☰ para ver todos os componentes." },
  { title: "Adicionar componentes", body: "Arraste um componente da lista até a folha para posicioná-lo. Eles estão organizados por categoria: Fontes, Proteção, Comando, Atuação e Cargas." },
  { title: "Ligar os fios", body: "Ative a ferramenta FIO, clique em um terminal e depois em outro para criar uma ligação." },
  { title: "Simular", body: "Clique em ▶ para iniciar a simulação. Clique em botões/disjuntores/sensores para acioná-los, e veja contatores, relés de tempo e sinaleiros reagirem em tempo real." },
  { title: "Zoom e telas", body: "Use +/− para zoom, ✋ para mover a tela, e as abas para trabalhar em várias folhas." }
];
let tutIdx = 0;
function showTutorial() {
  tutIdx = 0; renderTutorialStep();
  tutorialPop.classList.add("show");
}
function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutIdx];
  tutorialPop.innerHTML = `<h4>${step.title}</h4><p>${step.body}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="tutClose" style="background:#ccc;color:#111;">Fechar</button>
      <button id="tutNext">${tutIdx < TUTORIAL_STEPS.length-1 ? "Próximo" : "Concluir"}</button>
    </div>`;
  tutorialPop.querySelector("#tutClose").addEventListener("click", () => tutorialPop.classList.remove("show"));
  tutorialPop.querySelector("#tutNext").addEventListener("click", () => {
    if (tutIdx < TUTORIAL_STEPS.length - 1) { tutIdx++; renderTutorialStep(); }
    else tutorialPop.classList.remove("show");
  });
}

/* ---------------- Init ---------------- */
function init() {
  if (!load()) {
    const s = demoSheet();
    sheets = [s]; currentSheetId = s.id;
  }
  renderPalette();
  renderSheetTabs();
  updateTransform();
  renderAll();
  setMode("select");
}
init();

})();
