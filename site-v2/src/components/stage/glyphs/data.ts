// DATA glyphs: tables, files, charts, groups of subjects. Fills use semantic tokens.
import { f, wrap, rnd } from './core';
import type { GlyphOpts } from './core';

/** table / grid with a header row. rows x cols, hot = [row, col] cells highlighted */
export const table = (x: number, y: number, o: GlyphOpts & { rows?: number; cols?: number; cw?: number; ch?: number; hot?: [number, number][] } = {}) => {
  const R = o.rows ?? 5, C = o.cols ?? 4, cw = o.cw ?? 44, ch = o.ch ?? 24;
  let s = `<rect class="eq" x="0" y="0" width="${C * cw}" height="${R * ch}" rx="8"/><rect class="fill-6" x="0" y="0" width="${C * cw}" height="${ch}" rx="8"/><rect class="fill-6" x="0" y="${ch - 8}" width="${C * cw}" height="8"/>`;
  for (let r = 1; r < R; r++) s += `<line class="gr2" x1="0" y1="${r * ch}" x2="${C * cw}" y2="${r * ch}"/>`;
  for (let c = 1; c < C; c++) s += `<line class="gr2" x1="${c * cw}" y1="0" x2="${c * cw}" y2="${R * ch}"/>`;
  (o.hot ?? []).forEach(([r, c]) => (s += `<rect class="fill-1" x="${c * cw + 2}" y="${r * ch + 2}" width="${cw - 4}" height="${ch - 4}" rx="4"/>`));
  return wrap(x, y, C * cw, R * ch, s, o);
};

/** file with CSV-like rows. 70x88 */
export const fileRows = (x: number, y: number, o: GlyphOpts & { ext?: string } = {}) =>
  wrap(x, y, 70, 88, `<path class="file" d="M0 10Q0 0 10 0H46L70 24V78Q70 88 60 88H10Q0 88 0 78Z"/><path class="ln thin" d="M46 0V24H70"/>${[40, 52, 64].map((yy) => `<line class="ln thin" x1="10" y1="${yy}" x2="60" y2="${yy}"/><line class="gr2" x1="30" y1="${yy - 6}" x2="30" y2="${yy + 6}"/>`).join('')}${o.ext ? `<text class="lb-s" x="10" y="32">${o.ext}</text>` : ''}`, o);

/** spreadsheet with column letters and row numbers, one hot cell. 260x170 */
export const spreadsheet = (x: number, y: number, o: GlyphOpts & { hot?: [number, number] } = {}) => {
  const cols = 'ABCDE', hot = o.hot ?? [2, 2];
  let s = `<rect class="eq" x="0" y="0" width="260" height="170" rx="10"/><rect class="fill-6" x="0" y="0" width="260" height="24" rx="10"/><rect class="fill-6" x="0" y="12" width="260" height="12"/>`;
  for (let c = 0; c < 5; c++) s += `<text class="lb-s" x="${f(42 + c * 44 + 18)}" y="17" text-anchor="middle">${cols[c]}</text>`;
  for (let r = 0; r < 6; r++) { s += `<text class="lb-s" x="20" y="${f(24 + r * 24 + 17)}" text-anchor="middle">${r + 1}</text>`; if (r) s += `<line class="gr2" x1="0" y1="${24 + r * 24}" x2="260" y2="${24 + r * 24}"/>`; }
  for (let c = 0; c < 5; c++) s += `<line class="gr2" x1="${40 + c * 44}" y1="0" x2="${40 + c * 44}" y2="170"/>`;
  s += `<rect class="hotc" x="${40 + hot[1] * 44}" y="${24 + hot[0] * 24}" width="44" height="24"/>`;
  return wrap(x, y, 260, 170, s, o);
};

/** chart axes with ticks. 260x170. children go inside at translate(40 10) in a 210x120 plot */
export const chartAxes = (x: number, y: number, o: GlyphOpts & { plot?: string } = {}) =>
  wrap(x, y, 260, 170, `<path class="ln" d="M40 10V130H250"/>${[0, 1, 2, 3].map((i) => `<line class="ln thin" x1="36" y1="${10 + i * 40}" x2="40" y2="${10 + i * 40}"/>`).join('')}<g transform="translate(40 10)">${o.plot ?? ''}</g>`, o);

/** histogram bars from values 0..1 (plot-sized 210x120, use inside chartAxes) */
export const histogram = (vals: number[], o: { w?: number; h?: number; cls?: string; at?: string } = {}) => {
  const w = o.w ?? 210, h = o.h ?? 120, bw = w / vals.length;
  return `<g${o.at ?? ''}>${vals.map((v, i) => `<rect class="${o.cls ?? 'fill-1'} bar" x="${f(i * bw + 2)}" y="${f(h - v * h)}" width="${f(bw - 4)}" height="${f(v * h)}" rx="3"/>`).join('')}</g>`;
};

/** volcano plot points in a 210x120 plot (use inside chartAxes). hot points are highlighted */
export const volcano = (o: { n?: number; seed?: number; at?: string } = {}) => {
  const r = rnd(o.seed ?? 7), n = o.n ?? 44; let s = '';
  for (let i = 0; i < n; i++) {
    const xx = (r() - 0.5) * 2, yy = Math.min(1, Math.abs(xx) ** 1.4 * 1.1 * (0.4 + r() * 0.9) + r() * 0.1), hot = Math.abs(xx) > 0.55 && yy > 0.45;
    s += `<circle class="${hot ? 'fill-2' : 'tint-6'} dotm" cx="${f(105 + xx * 95)}" cy="${f(116 - yy * 108)}" r="${hot ? 5 : 3.6}"/>`;
  }
  return `<g${o.at ?? ''}>${s}</g>`;
};

/** filter funnel. 90x90 */
export const funnel = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 90, 90, `<path class="fill-4" d="M4 8H86L54 46V80L36 88V46Z"/>`, o);

/** subject icon (head and shoulders). 44x56. c = palette slot 1..6 */
export const person = (x: number, y: number, o: GlyphOpts & { c?: number } = {}) =>
  wrap(x, y, 44, 56, `<circle class="fill-${o.c ?? 1}" cx="22" cy="14" r="12"/><path class="fill-${o.c ?? 1}" d="M2 56Q2 32 22 32Q42 32 42 56Z"/>`, o);

/** a row or grid of subject icons: n people, split into groups (array of counts) with colours */
export const people = (x: number, y: number, groups: number[], o: GlyphOpts & { cols?: number; gap?: number } = {}) => {
  const cols = o.cols ?? 6, gap = o.gap ?? 50; let s = '', i = 0;
  groups.forEach((n, gi) => { for (let k = 0; k < n; k++, i++) s += person((i % cols) * gap, Math.floor(i / cols) * 66, { c: gi + 1 }); });
  return wrap(x, y, cols * gap, Math.ceil(i / cols) * 66, s, o);
};

/** split into groups: a stem that branches to n coloured bins. 220x120 */
export const splitGroups = (x: number, y: number, o: GlyphOpts & { n?: number } = {}) => {
  const n = o.n ?? 3; let s = `<path class="ln" d="M110 0V30"/>`;
  for (let i = 0; i < n; i++) { const cx = 30 + i * (160 / (n - 1 || 1)); s += `<path class="ln" d="M110 30Q110 50 ${cx} 56V68"/><rect class="fill-${i + 1}" x="${cx - 24}" y="68" width="48" height="40" rx="8"/>`; }
  return wrap(x, y, 220, 110, s, o);
};
