// SOFTWARE glyphs: storage, services, gates, windows. Fills use semantic tokens.
import { wrap } from './core';
import type { GlyphOpts } from './core';

/** database cylinder. 80x96 */
export const database = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 80, 96, `<path class="fill-4" d="M4 16V76Q4 90 40 90Q76 90 76 76V16Z"/><ellipse class="tint-4" cx="40" cy="16" rx="36" ry="12"/><path class="ln thin" d="M4 38Q4 50 40 50Q76 50 76 38M4 58Q4 70 40 70Q76 70 76 58"/>`, o);

/** worker or server box with a status light. 120x84 */
export const worker = (x: number, y: number, o: GlyphOpts & { n?: number } = {}) =>
  wrap(x, y, 120, 84, `<rect class="eq" x="0" y="0" width="120" height="84" rx="12"/>${Array.from({ length: o.n ?? 2 }, (_, i) => `<rect class="eq2" x="12" y="${12 + i * 30}" width="96" height="22" rx="6"/><circle class="led" cx="26" cy="${23 + i * 30}" r="4.5"/><line class="ln thin" x1="42" y1="${23 + i * 30}" x2="92" y2="${23 + i * 30}"/>`).join('')}`, o);

/** queue: a row of job slots, some filled. 260x44 */
export const queue = (x: number, y: number, o: GlyphOpts & { n?: number; filled?: number } = {}) => {
  const n = o.n ?? 6, fl = o.filled ?? 4;
  return wrap(x, y, n * 42 + 8, 44, `<rect class="eq" x="0" y="0" width="${n * 42 + 8}" height="44" rx="10"/>${Array.from({ length: n }, (_, i) => `<rect class="${i < fl ? `fill-${(i % 5) + 1}` : 'eq2'}" x="${8 + i * 42}" y="8" width="34" height="28" rx="6"/>`).join('')}`, o);
};

/** API arrow pill with a method label. 120x40 */
export const apiArrow = (x: number, y: number, o: GlyphOpts & { text?: string } = {}) =>
  wrap(x, y, 120, 40, `<path class="fill-1" d="M0 8Q0 0 8 0H92L120 20L92 40H8Q0 40 0 32Z"/><text class="lb-w" x="14" y="26">${o.text ?? 'GET'}</text>`, o);

/** shield with a check (gate, validation). 70x84 */
export const shield = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 70, 84, `<path class="fill-4" d="M35 2L66 14V42Q66 68 35 82Q4 68 4 42V14Z"/><path class="ln chk" d="M20 42L31 54L52 30"/>`, o);

/** key. 90x40 */
export const key = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 90, 40, `<circle class="fill-5" cx="20" cy="20" r="16"/><circle class="eq" cx="20" cy="20" r="6"/><path class="fill-5" d="M32 15H88V25H74V34H64V25H32Z"/>`, o);

/** browser window with an address bar and content slot at translate(12 44) in 216x112. 240x170 */
export const browserWindow = (x: number, y: number, o: GlyphOpts & { screen?: string } = {}) =>
  wrap(x, y, 240, 170, `<rect class="eq" x="0" y="0" width="240" height="170" rx="12"/><path class="fill-6" d="M0 12Q0 0 12 0H228Q240 0 240 12V30H0Z"/><circle class="td" cx="16" cy="15" r="4.5"/><circle class="td" cx="32" cy="15" r="4.5"/><circle class="td" cx="48" cy="15" r="4.5"/>
<rect class="eq2" x="64" y="8" width="164" height="14" rx="7"/><g transform="translate(12 44)">${o.screen ?? ''}</g>`, o);

/** document page with text lines. 56x70 */
export const document_ = (x: number, y: number, o: GlyphOpts & { lines?: number } = {}) =>
  wrap(x, y, 56, 70, `<path class="file" d="M0 8Q0 0 8 0H36L56 20V62Q56 70 48 70H8Q0 70 0 62Z"/><path class="ln thin" d="M36 0V20H56"/>${Array.from({ length: o.lines ?? 3 }, (_, i) => `<line class="ln thin" x1="10" y1="${32 + i * 10}" x2="${i === 2 ? 30 : 46}" y2="${32 + i * 10}"/>`).join('')}`, o);
