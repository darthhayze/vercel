// Shared helpers for every glyph. Pure functions that return SVG strings. See ../README.md.
export const f = (n: number) => +n.toFixed(2);
export const A = (kind: string, start = 0, dur = 0.6, ease = 'out', param = '') =>
  ` data-a="${kind} ${start} ${dur} ${ease}${param ? ' ' + param : ''}"`;

export const at = (x: number, y: number, s = 1, rot = 0) =>
  `translate(${f(x)} ${f(y)})${rot ? ` rotate(${rot})` : ''}${s !== 1 ? ` scale(${s})` : ''}`;
export const G = (x: number, y: number, inner: string, s = 1, attrs = '', rot = 0) =>
  `<g transform="${at(x, y, s, rot)}"${attrs}>${inner}</g>`;

export const T = (x: number, y: number, text: string, o: { c?: string; a?: 'start' | 'middle' | 'end'; at?: string } = {}) =>
  `<text x="${x}" y="${y}" class="${o.c ?? 'lb'}"${o.a ? ` text-anchor="${o.a}"` : ''}${o.at ?? ''}>${text}</text>`;

/** multi-line label: one <text>, one <tspan> per line, line spacing in em so it scales with the phone label size (never overlaps at 34 units). */
export const TL = (x: number, y: number, lines: string[], o: { c?: string; a?: 'start' | 'middle' | 'end'; at?: string } = {}) =>
  `<text x="${x}" y="${y}" class="${o.c ?? 'lb'}"${o.a ? ` text-anchor="${o.a}"` : ''}${o.at ?? ''}>${lines.map((l, i) => `<tspan x="${x}"${i ? ' dy="1.2em"' : ''}>${l}</tspan>`).join('')}</text>`;

/** leader line with a dot at the target end */
export const L = (x1: number, y1: number, x2: number, y2: number, at_ = '') =>
  `<g${at_}><line class="ld" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><circle class="ldd" cx="${x2}" cy="${y2}" r="3.5"/></g>`;

/** a bench shelf under a row of equipment */
export const shelf = (y: number, x1 = 0, x2 = 800, at_ = '') => `<g${at_}><rect class="bench" x="${x1}" y="${y}" width="${x2 - x1}" height="14"/><line class="benchl" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/></g>`;
/** scale a group about a point */
export const sc = (cx: number, cy: number, k: number, inner: string, at_ = '') => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})"${at_}>${inner}</g>`;

export const SCENE_BG = (h = 560) => `<rect class="bgp" width="800" height="${h}" rx="22"/>`;


/** deterministic pseudo random 0..1, for repeatable "organic" shapes */
export const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/** common option bag for glyphs: s = scale, at = data-a string, cls = extra classes (g-enter, g-travel, g-pulse), label = name under the glyph */
export interface GlyphOpts { s?: number; at?: string; cls?: string; label?: string }

/** wrap a glyph: positions it, applies scale, hooks and an optional name label centred under it (w and h are the glyph box) */
export const wrap = (x: number, y: number, w: number, h: number, inner: string, o: GlyphOpts = {}) => {
  const s = o.s ?? 1;
  const label = o.label ? `<text x="${f(x + (w * s) / 2)}" y="${f(y + h * s + 26)}" class="lb" text-anchor="middle">${o.label}</text>` : '';
  return `<g transform="${at(x, y, s)}"${o.cls ? ` class="${o.cls}"` : ''}${o.at ?? ''}>${inner}</g>${label}`;
};

/** curved or straight flow arrow between two points; class g-flow animates dashes when no player is present */
export const flow = (x1: number, y1: number, x2: number, y2: number, o: { bend?: number; at?: string; dashed?: boolean } = {}) => {
  const b = o.bend ?? 0, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + b;
  const ang = Math.atan2(y2 - (b ? my : y1), x2 - (b ? mx : x1));
  const hx = (d: number) => f(x2 - Math.cos(ang + d) * 12), hy = (d: number) => f(y2 - Math.sin(ang + d) * 12);
  return `<g${o.at ?? ''}><path class="ln arrowl${o.dashed ? ' g-flow' : ''}" d="M${x1} ${y1}${b ? `Q${f(mx)} ${f(my)} ${x2} ${y2}` : `L${x2} ${y2}`}M${hx(0.5)} ${hy(0.5)}L${x2} ${y2}L${hx(-0.5)} ${hy(-0.5)}"/></g>`;
};
