// LAB glyphs: consumables and equipment. Origin is top-left unless noted. Colour comes from the stage.css tokens.
import { at, f } from './core';
/** 1.5 mL tube. liq = class of the liquid (lq-sage, lq-blue ...), level 0..1 */
export const tube = (x: number, y: number, o: { s?: number; liq?: string; level?: number; at?: string; cap?: string; inner?: string } = {}) => {
  const s = o.s ?? 1, lv = o.level ?? 0.55, top = 100 - 70 * lv;
  return `<g transform="${at(x, y, s)}"${o.at ?? ''}>
<path class="glass" d="M4 14H36V70Q36 98 20 104Q4 98 4 70Z"/>
${o.liq ? `<path class="${o.liq}" d="M5 ${f(top)}H35V70Q35 96 20 102Q5 96 5 70Z"/>` : ''}${o.inner ?? ''}
<rect class="${o.cap ?? 'cap'}" x="0" y="0" width="40" height="16" rx="6"/></g>`;
};

/** strip of n tubes (8 = a full strip). 128 wide at n=8 */
export const strip = (x: number, y: number, n = 8, o: { s?: number; liq?: string; at?: string } = {}) => {
  const tubes = Array.from({ length: n }, (_, i) =>
    `<path class="glass" d="M${i * 16 + 2} 8H${i * 16 + 14}V30Q${i * 16 + 14} 42 ${i * 16 + 8} 44Q${i * 16 + 2} 42 ${i * 16 + 2} 30Z"/>${o.liq ? `<path class="${o.liq}" d="M${i * 16 + 3} 22H${i * 16 + 13}V30Q${i * 16 + 13} 40 ${i * 16 + 8} 42Q${i * 16 + 3} 40 ${i * 16 + 3} 30Z"/>` : ''}`).join('');
  return `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>${tubes}<rect class="cap" x="0" y="0" width="${n * 16}" height="9" rx="4.5"/></g>`;
};

/** reagent bottle 60x112 */
export const bottle = (x: number, y: number, o: { s?: number; liq?: string; cap?: string; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<path class="glass" d="M18 16H42V30Q58 38 58 56V100Q58 110 48 110H12Q2 110 2 100V56Q2 38 18 30Z"/>
<path class="${o.liq ?? 'lq-blue'}" d="M3.5 62H56.5V100Q56.5 108.5 48 108.5H12Q3.5 108.5 3.5 100Z"/>
<rect class="${o.cap ?? 'cap'}" x="14" y="0" width="32" height="18" rx="5"/></g>`;

/** 96-well plate 200x134. cols/rows tint wells: tint = array of [col,row,fillClass] */
export const plate = (x: number, y: number, o: { s?: number; tint?: [number, number, string][]; at?: string } = {}) => {
  let w = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    const t = o.tint?.find((q) => q[0] === c && q[1] === r);
    w += `<circle class="well${t ? ' ' + t[2] : ''}" cx="${f(19 + c * 14.8)}" cy="${f(19.5 + r * 13.7)}" r="5.2"/>`;
  }
  return `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}><path class="eq" d="M18 0H190Q200 0 200 10V124Q200 134 190 134H10Q0 134 0 124V18Z"/><rect class="eq2" x="7" y="7" width="186" height="120" rx="7"/>${w}</g>`;
};

/** 8-channel pipette. origin = bottom of the tip row, centre. rot in degrees. */
export const pipette = (x: number, y: number, o: { s?: number; rot?: number; at?: string; liq?: string } = {}) => {
  const tips = [-33, -11, 11, 33].map((tx) => `<path class="tip" d="M${tx - 5} -34h10l-3 34h-4z"/>${o.liq ? `<path class="${o.liq}" d="M${tx - 2.4} -12h4.8l-1 12h-2.8z"/>` : ''}`).join('');
  return `<g transform="${at(x, y, o.s ?? 1, o.rot ?? 0)}"${o.at ?? ''}>${tips}
<rect class="eq2" x="-43" y="-52" width="86" height="20" rx="7"/>
<rect class="pip" x="-19" y="-124" width="38" height="76" rx="15"/>
<rect class="eq" x="-9" y="-140" width="18" height="18" rx="5"/>
<rect class="pipg" x="-6" y="-100" width="12" height="30" rx="5"/></g>`;
};

/** thermal cycler 240x130; lid is a separate group so the caller can animate it with lidA */
export const cycler = (x: number, y: number, o: { s?: number; lidA?: string; at?: string; screen?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="eq" x="0" y="36" width="240" height="94" rx="14"/>
<rect class="eq2" x="14" y="86" width="212" height="34" rx="8"/>
<rect class="scr" x="20" y="92" width="62" height="22" rx="5"/>${o.screen ?? '<path class="scl" d="M26 108 36 100 46 106 58 97 76 102"/>'}
<rect class="slot" x="104" y="94" width="112" height="18" rx="6"/>
<circle class="led" cx="92" cy="103" r="4"/>
<g${o.lidA ?? ''}><rect class="eq2" x="8" y="6" width="224" height="42" rx="14"/><rect class="eq" x="22" y="14" width="196" height="12" rx="6"/></g></g>`;

/** top-view centrifuge 170x170; rotor group takes spinA */
export const centrifuge = (x: number, y: number, o: { s?: number; spinA?: string; at?: string } = {}) => {
  const slots = Array.from({ length: 6 }, (_, i) => `<rect class="slot" x="-7" y="-60" width="14" height="30" rx="6" transform="rotate(${i * 60})"/>`).join('');
  return `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="eq" x="0" y="0" width="170" height="170" rx="26"/>
<circle class="eq2" cx="85" cy="85" r="68"/>
<g transform="translate(85 85)"><g${o.spinA ?? ''}><circle class="rot" r="52"/>${slots}<circle class="hub" r="10"/></g></g>
<rect class="scr" x="118" y="144" width="38" height="14" rx="4"/><circle class="led" cx="24" cy="152" r="5"/></g>`;
};

/** magnetic rack 150x92 (two tube slots). beads are drawn by the caller */
export const rack = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="eq" x="0" y="44" width="150" height="48" rx="9"/>
<rect class="mag" x="8" y="76" width="134" height="10" rx="3"/>
<rect class="slot" x="22" y="40" width="34" height="14" rx="5"/><rect class="slot" x="94" y="40" width="34" height="14" rx="5"/></g>`;

/** microfluidic chip 150x96 with 3 inlets and an outlet */
export const chip = (x: number, y: number, o: { s?: number; at?: string; wellAt?: [string, string, string] } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="eq" x="0" y="0" width="150" height="96" rx="12"/>
<circle class="slot" cx="30" cy="26" r="14"/><circle class="slot" cx="75" cy="26" r="14"/><circle class="slot" cx="120" cy="26" r="14"/>
<circle class="lq-sage" cx="30" cy="26" r="9"${o.wellAt?.[0] ?? ''}/><circle class="lq-bead" cx="75" cy="26" r="9"${o.wellAt?.[1] ?? ''}/><circle class="lq-oil" cx="120" cy="26" r="9"${o.wellAt?.[2] ?? ''}/>
<path class="ln thin" d="M30 40V58H75V40M75 58H120V40M75 58V72"/>
<circle class="slot" cx="75" cy="76" r="11"/></g>`;

/** Chromium-family instrument 280x160; the tray (carrying the chip) is drawn by the caller in the slot at (146..262, 70..120) */
export const chromium = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="eq" x="0" y="0" width="280" height="150" rx="20"/>
<rect class="eq2" x="0" y="0" width="280" height="30" rx="20"/><rect class="eq2" x="0" y="14" width="280" height="16"/>
<rect class="scr" x="22" y="48" width="104" height="66" rx="10"/>
<path class="scl" d="M36 98 52 82 68 92 86 66 108 78"/><circle class="led" cx="40" cy="62" r="4"/>
<rect class="slot" x="146" y="64" width="116" height="58" rx="9"/>
<rect class="eq2" x="30" y="150" width="32" height="8" rx="3"/><rect class="eq2" x="218" y="150" width="32" height="8" rx="3"/></g>`;

/** Bioanalyzer-style bench instrument 190x110 */
export const bioanalyzer = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<path class="eq" d="M0 100V34Q0 20 14 20H176Q190 20 190 34V100Z"/>
<path class="eq2" d="M14 20 30 0H160L176 20Z"/>
<rect class="scr" x="18" y="40" width="70" height="40" rx="6"/><path class="scl" d="M24 72 38 66 46 52 54 70 62 62 82 70"/>
<rect class="slot" x="108" y="46" width="64" height="30" rx="6"/><rect class="chp" x="116" y="52" width="48" height="18" rx="3"/>
<circle class="led" cx="30" cy="90" r="4"/></g>`;

/** flow cell 360x110: one channel, two ports */
export const flowcell = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}>
<rect class="glass" x="0" y="0" width="360" height="110" rx="14"/>
<rect class="chan" x="44" y="22" width="272" height="66" rx="10"/>
<circle class="slot" cx="24" cy="55" r="9"/><circle class="slot" cx="336" cy="55" r="9"/></g>`;

/** terminal window, origin top-left */
export const terminal = (x: number, y: number, w: number, h: number, inner: string, o: { at?: string } = {}) =>
  `<g transform="translate(${x} ${y})"${o.at ?? ''}><rect class="term" x="0" y="0" width="${w}" height="${h}" rx="12"/>
<path class="termbar" d="M0 12Q0 0 12 0H${w - 12}Q${w} 0 ${w} 12V30H0Z"/>
<circle class="td" cx="18" cy="15" r="5"/><circle class="td" cx="36" cy="15" r="5"/><circle class="td" cx="54" cy="15" r="5"/>${inner}</g>`;

/** small document / config icon with fold, 52x64 */
export const doc = (x: number, y: number, o: { s?: number; at?: string; lines?: number } = {}) => {
  const n = o.lines ?? 3;
  return `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}><path class="file" d="M0 8Q0 0 8 0H34L52 18V56Q52 64 44 64H8Q0 64 0 56Z"/><path class="ln thin" d="M34 0V18H52"/>${Array.from({ length: n }, (_, i) => `<line class="ln thin" x1="9" y1="${30 + i * 9}" x2="${i === n - 1 ? 30 : 43}" y2="${30 + i * 9}"/>`).join('')}</g>`;
};


/** microscope. 110x140 */
export const microscope = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}><rect class="eq2" x="6" y="124" width="98" height="14" rx="6"/><path class="eq" d="M26 124V64Q26 30 56 30H64Q92 30 92 58V124Z"/><rect class="eq2" x="46" y="0" width="22" height="46" rx="6" transform="rotate(24 57 23)"/><rect class="fill-4" x="38" y="62" width="26" height="12" rx="3"/><rect class="eq2" x="26" y="94" width="52" height="8" rx="3"/></g>`;

/** beaker with a liquid level. 70x86 */
export const beaker = (x: number, y: number, o: { s?: number; liq?: string; level?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}><path class="glass" d="M4 6H66L60 76Q60 84 52 84H18Q10 84 10 76Z"/><path class="${o.liq ?? 'lq-blue'}" d="M${10 - 3 * (1 - (o.level ?? 0.5))} ${84 - 70 * (o.level ?? 0.5)}H${60 + 3 * (1 - (o.level ?? 0.5))}L60 76Q60 82 52 82H18Q10 82 10 76Z"/><path class="ln thin" d="M4 6V2H66V6M16 30H26M16 44H26M16 58H26"/></g>`;

/** generic instrument chassis with screen and a slot. 280x160 */
export const instrument = chromium;
