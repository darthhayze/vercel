// SOUND glyphs: waveforms, spectrograms, chest icon, speaker, microphone.
import { f, wrap, rnd } from './core';
import type { GlyphOpts } from './core';

/** waveform bars (breath-shaped envelope). w x h box, n bars */
export const waveformBars = (x: number, y: number, o: GlyphOpts & { w?: number; h?: number; n?: number; seed?: number } = {}) => {
  const w = o.w ?? 240, h = o.h ?? 80, n = o.n ?? 40, r = rnd(o.seed ?? 3), bw = w / n;
  const bars = Array.from({ length: n }, (_, i) => { const env = Math.abs(Math.sin((i / n) * Math.PI * 2.2)) ** 1.2, v = Math.max(0.1, (env * 0.8 + 0.12) * (0.5 + r() * 0.5)); return `<rect class="fill-1 bar" x="${f(i * bw + 1)}" y="${f(h / 2 - (v * h) / 2)}" width="${f(bw - 2)}" height="${f(v * h)}" rx="${f(Math.min(3, bw / 2 - 0.5))}"/>`; }).join('');
  return wrap(x, y, w, h, bars, o);
};

/** spectrogram heat strip: cols x rows of tinted cells */
export const spectrogram = (x: number, y: number, o: GlyphOpts & { w?: number; h?: number; cols?: number; rows?: number; seed?: number } = {}) => {
  const w = o.w ?? 240, h = o.h ?? 90, C = o.cols ?? 24, R = o.rows ?? 8, r = rnd(o.seed ?? 5), cw = w / C, rh = h / R; let s = '';
  for (let c = 0; c < C; c++) for (let k = 0; k < R; k++) { const v = Math.max(0, Math.min(3, Math.round((1 - k / R) * 2.4 * (0.4 + 0.6 * Math.abs(Math.sin(c / 4))) + r() * 0.8))); s += `<rect class="heat h${v}" x="${f(c * cw)}" y="${f(k * rh)}" width="${f(cw - 1)}" height="${f(rh - 1)}" rx="2"/>`; }
  return wrap(x, y, w, h, `<rect class="eq" x="-6" y="-6" width="${w + 12}" height="${h + 12}" rx="10"/>${s}`, o);
};

/** chest outline with two lungs. 120x120 */
export const lungs = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 120, 120, `<path class="ln" d="M60 4V50M60 50Q48 62 40 66M60 50Q72 62 80 66"/><path class="fill-1" d="M54 36Q30 40 20 74Q14 104 34 112Q52 114 54 92Z"/><path class="fill-1" d="M66 36Q90 40 100 74Q106 104 86 112Q68 114 66 92Z"/>`, o);

/** speaker. 70x64 */
export const speaker = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 70, 64, `<path class="eq2" d="M2 22H20L40 6V58L20 42H2Z"/><path class="ln arrowl" d="M50 20Q60 32 50 44M58 12Q74 32 58 52"/>`, o);

/** microphone. 44x84 */
export const microphone = (x: number, y: number, o: GlyphOpts = {}) =>
  wrap(x, y, 44, 84, `<rect class="eq2" x="10" y="0" width="24" height="46" rx="12"/><path class="ln" d="M4 32Q4 58 22 58Q40 58 40 32M22 58V76M10 76H34"/>`, o);
