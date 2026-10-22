// ELECTRONICS glyphs: boards, parts, electrodes, wires, screens. Fills use semantic tokens (see ../stage.css).
import { f, wrap, rnd } from './core';
import type { GlyphOpts } from './core';

/** printed circuit board with traces and a header strip. 220x140 */
export const pcb = (x: number, y: number, o: GlyphOpts & { w?: number; h?: number; pins?: number } = {}) => {
  const w = o.w ?? 220, h = o.h ?? 140, n = o.pins ?? 8;
  const pins = Array.from({ length: n }, (_, i) => `<rect class="pin" x="${f(14 + i * ((w - 28) / n))}" y="${h - 6}" width="8" height="16" rx="2"/>`).join('');
  return wrap(x, y, w, h + 10, `<rect class="pcb" x="0" y="0" width="${w}" height="${h}" rx="12"/>
<path class="cu" d="M20 30H${w * 0.4}V70H${w * 0.7}M${w - 20} 30H${w * 0.6}V50M30 ${h - 20}V90H${w * 0.5}"/>
<rect class="ic" x="${w * 0.4 - 12}" y="${h * 0.3}" width="54" height="40" rx="5"/>
<circle class="hole" cx="14" cy="14" r="5"/><circle class="hole" cx="${w - 14}" cy="14" r="5"/>
<circle class="via" cx="${w * 0.7}" cy="70" r="4"/>${pins}`, o);
};

/** microcontroller board with chip, USB port and pin rows. 200x112 */
export const mcuBoard = (x: number, y: number, o: GlyphOpts = {}) => {
  const rows = Array.from({ length: 12 }, (_, i) => `<rect class="pin" x="${14 + i * 14}" y="0" width="7" height="12" rx="2"/><rect class="pin" x="${14 + i * 14}" y="100" width="7" height="12" rx="2"/>`).join('');
  return wrap(x, y, 200, 112, `<rect class="pcb" x="0" y="8" width="200" height="96" rx="10"/>
<rect class="usb" x="-8" y="38" width="30" height="36" rx="4"/>
<rect class="ic" x="78" y="34" width="56" height="44" rx="5"/><path class="cu" d="M134 48H176M134 64H168M78 48H40M78 64H48"/>
<circle class="led" cx="168" cy="26" r="5"/>${rows}`, o);
};

/** resistor with colour bands. 70x22 */
export const resistor = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 70, 22, `<path class="ln" d="M0 11H12M58 11H70"/><rect class="eq2" x="12" y="2" width="46" height="18" rx="9"/>
<rect class="fill-5" x="22" y="2" width="5" height="18"/><rect class="fill-2" x="32" y="2" width="5" height="18"/><rect class="fill-4" x="42" y="2" width="5" height="18"/>`, o);

/** electrolytic capacitor. 36x52 */
export const capacitor = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 36, 52, `<path class="ln" d="M12 40V52M24 40V52"/><rect class="fill-4" x="2" y="2" width="32" height="40" rx="8"/><rect class="tint-4" x="6" y="6" width="7" height="32" rx="3"/><path class="ln thin" d="M24 10V20M19 15H29"/>`, o);

/** IC chip with legs. 72x52 */
export const icChip = (x: number, y: number, o: GlyphOpts & { legs?: number } = {}) => {
  const n = o.legs ?? 5, legs = Array.from({ length: n }, (_, i) => `<rect class="pin" x="${6 + i * (60 / n)}" y="0" width="6" height="10" rx="2"/><rect class="pin" x="${6 + i * (60 / n)}" y="42" width="6" height="10" rx="2"/>`).join('');
  return wrap(x, y, 72, 52, `${legs}<rect class="ic" x="0" y="8" width="72" height="36" rx="6"/><circle class="ldd" cx="10" cy="18" r="3"/>`, o);
};

/** skin electrode pad with snap and lead stub. 64x64 */
export const electrodePad = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 64, 64, `<circle class="eq2" cx="32" cy="32" r="30"/><circle class="tint-4" cx="32" cy="32" r="21"/><circle class="snap" cx="32" cy="32" r="8"/>`, o);

/** wire as a cable path with plug ends; d is any SVG path. Colour via the cls (w-1..w-6) */
export const wire = (d: string, o: { c?: number; at?: string; plug?: boolean } = {}) =>
  `<g${o.at ?? ''}><path class="wire w-${o.c ?? 2}" d="${d}"/></g>`;

/** oscilloscope screen with graticule and a trace path. 240x170 */
export const scope = (x: number, y: number, o: GlyphOpts & { trace?: string } = {}) => {
  const grid = [1, 2, 3, 4, 5].map((i) => `<line class="gr" x1="${i * 40}" y1="14" x2="${i * 40}" y2="130"/>`).join('') + [1, 2, 3].map((i) => `<line class="gr" x1="14" y1="${14 + i * 29}" x2="226" y2="${14 + i * 29}"/>`).join('');
  return wrap(x, y, 240, 170, `<rect class="eq" x="0" y="0" width="240" height="170" rx="14"/><rect class="scr" x="10" y="10" width="220" height="124" rx="8"/>${grid}
<path class="trace" d="${o.trace ?? 'M16 80H50L58 40L70 118L82 80H120L128 50L140 110L152 80H224'}"/>
<circle class="knob" cx="50" cy="152" r="9"/><circle class="knob" cx="90" cy="152" r="9"/><circle class="led" cx="206" cy="152" r="5"/>`, o);
};

/** laptop with a content slot: put your inner SVG at translate(18 14) inside 184x112. 220x150 */
export const laptop = (x: number, y: number, o: GlyphOpts & { screen?: string } = {}) =>
  wrap(x, y, 220, 150, `<rect class="eq" x="8" y="0" width="204" height="130" rx="12"/><rect class="scr" x="18" y="10" width="184" height="104" rx="6"/><g transform="translate(18 10)">${o.screen ?? ''}</g>
<path class="eq2" d="M0 134H220Q220 150 204 150H16Q0 150 0 134Z"/><rect class="eq" x="90" y="134" width="40" height="6" rx="3"/>`, o);

/** monitor on a stand. 220x170 */
export const monitor = (x: number, y: number, o: GlyphOpts & { screen?: string } = {}) =>
  wrap(x, y, 220, 170, `<rect class="eq" x="0" y="0" width="220" height="140" rx="12"/><rect class="scr" x="10" y="10" width="200" height="110" rx="6"/><g transform="translate(10 10)">${o.screen ?? ''}</g>
<path class="eq2" d="M90 140H130L136 162H84Z"/><rect class="eq2" x="64" y="160" width="92" height="10" rx="5"/>`, o);

/** solderless breadboard with rails and holes. 220x96 */
export const breadboard = (x: number, y: number, o: GlyphOpts = {}) => {
  let holes = '';
  for (let c = 0; c < 17; c++) for (let r = 0; r < 5; r++) { holes += `<circle class="hole" cx="${22 + c * 11.5}" cy="${20 + r * 11}" r="2.6"/>`; if (r < 2) holes += ''; }
  for (let c = 0; c < 17; c++) { holes += `<circle class="hole" cx="${22 + c * 11.5}" cy="8" r="2.4"/><circle class="hole" cx="${22 + c * 11.5}" cy="88" r="2.4"/>`; }
  return wrap(x, y, 220, 96, `<rect class="eq" x="0" y="0" width="220" height="96" rx="10"/><line class="rail-r" x1="12" y1="14" x2="208" y2="14"/><line class="rail-b" x1="12" y1="82" x2="208" y2="82"/><line class="ln thin" x1="12" y1="48" x2="208" y2="48"/>${holes}`, o);
};

/** signal path arrow with an optional label; for "sensor to amplifier to ADC" chains */
export const signalPath = (pts: [number, number][], o: { at?: string } = {}) =>
  `<g${o.at ?? ''}><polyline class="ln arrowl g-flow" points="${pts.map((p) => p.join(',')).join(' ')}"/></g>`;

/** example trace generators for scope screens */
export const ecgTrace = (x0 = 16, y0 = 80, w = 208, beats = 3) => {
  const step = w / beats; let d = `M${x0} ${y0}`;
  for (let i = 0; i < beats; i++) { const x = x0 + i * step; d += `H${f(x + step * 0.25)}l4 -8 4 8h6l4 6 6 -46 6 62 4 -22h${f(step * 0.1)}c10 -14 22 -14 26 0`; }
  return d + `H${x0 + w}`;
};
void rnd;
