// Flex v2 molecule vocabulary (probes, RNA, cells, GEMs). World-specific on purpose.
import { at, f } from '../../components/stage/glyphs/core';
/** wavy RNA line from x1 to x2 */
export const rna = (x1: number, x2: number, y: number, amp = 4, half = 9, at_ = '') => {
  const n = Math.max(2, Math.round((x2 - x1) / half));
  return `<path class="rna" d="M${x1} ${y} q${half / 2} ${-amp * 2} ${half} 0${` t${half} 0`.repeat(n - 1)}"${at_}/>`;
};

/** closed smooth blob (cell) */
export const blob = (cx: number, cy: number, r: number, seed = 1, wob = 0.07, n = 10) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob * Math.sin(a * 3 + seed) + wob * 0.6 * Math.cos(a * 2 + seed * 2.1);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + 'Z';
};

/** a fixed or live cell: outline, nucleus and a few RNA squiggles. origin = centre. */
export const cell = (cx: number, cy: number, r: number, o: { seed?: number; squig?: boolean; cls?: string; at?: string; nuc?: boolean } = {}) => {
  const s = o.seed ?? 1;
  const sq = o.squig === false ? '' : [[-.45, .32, .3], [.15, .5, -.2], [.42, -.1, .1], [-.2, -.5, .35]]
    .map(([a, b, c]) => `<path class="rna rna-s" d="M${f(cx + a * r)} ${f(cy + b * r)} q${f(r * .12)} ${f(-r * .2)} ${f(r * .24)} 0 t${f(r * .24)} 0" transform="rotate(${f(c * 90)} ${f(cx + a * r)} ${f(cy + b * r)})"/>`).join('');
  return `<g${o.at ?? ''}><path class="${o.cls ?? 'cellb'}" d="${blob(cx, cy, r, s)}"/>${o.nuc === false ? '' : `<ellipse class="nuc" cx="${f(cx - r * .08)}" cy="${f(cy - r * .1)}" rx="${f(r * .36)}" ry="${f(r * .32)}"/>`}${sq}</g>`;
};

/* ---------- consumables ---------- */

/** sample card ledger 11 columns x 8 rows. returns each card with a waterfall delay via fn */
export const ledger = (x: number, y: number, cw: number, ch: number, px: number, py: number, fn: (r: number, c: number) => { cls?: string; at?: string } = () => ({})) => {
  let s = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 11; c++) {
    const o = fn(r, c);
    s += `<rect class="${o.cls ?? 'card'}" x="${f(x + c * px)}" y="${f(y + r * py)}" width="${cw}" height="${ch}" rx="${f(Math.min(cw, ch) * 0.24)}"${o.at ?? ''}/>`;
  }
  return s;
};

/* ---------- molecules (h = 20) ---------- */

/** arrowed DNA block pointing right (5' to 3') */
export const dnaR = (x: number, y: number, w: number, cls: string, at_ = '') =>
  `<path class="seg ${cls}" d="M${x} ${y}H${x + w - 9}L${x + w} ${y + 10}L${x + w - 9} ${y + 20}H${x}Z"${at_}/>`;
/** plain rounded block */
export const blk = (x: number, y: number, w: number, cls: string, at_ = '', h = 20) =>
  `<rect class="seg ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"${at_}/>`;
export const diamond = (cx: number, cy: number, r = 8, cls = 'sbc', at_ = '') => `<path class="seg ${cls}" d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z"${at_}/>`;
export const square = (cx: number, cy: number, r = 7, cls = 'gbc', at_ = '') => `<rect class="seg ${cls}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="2"${at_}/>`;
/** base-pairing ticks between y1 and y2 over x range */
export const ticks = (x1: number, x2: number, y1: number, y2: number, step = 9, at_ = '') => {
  let s = '';
  for (let x = x1; x <= x2; x += step) s += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`;
  return `<g class="tick"${at_}>${s}</g>`;
};

/** a GEM droplet with optional bead and cell. origin = centre */
export const gem = (cx: number, cy: number, r: number, o: { bead?: boolean; cell?: boolean; cell2?: boolean; at?: string; seed?: number } = {}) =>
  `<g${o.at ?? ''}><circle class="gemc" cx="${cx}" cy="${cy}" r="${r}"/>${o.bead ? bead(cx - r * 0.3, cy - r * 0.12, r * 0.34) : ''}${o.cell ? cell(cx + r * 0.3, cy + r * 0.12, r * 0.38, { seed: o.seed ?? 2, squig: false }) : ''}${o.cell2 ? cell(cx + r * 0.1, cy + r * 0.45, r * 0.3, { seed: 4, squig: false, cls: 'cellb c2' }) : ''}</g>`;

export const bead = (cx: number, cy: number, r: number, at_ = '') => {
  let st = '';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; st += `<line x1="${f(cx + Math.cos(a) * r)}" y1="${f(cy + Math.sin(a) * r)}" x2="${f(cx + Math.cos(a) * (r + r * 0.4))}" y2="${f(cy + Math.sin(a) * (r + r * 0.4))}"/>`; }
  return `<g${at_}><g class="stubs">${st}</g><circle class="gbead" cx="${cx}" cy="${cy}" r="${f(r)}"/></g>`;
};

/** mouse outline (neutral), origin top-left, 200x110 */
export const mouse = (x: number, y: number, o: { s?: number; at?: string } = {}) =>
  `<g transform="${at(x, y, o.s ?? 1)}"${o.at ?? ''}><path class="mouse" d="M30 70C30 40 62 26 96 28C120 14 142 18 146 34C160 38 176 48 190 58C198 62 202 72 192 76C170 84 130 92 96 92C58 92 30 90 30 70Z"/>
<circle class="mouse" cx="132" cy="30" r="14"/><path class="mouse" d="M30 70C14 64 8 76 0 72"/><circle class="eye" cx="166" cy="56" r="3"/></g>`;

