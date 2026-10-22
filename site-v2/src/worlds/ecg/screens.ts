// What the scope screen shows at each probe point. Every function is pure: (node, time, options) -> SVG markup for an 800x480 screen (a 10 by 8 graticule).
// The graticule is static markup (GRATICULE); the traces are redrawn each frame by the client and drawn once, in their final frame,
// at build time and for reduced motion. Colour meaning (classes in ecg.css): tr = the signal, ghost = an earlier or other copy,
// amb = threshold and flags, bar = bytes. All values are synthetic.
import { count, periodic, raw, SAMPLES, detect, DUR, f1 } from './signal';

export const W = 800, H = 480;
/** fs: the SVG label size in user units (the client raises it on narrow screens so labels stay readable) */
export interface Opts { thr: number; still: boolean; fs?: number }
export const STILL_T = 2.9;

const Yc = (v: number) => f1(440 - (v - 300) * 1.12);
const tau = (x: number) => (x / W) * DUR;
const P = (x0: number, x1: number, fy: (x: number) => number, step = 4) => {
  let d = '';
  for (let x = x0; x <= x1 + 0.01; x += step) d += `${d ? 'L' : 'M'}${f1(x)} ${f1(fy(x))}`;
  return d;
};
const tx = (x: number, y: number, s: string, c = 'lb', a?: string) => `<text class="${c}" x="${f1(x)}" y="${f1(y)}"${a ? ` text-anchor="${a}"` : ''}>${s}</text>`;
const path = (d: string, c: string) => (d ? `<path class="${c}" d="${d}"/>` : '');

export const GRATICULE = (() => {
  let s = '';
  for (let i = 1; i < 10; i++) s += `<line class="gr${i === 5 ? ' gr-c' : ''}" x1="${i * 80}" y1="0" x2="${i * 80}" y2="${H}"/>`;
  for (let j = 1; j < 8; j++) s += `<line class="gr${j === 4 ? ' gr-c' : ''}" x1="0" y1="${j * 60}" x2="${W}" y2="${j * 60}"/>`;
  // minor ticks on the centre axes
  for (let i = 1; i < 50; i++) if (i % 5) s += `<line class="gr-t" x1="${i * 16}" y1="235" x2="${i * 16}" y2="245"/>`;
  for (let j = 1; j < 40; j++) if (j % 5) s += `<line class="gr-t" x1="395" y1="${j * 12}" x2="405" y2="${j * 12}"/>`;
  return s;
})();

/** shared sweep: bright up to the head, a dimmer older sweep after the erase bar */
function sweep(fy: (x: number) => number, t: number, still: boolean, cls = 'tr', ghost = 'ghost') {
  const hx = still ? W : ((t % DUR) / DUR) * W;
  const bright = path(P(0, hx, fy), cls);
  const old = still ? '' : path(P(Math.min(W, hx + 26), W, fy), ghost);
  const dot = still ? '' : `<circle class="hd" cx="${f1(hx)}" cy="${f1(fy(hx))}" r="6"/>`;
  return { hx, svg: old + bright + dot };
}

/* 0. electrodes: the raw signal, weak and noisy */
function skin(t: number, o: Opts) {
  const n = Math.floor(t / DUR);
  const fy = (x: number) => 240 - (raw(tau(x)) + 2.5 * Math.sin(x * 0.93 + n * 2.3) + 1.8 * Math.sin(x * 0.37 + n * 5.1) + 1.2 * Math.sin(x * 2.1 + n * 1.3)) * 2.5;
  return `<line class="base" x1="0" y1="240" x2="${W}" y2="240"/>${sweep(fy, t, o.still, 'tr thin').svg}${tx(40, 456, 'RAW SIGNAL', 'lb tag')}`;
}

/* 1. the board: amplified and filtered, with the raw input as a dim ghost */
function board(t: number, o: Opts) {
  const rawY = (x: number) => 240 - raw(tau(x)) * 2.5;
  const hx = o.still ? W : ((t % DUR) / DUR) * W;
  const inn = path(P(0, hx, rawY, 5), 'in');
  const out = sweep((x) => Yc(periodic(tau(x))), t, o.still);
  return `${inn}${out.svg}${tx(40, 456, 'BOARD OUT', 'lb tag')}${tx(760, 456, 'dim: raw in', 'lb tag', 'end')}`;
}

/* 2. pin A1: the same voltage as a count, with a gauge from 0 to 1023 */
function pin(t: number, o: Opts) {
  const GX = 742, G0 = 440, G1 = 70;
  const fy = (x: number) => Yc(periodic(tau(x)));
  const s = sweep(fy, t, o.still);
  const hx = s.hx;
  const v = periodic(tau(Math.min(hx, W - 0.01)));
  const gy = f1(G0 - (v / 1023) * (G0 - G1));
  const cy = f1(fy(hx - (o.still ? 0.01 : 0)));
  const hit = o.still ? '' : `<line class="amb-d" x1="${f1(hx)}" y1="${cy}" x2="${GX - 12}" y2="${cy}"/>`;
  const bars = `<rect class="gauge" x="${GX - 12}" y="${G1}" width="24" height="${G0 - G1}" rx="4"/><rect class="gfill" x="${GX - 12}" y="${gy}" width="24" height="${f1(G0 - +gy)}" rx="4"/>`;
  return `${s.svg}${hit}${bars}${tx(GX - 24, G1 + 8, '1023', 'lb', 'end')}${tx(GX - 24, G0 + 2, '0', 'lb', 'end')}${tx(40, 456, 'PIN A1 COUNTS', 'lb tag')}`;
}

/* 3. the loop: zoom to one heartbeat; each dot is one pass of loop() */
const Z0 = 0.49, ZN = 12, ZX0 = 40, ZDX = 60;
const zt = (k: number) => Z0 + k * 0.01;
const Yl = (v: number) => f1(330 - (v - 350) * 0.95);
export function loopReading(t: number, still: boolean) {
  const k = still ? ZN : Math.min(ZN, Math.floor(((t % 2.8) / 2.0) * (ZN + 1)));
  return Math.round(count(zt(k)));
}
function loop(t: number, o: Opts) {
  const cyc = t % 2.8;
  const n = o.still ? ZN + 1 : Math.min(ZN + 1, Math.floor((cyc / 2.0) * (ZN + 1)) + 1);
  const pts = Array.from({ length: ZN + 1 }, (_, k) => ({ x: ZX0 + k * ZDX, y: Yl(count(zt(k))) }));
  const ghost = path(P(ZX0, ZX0 + ZN * ZDX, (x) => Yl(count(Z0 + ((x - ZX0) / ZDX) * 0.01)), 4), 'ghost');
  let st = '';
  for (let k = 0; k < n; k++) {
    st += `${k ? `L${pts[k].x} ${pts[k - 1].y}` : `M${pts[0].x} ${pts[0].y}`}L${pts[k].x} ${pts[k].y}`;
  }
  if (n <= ZN) st += `L${pts[n - 1].x + ZDX} ${pts[n - 1].y}`;
  const stems = pts.slice(0, n).map((p) => `<line class="stem" x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="352"/><circle class="smp" cx="${p.x}" cy="${p.y}" r="7"/>`).join('');
  const AX = `<line class="axis" x1="24" y1="352" x2="776" y2="352"/>${pts.map((p, k) => `<line class="axis" x1="${p.x}" y1="348" x2="${p.x}" y2="${k % 2 ? 356 : 360}"/>`).join('')}`;
  const b0 = pts[4].x, b1 = pts[5].x;
  const brk = `<path class="brk" d="M${b0} 362V372H${b1}V362"/>${tx((b0 + b1) / 2, 402, '10 ms', 'lb amb-t', 'middle')}`;
  // loop phases: analogRead, println, delay(10); the active one follows the dot that was just placed
  const ph = o.still ? 2 : Math.floor(((cyc / 2.0) * (ZN + 1) * 3) % 3);
  const fs = o.fs ?? 16, bh = Math.round(fs * 1.6);
  let px = 40;
  const cell = (i: number, label: string) => { const w = Math.round(label.length * fs * 0.62 + 28), x = px; px += w + 12; return `<rect class="ph${ph === i ? ' on' : ''}" x="${x}" y="${470 - bh}" width="${w}" height="${bh}" rx="6"/>${tx(x + w / 2, 470 - bh / 2 + fs * 0.35, label, 'lb ph-t', 'middle')}`; };
  const phases = cell(0, 'analogRead') + cell(1, 'println') + cell(2, 'delay(10)');
  return `${ghost}${path(st, 'tr step')}${stems}${AX}${brk}${phases}${tx(40, 48, '0 ms', 'lb tag')}${tx(760, 48, '120 ms', 'lb tag', 'end')}`;
}

/* 4. serial: bytes as bars, moving from the Arduino toward Processing; each reading reads left to right as sent: digits, CR, LF */
const CELL = 52, GW = CELL * 5, SPEED = 110;
const reading = (r: number) => String(SAMPLES[(46 + r) % SAMPLES.length]).padStart(3, '0');
export function serialLine(t: number) {
  const r = Math.max(0, Math.floor((t * SPEED) / GW) - 1);
  return String(+reading(r)) + '↵';
}
function serial(t: number, o: Opts) {
  const T = o.still ? 6.9 : t;
  const BY = 330;
  let cells = '', groups = '';
  const rMin = Math.max(0, Math.floor((T * SPEED - W) / GW) - 1), rMax = Math.ceil((T * SPEED) / GW);
  for (let r = rMin; r <= rMax; r++) {
    const x0 = T * SPEED - (r + 1) * GW;
    if (x0 > W || x0 + GW < 0) continue;
    const s = reading(r);
    for (let p = 0; p < 5; p++) {
      const ch = p < 3 ? s[p] : p === 3 ? 'CR' : 'LF', code = p < 3 ? s.charCodeAt(p) : p === 3 ? 13 : 10;
      const x = x0 + p * CELL, h = f1(code * 3.3);
      cells += `<rect class="bar${code < 20 ? ' ctl' : ''}" x="${f1(x + 5)}" y="${f1(BY - h)}" width="${CELL - 10}" height="${h}" rx="3"/>${x + CELL / 2 > 22 && x + CELL / 2 < W - 22 ? tx(x + CELL / 2, BY + 30, ch, 'lb bar-t', 'middle') : ''}`;
    }
    groups += `<path class="brk" d="M${f1(x0 + 5)} ${BY + 52}V${BY + 62}H${f1(x0 + GW - 5)}V${BY + 52}"/>${x0 + GW / 2 > 44 && x0 + GW / 2 < W - 44 ? tx(x0 + GW / 2, BY + 92, String(+s), 'lb amb-t', 'middle') : ''}`;
  }
  const wire = `<line class="axis" x1="0" y1="${BY}" x2="${W}" y2="${BY}"/>`;
  return `${wire}${cells}${groups}${tx(40, 48, 'ARDUINO', 'lb tag')}${tx(760, 48, 'PROCESSING', 'lb tag', 'end')}<path class="arw" d="M260 40H460M448 30L460 40L448 50"/>`;
}

/* 5. the Processing window: a trace sweeping right, an erase bar ahead of it, a side panel */
const PW = { x: 24, y: 24, w: 752, h: 432 };
const Yp = (v: number) => f1(432 - (v - 300) * 1.1);
export function monitorRaw(t: number, still: boolean) {
  const h = still ? 0.97 : (t % DUR) / DUR;
  return Math.round(periodic(h * DUR));
}
function monitor(t: number, o: Opts) {
  const fs = o.fs ?? 16, tw = fs > 24 ? 430 : 480;
  const fy = (x: number) => Yp(periodic(((x - PW.x) / tw) * DUR));
  const h = o.still ? 1 : (t % DUR) / DUR;
  const hx = PW.x + h * tw;
  const bright = path(P(PW.x, hx, fy), 'tr');
  const old = o.still ? '' : path(P(Math.min(PW.x + tw, hx + 24), PW.x + tw, fy), 'ghost');
  const bar = o.still ? '' : `<rect class="erase" x="${f1(hx)}" y="${PW.y + 2}" width="24" height="${PW.h - 4}"/>`;
  const dot = o.still ? '' : `<circle class="hd" cx="${f1(hx)}" cy="${f1(fy(hx))}" r="6"/>`;
  const px = PW.x + tw, two = fs > 32;
  const rawV = Math.round(periodic(h * DUR));
  const panel = `<rect class="pnl" x="${px}" y="${PW.y}" width="${PW.w - tw}" height="${PW.h}"/><line class="pnl-l" x1="${px}" y1="${PW.y}" x2="${px}" y2="${PW.y + PW.h}"/>
<circle class="heart" cx="${px + 36}" cy="64" r="14"/>${tx(px + 64, 72, 'ECG / EKG', 'lb pn')}
${two ? tx(px + 24, 190, 'HR --', 'lb pn g') : tx(px + 24, 150, 'HR', 'lb pn g') + tx(px + 24, 262, '--', 'lb pn-big g')}
${two ? tx(px + 24, 290, 'RAW SIGNAL:', 'lb pn g') + tx(px + 24, 290 + 48, String(rawV), 'lb pn g') + tx(px + 24, 290 + 100, 'THRESHOLD:', 'lb pn g') + tx(px + 24, 290 + 148, '450', 'lb pn g') : tx(px + 24, 396, `RAW SIGNAL: ${rawV}`, 'lb pn g') + tx(px + 24, 432, 'THRESHOLD: 450', 'lb pn g')}`;
  return `<rect class="win" x="${PW.x}" y="${PW.y}" width="${PW.w}" height="${PW.h}" rx="8"/>${tx(PW.x + 14, PW.y + 34, '600', 'lb pn g')}${tx(PW.x + 14, PW.y + PW.h - 12, '300', 'lb pn g')}${old}${bright}${bar}${dot}${panel}`;
}

/* 6. the beat detector: threshold, re-arm line, flags, gaps, rate */
function beats(t: number, o: Opts) {
  const fy = (x: number) => Yc(periodic(tau(x)));
  const yT = Yc(o.thr), yR = Yc(o.thr - 20);
  const s = sweep(fy, t, o.still);
  const now = o.still ? DUR : t % DUR;
  const { flags } = detect(o.thr);
  const fx = (ms: number) => f1((ms / 1000 / DUR) * W);
  const pre = (ms: number) => (ms / 1000 > now ? ' pre' : '');
  let marks = '';
  flags.forEach((fl) => {
    const x = fx(fl.ms), y = Yc(SAMPLES[fl.i]);
    marks += `<g class="fg${pre(fl.ms)}"><line class="amb-d" x1="${x}" y1="${y}" x2="${x}" y2="64"/><circle class="hit" cx="${x}" cy="${y}" r="7"/><path class="flag" d="M${x} 36V70M${x} 36h26l-8 10 8 10h-26"/></g>`;
  });
  let gaps = '';
  flags.forEach((fl, k) => {
    if (!k) return;
    const a = +fx(flags[k - 1].ms), b = +fx(fl.ms), mid = (a + b) / 2;
    let g = `<path class="brk${fl.ok ? '' : ' no'}" d="M${a} 100V110H${b}V100"/>`;
    if (b - a > 118) g += tx(mid, 142, fl.ok ? `${fl.gap} ms` : 'ignored', fl.ok ? 'lb amb-t' : 'lb no-t', 'middle');
    else if (!fl.ok) g += tx(mid, 142, '×', 'lb no-t', 'middle');
    gaps += `<g class="fg${pre(fl.ms)}">${g}</g>`;
  });
  const fs = o.fs ?? 16;
  const cap = (y: number, s: string, c: string) => `<rect class="chip" x="30" y="${f1(y - fs * 1.1)}" width="${Math.round(s.length * fs * 0.64 + 16)}" height="${f1(fs * 1.5)}" rx="5"/>${tx(37, y, s, c)}`;
  const lines = `<line class="thr" x1="0" y1="${yT}" x2="${W}" y2="${yT}"/><line class="rearm" x1="0" y1="${yR}" x2="${W}" y2="${yR}"/>`;
  const caps = cap(+yT - 8, `threshold ${o.thr}`, 'lb amb-t') + cap(+yR + 30, `re-arm ${o.thr - 20}`, 'lb amb-t dim');
  return `${lines}${s.svg}${marks}${gaps}${caps}${tx(760, 456, 'gap window 300 to 2000 ms', 'lb tag', 'end')}`;
}

const FNS = [skin, board, pin, loop, serial, monitor, beats];
export const screen = (i: number, t: number, o: Opts) => FNS[i](o.still ? STILL_T : t, o);
