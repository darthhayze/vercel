// PAPER glyphs: journal pages, highlights, figure thumbnails.
import { wrap } from './core';
import type { GlyphOpts } from './core';

/** stack of journal pages with text lines and a title bar. 120x150 */
export const journalStack = (x: number, y: number, o: GlyphOpts & { n?: number } = {}) => {
  const n = o.n ?? 3;
  const back = Array.from({ length: n - 1 }, (_, i) => `<rect class="eq2" x="${(n - 1 - i) * 6}" y="${-(n - 1 - i) * 6 + 6}" width="104" height="138" rx="8"/>`).join('');
  return wrap(x, y, 120, 150, `${back}<rect class="eq" x="0" y="6" width="104" height="138" rx="8"/><rect class="fill-6" x="10" y="16" width="62" height="10" rx="5"/>${Array.from({ length: 8 }, (_, i) => `<line class="ln thin" x1="10" y1="${42 + i * 12}" x2="${i % 3 === 2 ? 66 : 94}" y2="${42 + i * 12}"/>`).join('')}`, o);
};

/** highlight marker stripe over text. w wide */
export const highlight = (x: number, y: number, o: GlyphOpts & { w?: number } = {}) =>
  wrap(x, y, o.w ?? 120, 16, `<rect class="hl" x="0" y="0" width="${o.w ?? 120}" height="16" rx="4"/>`, o);

/** three figure thumbnails (bars, line, scatter). 200x70 */
export const figureThumbs = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 200, 70, [0, 1, 2].map((i) => `<g transform="translate(${i * 68} 0)"><rect class="eq" width="60" height="70" rx="8"/>${i === 0 ? `<rect class="fill-1" x="10" y="38" width="9" height="22" rx="2"/><rect class="fill-2" x="25" y="24" width="9" height="36" rx="2"/><rect class="fill-1" x="40" y="32" width="9" height="28" rx="2"/>` : i === 1 ? `<path class="curve" d="M10 56Q22 20 34 40T52 14"/>` : `<circle class="fill-2" cx="18" cy="48" r="4"/><circle class="fill-1" cx="30" cy="30" r="4"/><circle class="fill-1" cx="42" cy="40" r="4"/><circle class="fill-2" cx="46" cy="18" r="4"/>`}</g>`).join(''), o);
