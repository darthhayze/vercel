// LungScope = SOUND. The audio workstation. Pure geometry and SVG for the timeline canvas.
// One layout function gives every entity (clip, lane, bin header, tray, meters) a position per scene.
// The page engine lerps between scenes as you scroll; the static frames (no JS, reduced motion) are the settled layouts.
// Clips, lanes and counts are illustrative drawings of six example subjects. The real counts come from the ledger (passed in).
import { rnd } from '../../components/stage/glyphs/core';

export const TOTAL_S = 56;                          // seconds of "story time" on the transport clock
export const WEIGHTS = [0.9, 1, 1, 1.1, 1.1, 1.7, 1, 1.2];
export const SUM = WEIGHTS.reduce((a, b) => a + b, 0);
export const CUM = WEIGHTS.map((_, k) => WEIGHTS.slice(0, k).reduce((a, b) => a + b, 0));
export const START = CUM.map((c) => c / SUM);
export const TR = 0.55;                             // share of a scene spent moving into place
export const SETTLE = 0.64;                         // where in a scene it is fully settled
export const sceneP = (k: number) => START[k] + (WEIGHTS[k] / SUM) * SETTLE;
export const N = WEIGHTS.length;

export interface Counts { recordings: string; canonical: string; eligible: string; subjects: string; train: string; val: string; test: string; overlap: string }
export interface SceneCopy { marker: string; title: string; text: string; big: string; label: string; hint: string }
export const scenes = (c: Counts): SceneCopy[] => [
  { marker: 'Corpus', title: 'Source recordings', text: 'Public SPRSound lung-sound clips arrive as one pile. Some have no known subject, and one shows up twice.', big: c.recordings, label: 'source recordings', hint: 'Scroll, or press Play, to move the playhead.' },
  { marker: 'Canonical', title: 'Canonical set', text: 'One conflicting duplicate resolves into a single record. Source aliases and annotations stay attached.', big: c.canonical, label: 'canonical recordings', hint: '' },
  { marker: 'Eligible', title: 'Eligible clips', text: 'Clips with no known subject, poor quality or auxiliary-only audio sit outside the split. The rest stay lit.', big: c.eligible, label: 'eligible recordings', hint: '' },
  { marker: 'Lanes', title: 'Subject lanes', text: 'Each remaining clip snaps onto the lane of the person it belongs to. Six lanes stand in for the known subjects.', big: c.subjects, label: 'known subjects', hint: '' },
  { marker: 'Bins', title: 'Three bins', text: 'Whole lanes go into training, validation or test. A lane never splits across bins.', big: `${c.train} · ${c.val} · ${c.test}`, label: 'subjects: train, validation, test', hint: 'Next, try to break that rule.' },
  { marker: 'Leak test', title: 'Leak test', text: 'Drag a lane onto another bin, or pick a lane and press a button. The project refuses a second bin.', big: '', label: '', hint: '' },
  { marker: 'Audit', title: 'Overlap check', text: 'The audit lane compares the bins: no shared subject IDs, no identical PCM audio. The v0.11.3 report records zero.', big: c.overlap, label: 'subjects or audio shared between splits', hint: '' },
  { marker: 'Meaning', title: 'What the counts show', text: 'The v0.11.3 report records these split-integrity counts.', big: `${c.eligible} · ${c.subjects} · ${c.overlap}`, label: 'eligible recordings, known subjects, shared', hint: '' },
];

export const BIN = [
  { id: 'train', name: 'Train', col: '#3FE6C6' },
  { id: 'val', name: 'Validation', col: '#9A7BFF' },
  { id: 'test', name: 'Test', col: '#58B4FF' },
] as const;
export const SUBJ = [
  { k: 'A', col: '#FF6B4A', bin: 0 }, { k: 'B', col: '#FF9F1C', bin: 0 }, { k: 'C', col: '#FFD23F', bin: 0 },
  { k: 'D', col: '#B8E04F', bin: 0 }, { k: 'E', col: '#FF5C8A', bin: 1 }, { k: 'F', col: '#F2D7B6', bin: 2 },
] as const;
export const SUBJECT_COLS = SUBJ.map((s) => s.col);

// ---------- clips ----------
export interface Clip { id: string; subj: number; j: number; w: number; seed: number }
const rw = rnd(41);
export const CLIPS: Clip[] = [];
for (let s = 0; s < 6; s++) for (let j = 0; j < 4; j++) CLIPS.push({ id: `c${s * 4 + j}`, subj: s, j, w: 100 + Math.floor(rw() * 32), seed: 7 + s * 13 + j * 5 });
for (let u = 0; u < 5; u++) CLIPS.push({ id: `u${u}`, subj: -1, j: u, w: 100 + Math.floor(rw() * 32), seed: 90 + u * 11 });
export const TWIN_OF = 'c9';
export const TWIN: Clip = { ...CLIPS.find((c) => c.id === TWIN_OF)!, id: 't0' };
export const CH = 46;                                // clip design height

const shuffle = <T,>(a: T[], seed: number) => { const r = rnd(seed), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [b[i], b[k]] = [b[k], b[i]]; } return b; };
export const gridOrder = shuffle(CLIPS.map((c) => c.id), 12);
export const pileOrder = shuffle(CLIPS.map((c) => c.id), 5);

const f1 = (n: number) => Math.round(n * 10) / 10;

/** A clip as a reusable symbol: subject-coloured head, waveform bars, a three-row spectrogram strip. Colours come from CSS. */
export const clipSymbol = (c: Clip, wideForm = false) => {
  const w = wideForm ? c.w * 2 : c.w, r = rnd(c.seed), n = Math.floor((w - 12) / 4), cy = 22;
  let wave = '';
  for (let i = 0; i < n; i++) {
    const env = Math.abs(Math.sin((i / n) * Math.PI * 2.1 + c.seed)) ** 1.1;
    const a = Math.max(1.6, (env * 0.78 + 0.16) * (0.55 + r() * 0.45) * 8.6);
    wave += `M${f1(7 + i * 4)} ${f1(cy - a)}V${f1(cy + a)}`;
  }
  const lv: string[] = ['', '', '', ''];
  for (let col = 0; col < n; col++) {
    const env = Math.abs(Math.sin((col / n) * Math.PI * 2.1 + c.seed)) ** 1.1;
    for (let row = 0; row < 3; row++) {
      const v = Math.max(0, Math.min(4, Math.round((1 - row / 3) * 2.3 * (0.3 + 0.9 * env) + r() * 0.9)));
      if (v > 0) lv[v - 1] += `M${f1(6 + col * 4)} ${f1(33.2 + row * 3.8)}h3`;
    }
  }
  return `<g id="ls-${c.id}${wideForm ? 'w' : ''}"><rect class="ls-cl-b" width="${w}" height="${CH}" rx="6"/>` +
    `<path class="ls-cl-h" d="M0 6a6 6 0 0 1 6-6h${w - 12}a6 6 0 0 1 6 6v4H0z"/>` +
    `<path class="ls-cl-w" d="${wave}"/>` +
    lv.map((d, i) => d ? `<path class="ls-hs ls-hs${i + 1}" d="${d}"/>` : '').join('') +
    `<rect class="ls-cl-r" x=".75" y=".75" width="${w - 1.5}" height="${CH - 1.5}" rx="5.5"/></g>`;
};
/** One hidden sprite for the whole page: every clip and the person glyph. */
export const sprite = () =>
  `<svg class="ls-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
  [...CLIPS, TWIN].map((c) => clipSymbol(c)).join('') + CLIPS.filter((c) => c.subj >= 0).map((c) => clipSymbol(c, true)).join('') +
  `<g id="ls-person"><circle cx="22" cy="14" r="12"/><path d="M2 56Q2 32 22 32Q42 32 42 56Z"/></g></defs></svg>`;

// ---------- channels ----------
export interface Ch { x: number; y: number; r: number; s: number; sx: number; o: number; lit: number; m: number }
export type State = Record<string, Ch>;
const C = (x = 0, y = 0, o = 1, e: Partial<Ch> = {}): Ch => ({ x, y, r: 0, s: 1, sx: 1, o, lit: 0, m: 0, ...e });
export const tf = (c: Ch) => `translate(${f1(c.x)} ${f1(c.y)})` + (c.r ? ` rotate(${f1(c.r)})` : '') + (c.s !== 1 || c.sx !== 1 ? ` scale(${Math.round(c.s * c.sx * 1000) / 1000} ${Math.round(c.s * 1000) / 1000})` : '');

// ---------- geometry ----------
export interface Geo {
  W: number; H: number; wide: boolean; top: number; hc: number; pad: number; x0: number; x1: number;
  laneH: number; gh: number; y3: number[]; y4: number[]; ghY: number[]; auditY: number;
  bin: { y0: number; y1: number }[]; cols: number; cellW: number; cellH: number; gx0: number; gy0: number;
  gridS: number; pileS: number; laneS: number; trayS: number; tray: { x: number; y: number; w: number; h: number };
  panel: { x: number; y: number; w: number; h: number; rowH: number; bx: number; bw: number; bh: number };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function geo(W: number, H: number): Geo {
  const wide = W >= 720;
  const top = wide ? 52 : 38;
  const hc = wide ? Math.round(clamp(W * 0.15, 150, 196)) : 58;
  const pad = wide ? 16 : 10;
  const x0 = hc + (wide ? 16 : 8), x1 = W - (wide ? 16 : 8);
  const gh = wide ? 26 : 22, gapG = wide ? 8 : 5, lg = 3;
  const avail = H - top - 6;
  const fixed = 3 * (gh + 2) + 3 * lg + 3 * gapG;
  const laneH = clamp(Math.floor((avail - fixed) / 7), 34, wide ? 84 : 60);
  const g3 = Math.min(wide ? 30 : 12, (avail - 6 * laneH) / 5);
  const y3 = Array.from({ length: 6 }, (_, i) => top + i * (laneH + g3));
  let cur = top; const ghY: number[] = [], y4: number[] = [];
  ghY[0] = cur; cur += gh + 2; for (let i = 0; i < 4; i++) { y4[i] = cur; cur += laneH + (i < 3 ? lg : 0); } cur += gapG;
  ghY[1] = cur; cur += gh + 2; y4[4] = cur; cur += laneH + gapG;
  ghY[2] = cur; cur += gh + 2; y4[5] = cur; cur += laneH + gapG;
  const auditY = cur;
  const bin = [{ y0: ghY[0], y1: y4[3] + laneH }, { y0: ghY[1], y1: y4[4] + laneH }, { y0: ghY[2], y1: y4[5] + laneH }];
  const cols = wide ? 8 : 4;
  const trayH = wide ? 74 : 62;
  const tray = { x: pad, y: H - trayH - 8, w: W - pad * 2, h: trayH };
  const gTop = top + 10, gBot = tray.y - (wide ? 26 : 22), rows = Math.ceil(29 / cols);
  const cellW = (W - pad * 2) / cols, cellH = Math.min(wide ? 98 : 70, (gBot - gTop) / rows);
  const gy0 = gTop + ((gBot - gTop) - cellH * rows) / 2 + cellH / 2, gx0 = pad + cellW / 2;
  const gridS = clamp(Math.min((cellW - 8) / 132, (cellH - 16) / CH), 0.42, 1.2);
  const laneS = Math.min(1.25, (laneH - 10) / CH);
  const pw = clamp(W - 40, 280, 1100), px = (W - pw) / 2, rowH = wide ? clamp((H - top - 64) / 5, 58, 92) : 58, ph = rowH * 5 + 28, bh = wide ? Math.round(clamp(rowH * 0.42, 24, 36)) : 24;
  const py = top + Math.max(6, (H - top - ph) / 2 - 6);
  const lw = wide ? 232 : 0;
  const panel = { x: px, y: py, w: pw, h: ph, rowH, bh, bx: wide ? px + 20 + lw : px + 14, bw: wide ? pw - 40 - lw - 96 : pw - 28 - 56 };
  return { W, H, wide, top, hc, pad, x0, x1, laneH, gh, y3, y4, ghY, auditY, bin, cols, cellW, cellH, gx0, gy0, gridS, pileS: gridS * 1.14, laneS, trayS: gridS * 0.82, tray, panel };
}

const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
/** stagger: 0..0.6 of the transition */
export const delay = (id: string) => {
  if (id.startsWith('lane') || id.startsWith('st')) return 0.01 * Number(id.replace(/\D/g, '') || 0);
  if (id.startsWith('m') && id !== 'mlab') return 0.38;
  if (/^(gh|z|dup|tray|audit|au|panel|mlab|t0)/.test(id)) return 0;
  return (hash(id) % 100) / 100 * 0.38;
};

export const laneClip = (g: Geo, c: Clip) => {
  const L = g.x1 - g.x0, r = rnd(c.subj * 17 + 5);
  const starts = [0.005, 0.255, 0.5, 0.745], wf = [0.225, 0.215, 0.2, 0.225];
  const st = starts[c.j] + (r() - 0.5) * 0.03, ww = wf[c.j] + (r() - 0.5) * 0.03;
  const w = ww * L;
  return { cx: g.x0 + st * L + w / 2, sx: w / (c.w * g.laneS) };
};

export function states(g: Geo): State[] {
  const S: State[] = Array.from({ length: N }, () => ({}));
  const rp = rnd(77);
  const gi = (id: string) => gridOrder.indexOf(id);
  const gridPos = (id: string) => { const i = gi(id); return { x: g.gx0 + (i % g.cols) * g.cellW, y: g.gy0 + Math.floor(i / g.cols) * g.cellH }; };
  const pcols = g.cols, prows = Math.ceil(30 / pcols), pcw = (g.W - 2 * g.pad) / pcols, pch = (g.H - g.top - 14) / prows;
  const pilePos = (id: string) => {
    const i = pileOrder.indexOf(id);
    return { x: g.pad + pcw / 2 + (i % pcols) * pcw + (rp() - 0.5) * pcw * 0.5, y: g.top + 4 + pch / 2 + Math.floor(i / pcols) * pch + (rp() - 0.5) * pch * 0.4, r: (rp() - 0.5) * 24 };
  };
  const trayPos = (c: Clip) => {
    const x0 = g.tray.x + (g.wide ? 200 : 28), x1 = g.tray.x + g.tray.w - (g.wide ? 70 : 34);
    return { x: x0 + (c.j / 4) * (x1 - x0), y: g.tray.y + (g.wide ? g.tray.h / 2 : g.tray.h - 22) };
  };
  const dimLast = 0;
  for (const c of CLIPS) {
    const pp = pilePos(c.id), gp = gridPos(c.id);
    S[0][c.id] = C(pp.x, pp.y, 1, { r: pp.r, s: g.pileS });
    S[1][c.id] = C(gp.x, gp.y, 1, { s: g.gridS });
    if (c.subj >= 0) {
      S[2][c.id] = C(gp.x, gp.y, 1, { s: g.gridS, lit: 1 });
      const lc = laneClip(g, c);
      for (const k of [3, 4, 5, 6]) S[k][c.id] = C(lc.cx, (k === 3 ? g.y3[c.subj] : g.y4[c.subj]) + g.laneH / 2, 1, { s: g.laneS, sx: lc.sx, m: g.wide ? 1 : 0 });
      S[7][c.id] = { ...S[4][c.id], o: 0 };
    } else {
      const tp = trayPos(c);
      S[2][c.id] = C(tp.x, tp.y, 0.9, { s: g.trayS });
      for (const k of [3, 4, 5, 6, 7]) S[k][c.id] = C(tp.x, tp.y + 14, 0, { s: g.trayS });
    }
  }
  const tp = pilePos(TWIN_OF), tg = gridPos(TWIN_OF);
  // the twin sits just off its original in the pile, then slides onto it and fades
  const op = S[0][TWIN_OF];
  S[0]['t0'] = C(op.x + (g.wide ? 30 : 16), op.y + (g.wide ? 17 : 11), 1, { r: op.r + 9, s: g.pileS });
  for (let k = 1; k < N; k++) S[k]['t0'] = C(tg.x, tg.y, 0, { s: g.gridS });
  void tp;
  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < N; k++) {
      const isBins = k >= 4, vis = k >= 3;
      const y = isBins ? g.y4[i] : g.y3[i];
      const o = k === 7 ? dimLast : vis ? 1 : 0;
      S[k][`lane${i}`] = C(0, y, o);
      S[k][`st${i}`] = C(0, y, k >= 4 ? (k === 7 ? dimLast : 1) : 0);
    }
  }
  for (let b = 0; b < 3; b++) for (let k = 0; k < N; k++) {
    const on = k >= 4;
    S[k][`gh${b}`] = C(0, g.ghY[b] + (on ? 0 : -10), k === 7 ? dimLast : on ? 1 : 0);
    S[k][`z${b}`] = C(0, g.ghY[b], k >= 4 && k <= 6 ? 1 : 0);
  }
  for (let k = 0; k < N; k++) {
    S[k]['tray'] = C(0, 0, k === 2 ? 1 : 0);
    S[k]['dup'] = C(gridPos(TWIN_OF).x, gridPos(TWIN_OF).y - g.gridS * CH / 2 - (g.wide ? 17 : 15), k === 1 ? 1 : 0);
    S[k]['audit'] = C(0, g.auditY, k === 6 ? 1 : k === 7 ? dimLast : k >= 4 ? 0.45 : 0);
    S[k]['au0'] = C(g.x0, g.auditY, k === 6 ? 1 : 0);
    S[k]['au1'] = C(g.x0 + (g.x1 - g.x0) / 2, g.auditY, k === 6 ? 1 : 0);
    S[k]['panel'] = C(0, 0, k === 7 ? 1 : 0);
    S[k]['mlab'] = C(0, 0, k === 7 ? 1 : 0);
  }
  const pn = g.panel, fills = [1, 6566 / 6567, 5881 / 6567, 1, 0];
  for (let m = 0; m < 5; m++) for (let k = 0; k < N; k++) {
    const by = pn.y + 22 + m * pn.rowH + (g.wide ? pn.rowH / 2 - pn.bh / 2 : 26);
    S[k][`m${m}`] = C(pn.bx, by, k === 7 ? 1 : 0, { sx: k === 7 ? fills[m] : 0 });
  }
  return S;
}

// ---------- svg ----------
const ent = (id: string, c: Ch, inner: string, attrs = '') => `<g data-e="${id}" transform="${tf(c)}"${c.o !== 1 ? ` opacity="${Math.round(c.o * 100) / 100}"` : ''}${c.o < 0.02 ? ' visibility="hidden"' : ''}${attrs}>${inner}</g>`;

const rulerSvg = (g: Geo, markers: string[]) => {
  const L = g.x1 - g.x0;
  let ticks = '', labels = '';
  for (let t = 0; t <= TOTAL_S; t += 2) {
    const x = f1(g.x0 + (t / TOTAL_S) * L), major = t % 8 === 0;
    ticks += g.wide ? `M${x} ${major ? 17 : 22}V28` : `M${x} ${major ? 12 : 16}V22`;
    if (major && g.wide && t < TOTAL_S) labels += `<text class="ls-tl" x="${x + (t === 0 ? 14 : 4)}" y="13">0:${String(t).padStart(2, '0')}</text>`;
  }
  const flags = START.map((s, k) => {
    const x = f1(g.x0 + s * L);
    const label = g.wide && g.W >= 1000 ? `<text class="ls-mkt" x="${x + 9}" y="${g.top - 8}">${markers[k]}</text>` : '';
    return `<g class="ls-mk" data-k="${k}"><path d="M${x} ${g.wide ? 27 : 20}V${g.wide ? g.top - 4 : 32}l8 4.5l-8 4.5" class="ls-mkf"/>${label}</g>`;
  }).join('');
  const lung = g.wide ? `<g transform="translate(14 6) scale(.2)" class="ls-lung"><path d="M54 36Q30 40 20 74Q14 104 34 112Q52 114 54 92Z"/><path d="M66 36Q90 40 100 74Q106 104 86 112Q68 114 66 92Z"/><path class="ls-lung-l" d="M60 4V50M60 50Q48 62 40 66M60 50Q72 62 80 66"/></g><text class="ls-tn" x="46" y="22">LungScope</text>` : '';
  return `<g class="ls-ruler" aria-hidden="true" data-decor><rect class="ls-ruler-bg" x="0" y="0" width="${g.W}" height="${g.top - 2}"/><rect class="ls-ruler-hd" x="0" y="0" width="${g.hc}" height="${g.top - 2}"/>${lung}<path class="ls-tk" d="${ticks}"/>${labels}${flags}</g>`;
};

const personSvg = (g: Geo, i: number) => {
  const sc = g.wide ? 0.5 : 0.42, h = 56 * sc;
  return `<use href="#ls-person" class="ls-ps s${i}" transform="translate(${g.wide ? 14 : 8} ${f1((g.laneH - h) / 2)}) scale(${sc})"/>`;
};
const laneSvg = (g: Geo, i: number) => {
  const s = SUBJ[i], mid = g.laneH / 2;
  const txt = g.wide
    ? `<text class="ls-ln" x="46" y="${f1(mid - 2)}">Subject ${s.k}</text>`
    : `<text class="ls-ln" x="33" y="${f1(mid + 4.5)}">${s.k}</text>`;
  return `<g class="ls-lane" data-lane="${i}" role="button" tabindex="-1" aria-label="Subject ${s.k}, ${BIN[s.bin].name} bin">` +
    `<rect class="ls-lane-bg alt${i % 2}" x="0" y="0" width="${g.W}" height="${g.laneH}"/><rect class="ls-lane-hd" x="0" y="0" width="${g.hc}" height="${g.laneH}"/>` +
    personSvg(g, i) + txt + `<rect class="ls-lane-ring" x="1.5" y="1.5" width="${g.W - 3}" height="${g.laneH - 3}" rx="5"/></g>`;
};
const stripeSvg = (g: Geo, i: number) => {
  const s = SUBJ[i], b = BIN[s.bin];
  return `<rect class="ls-stripe bin${s.bin}" x="0" y="0" width="5" height="${g.laneH}"/>` +
    (g.wide ? `<text class="ls-lb bin${s.bin}t" x="46" y="${f1(g.laneH / 2 + 14)}">${b.name}</text>` : '');
};
const ghSvg = (g: Geo, b: number, n: string) => {
  const chipW = g.wide ? 92 : 70, chipX = g.W - chipW - 12;
  const label = g.wide
    ? `<text class="ls-ghn bin${b}t" x="16" y="${g.gh / 2 + 4.5}">${BIN[b].name}</text><text class="ls-ghc" x="${g.hc + 16}" y="${g.gh / 2 + 4.5}">${n} subjects</text>`
    : `<text class="ls-ghn bin${b}t" x="12" y="${g.gh / 2 + 4.5}">${BIN[b].name}<tspan class="ls-ghc" dx="10">${n} subjects</tspan></text>`;
  return `<rect class="ls-gh-bg bin${b}" x="0" y="0" width="${g.W}" height="${g.gh}"/><rect class="ls-stripe bin${b}" x="0" y="0" width="5" height="${g.gh}"/>` + label +
    `<g class="ls-lock"><rect x="${chipX}" y="3" width="${chipW}" height="${g.gh - 6}" rx="${(g.gh - 6) / 2}"/><text x="${chipX + chipW / 2}" y="${g.gh / 2 + 4}" text-anchor="middle">Refused</text></g>`;
};
const ringsSvg = (g: Geo, label: string, val: string) => {
  const r = g.wide ? 9 : 5, step = g.wide ? 25 : 13, cy = g.laneH / 2, x = r + 2;
  const ring = (i: number) => `<circle class="ls-rg bin${i}" cx="${x + i * step}" cy="${cy}" r="${r}"/>`;
  const tx = x + 2 * step + r + (g.wide ? 16 : 8);
  return ring(0) + ring(1) + ring(2) + `<text class="ls-au" x="${tx}" y="${cy + 4.5}">${label} <tspan class="ls-au0">${val}</tspan></text>`;
};
export interface Opts { counts: Counts; phx?: number; skipHidden?: boolean; interactive?: boolean; label?: string }
export function svg(g: Geo, st: State, o: Opts) {
  const sc = scenes(o.counts), pn = g.panel, cn = o.counts;
  const vis = (id: string) => !o.skipHidden || (st[id]?.o ?? 0) > 0.01;
  const E = (id: string, inner: string, attrs = '') => vis(id) ? ent(id, st[id], inner, attrs) : '';
  const lanes = SUBJ.map((_, i) => E(`lane${i}`, laneSvg(g, i))).join('');
  const stripes = SUBJ.map((_, i) => E(`st${i}`, stripeSvg(g, i))).join('');
  const ghs = [cn.train, cn.val, cn.test].map((n, b) => E(`gh${b}`, ghSvg(g, b, n), ` class="ls-gh" data-gh="${b}"`)).join('');
  const zones = [0, 1, 2].map((b) => E(`z${b}`, `<rect class="ls-zone bin${b}" x="3" y="0" width="${g.W - 6}" height="${g.bin[b].y1 - g.bin[b].y0}" rx="6"/>`, ` class="ls-z" data-z="${b}"`)).join('');
  const tray = E('tray', `<rect class="ls-tray" x="${g.tray.x}" y="${g.tray.y}" width="${g.tray.w}" height="${g.tray.h}" rx="10"/><text class="ls-trl" x="${g.tray.x + 14}" y="${g.tray.y + (g.wide ? 28 : 20)}">Outside the split</text>`);
  const clipUse = (c: Clip, twin = false) => {
    const cls = `${c.subj < 0 ? 'sx' : 's' + c.subj}${twin ? ' tw' : ''}${st[c.id].lit > 0.5 ? ' lit' : ''}`, m = st[c.id].m;
    return E(c.id, `<use href="#ls-${c.id}" class="${cls}" x="${-c.w / 2}" y="${-CH / 2}"${m ? ` opacity="${1 - m}"` : ''}/>` +
      (c.subj >= 0 && !twin ? `<use href="#ls-${c.id}w" class="${cls}" transform="translate(${-c.w / 2} ${-CH / 2}) scale(.5 1)" opacity="${m}"/>` : ''));
  };
  const clips = CLIPS.map((c) => clipUse(c)).join('') + clipUse(TWIN, true);
  const dupW = g.wide ? 118 : 62;
  const dup = E('dup', `<rect class="ls-dup" x="${-dupW / 2}" y="-10" width="${dupW}" height="20" rx="10"/><text class="ls-dupt" x="0" y="4" text-anchor="middle">${g.wide ? 'Duplicate merged' : 'Merged'}</text>`);
  const audit = E('audit', `<rect class="ls-lane-bg alt1" x="0" y="0" width="${g.W}" height="${g.laneH}"/><rect class="ls-lane-hd" x="0" y="0" width="${g.hc}" height="${g.laneH}"/>` +
    `<path class="ls-ck" d="M${g.wide ? 16 : 22} ${g.laneH / 2}l5 5l9 -10"/>${g.wide ? `<text class="ls-ln" x="46" y="${g.laneH / 2 + 4.5}">Overlap check</text>` : ''}`);
  const au0 = E('au0', ringsSvg(g, g.wide ? 'Subject IDs shared' : 'IDs', cn.overlap));
  const au1 = E('au1', ringsSvg(g, g.wide ? 'Identical PCM audio shared' : 'Audio', cn.overlap));
  // meter bridge
  const rowY = (m: number) => pn.y + 22 + m * pn.rowH;
  const labels = ['Source recordings', 'Canonical recordings', 'Eligible recordings', 'Known subjects by split', 'Shared between splits'];
  const vals = [cn.recordings, cn.canonical, cn.eligible, cn.subjects, cn.overlap];
  const panelRows = labels.map((l, m) => {
    const y = rowY(m), by = g.wide ? y + pn.rowH / 2 - pn.bh / 2 : y + 26;
    const lab = g.wide ? `<text class="ls-ml" x="${pn.x + 20}" y="${by + pn.bh / 2 + 5}">${l}</text>` : `<text class="ls-ml" x="${pn.x + 14}" y="${y + 17}">${l}</text>`;
    const bx = pn.bx, bw = pn.bw;
    return lab + `<rect class="ls-mt" x="${bx}" y="${by}" width="${bw}" height="${pn.bh}" rx="3"/>` +
      `<text class="ls-mv" x="${bx + bw + 12}" y="${by + pn.bh / 2 + 5.5}">${vals[m]}</text>`;
  }).join('');
  const panel = E('panel', `<rect class="ls-panel" x="${pn.x}" y="${pn.y}" width="${pn.w}" height="${pn.h}" rx="12"/>${panelRows}`);
  const bw = pn.bw, tot = [cn.train, cn.val, cn.test].map((s) => Number(s));
  const sum = tot[0] + tot[1] + tot[2];
  const barRect = (m: number) => {
    if (m === 3) { let x = 0; return tot.map((t, b) => { const w = (t / sum) * bw, r = `<rect class="ls-mf bin${b}f" x="${f1(x)}" y="0" width="${f1(w)}" height="${pn.bh}"/>`; x += w; return r; }).join(''); }
    if (m === 4) return '';
    return `<rect class="ls-mf bin0f" x="0" y="0" width="${bw}" height="${pn.bh}"/>`;
  };
  const bars = [0, 1, 2, 3, 4].map((m) => E(`m${m}`, barRect(m) + (m < 3 ? `<path class="ls-mgap" stroke-width="${pn.bh}" d="M0 ${pn.bh / 2}h${bw}"/>` : ''))).join('');
  const by3 = g.wide ? rowY(3) + pn.rowH / 2 - pn.bh / 2 : rowY(3) + 26;
  let lx = 0;
  const mlab = E('mlab', tot.map((t, b) => { const w = (t / sum) * bw, x = pn.bx + lx + w / 2; lx += w; return `<text class="ls-mseg-t" x="${f1(x)}" y="${by3 + pn.bh / 2 + 4.5}" text-anchor="middle">${g.wide && w >= 104 ? BIN[b].name + ' ' + t : t}</text>`; }).join(''));
  const ph = o.phx ?? g.x0;
  const playhead = `<g class="ls-ph" data-ph transform="translate(${f1(ph)} 0)" aria-hidden="true" data-decor><path class="ls-ph-h" d="M-7 2h14v8l-7 7l-7-7z"/><path class="ls-ph-l" d="M0 17V${g.H}"/></g>`;
  return `<svg class="ls-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.W} ${g.H}" width="${g.W}" height="${g.H}" data-w="${g.W}" data-h="${g.H}"${o.interactive ? ' role="group"' : ' role="img"'} aria-label="${o.label ?? 'Audio workstation timeline'}">` +
    `<rect class="ls-bg" width="${g.W}" height="${g.H}" rx="12"/>` + rulerSvg(g, sc.map((s) => s.marker)) +
    lanes + stripes + zones + ghs + tray + clips + dup + audit + au0 + au1 + panel + bars + mlab + playhead + `</svg>`;
}

export const playheadX = (g: Geo, p: number) => g.x0 + p * (g.x1 - g.x0);
export const FLAT_WIDE = { W: 1040, H: 540 };
export const FLAT_NARROW = { W: 340, H: 500 };
export function flatFrame(k: number, wide: boolean, counts: Counts, label: string) {
  const g = geo(wide ? FLAT_WIDE.W : FLAT_NARROW.W, wide ? FLAT_WIDE.H : FLAT_NARROW.H);
  const st = states(g)[k];
  return svg(g, st, { counts, phx: playheadX(g, sceneP(k)), skipHidden: true, interactive: k === 5, label });
}
export const SCENE_DESC = [
  'Twenty-nine audio clips, each with a waveform and a spectrogram strip, lie in a loose pile. Each carries a subject colour; five are grey with no known subject.',
  'The duplicate clip slides onto its original and disappears. The clips line up in a grid.',
  'Five grey clips with no known subject move into a tray labelled outside the split. The other clips keep a teal outline.',
  'Each coloured clip sits on the lane of its subject. Six lanes, one per person.',
  'The lanes sit in three groups: four in train, one in validation, one in test.',
  'The same lanes, ready for the leak test: assigning a subject to a second bin is refused.',
  'An audit lane shows three separate bin rings twice, once for subject IDs and once for identical audio, with zero shared in both.',
  'Level meters show the counts: source, canonical and eligible recordings, known subjects split by bin, and zero shared.',
];

// ---------- hero art: one long breath as a spectrogram, a waveform and a row of clips ----------
export function heroArt() {
  const W = 640, H = 300, r = rnd(23), cols = 64, rows = 13, cw = (W - 40) / cols, rh = 7.2;
  const lv: string[] = ['', '', '', '', ''];
  for (let c = 0; c < cols; c++) {
    const cyc = (c / cols) * Math.PI * 2 * 2;
    const env = Math.max(0, Math.sin(cyc)) ** 1.3 * 0.9 + 0.08;
    for (let k = 0; k < rows; k++) {
      const band = (1 - k / rows);
      const v = Math.max(0, Math.min(5, Math.round(env * band * 5.6 * (0.55 + r() * 0.7) + (r() - 0.55) * 0.9)));
      if (v > 0) lv[v - 1] += `M${f1(20 + c * cw)} ${f1(150 + k * rh + rh / 2)}h${f1(cw - 1.2)}`;
    }
  }
  let wave = '';
  for (let c = 0; c < 128; c++) {
    const x = 20 + c * ((W - 40) / 128), env = Math.max(0, Math.sin((c / 128) * Math.PI * 4)) ** 1.3 * 0.9 + 0.08;
    const a = Math.max(1.5, env * (0.45 + r() * 0.55) * 40);
    wave += `M${f1(x)} ${f1(64 - a)}V${f1(64 + a)}`;
  }
  let ticks = '';
  for (let i = 0; i <= 32; i++) ticks += `M${f1(20 + (i / 32) * (W - 40))} ${i % 4 ? 16 : 10}V22`;
  const clipsRow = [0, 1, 2, 3, 4, 5].map((i) => {
    const xs = [20, 132, 268, 368, 470, 560], ws = [100, 126, 88, 92, 80, 60];
    return `<rect class="ls-hr-c s${i}c" x="${xs[i]}" y="258" width="${ws[i]}" height="24" rx="5"/>`;
  }).join('');
  return `<svg class="ls-hero-art" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" data-decor>` +
    `<rect class="ls-bg" width="${W}" height="${H}" rx="14"/><path class="ls-tk" d="${ticks}"/>` +
    `<path class="ls-hr-w" d="${wave}"/>` +
    [1, 2, 3, 4, 5].map((i) => `<path class="ls-hs ls-hs${i}" d="${lv[i - 1]}"/>`).join('') +
    clipsRow + `<path class="ls-ph-l" d="M${W * 0.46} 10V${H - 10}"/><path class="ls-ph-h" transform="translate(${W * 0.46} 2)" d="M-7 0h14v8l-7 7l-7-7z"/></svg>`;
}

/** the clip inspector in the info band: one drawn breath, waveform over spectrogram. Synthetic. */
export function inspectorArt() {
  const W = 240, H = 84, r = rnd(31), cols = 40, rows = 5, cw = (W - 16) / cols, rh = 6.4;
  const lv: string[] = ['', '', '', '', ''];
  for (let c = 0; c < cols; c++) {
    const env = Math.max(0, Math.sin((c / cols) * Math.PI * 2)) ** 1.3 * 0.9 + 0.1;
    for (let k = 0; k < rows; k++) {
      const v = Math.max(0, Math.min(5, Math.round(env * (1 - k / rows) * 5.8 * (0.55 + r() * 0.7) + (r() - 0.55) * 0.9)));
      if (v > 0) lv[v - 1] += `M${f1(8 + c * cw)} ${f1(50 + k * rh + rh / 2)}h${f1(cw - 1)}`;
    }
  }
  let wave = '';
  for (let c = 0; c < 60; c++) {
    const env = Math.max(0, Math.sin((c / 60) * Math.PI * 2)) ** 1.3 * 0.9 + 0.1, a = Math.max(1.2, env * (0.5 + r() * 0.5) * 20);
    wave += `M${f1(8 + c * ((W - 16) / 60))} ${f1(25 - a)}V${f1(25 + a)}`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" data-decor><rect class="ls-bg" width="${W}" height="${H}" rx="8"/><path class="ls-hr-w" d="${wave}"/>` +
    [1, 2, 3, 4, 5].map((i) => `<path class="ls-hs ls-hs${i}" d="${lv[i - 1]}"/>`).join('') + `<path class="ls-insp-ph ls-ph-l" d="M8 6V78"/></svg>`;
}
