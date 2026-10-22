// Foot-arch geometry for the arch-support world. Teaching illustration only: shapes are drawn, not measured.
// Medial (inner) side view of a foot. Heel on the left, toes on the right, floor at y = FLOOR.
// Every function takes the arch lift h (0 = flat, 1 = high) and returns plain numbers or path strings,
// so the server render and the browser morph use the same code.

export const VB_W = 1040;
export const VB_H = 500;
export const FLOOR = 400;
const L_MIN = 4;
const L_MAX = 112;
const X0 = 318; // where the heel pad ends
const X3 = 690; // where the ball of the foot starts

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** vertical lift of the arch peak above the floor, drawing units */
export const lift = (h: number) => L_MIN + (L_MAX - L_MIN) * clamp01(h);
const K = (h: number) => (4 / 3) * lift(h);
const CX1 = 352;
const CX2 = 566;

/** point on the sole contour (the underside of the arch) at t in 0..1 */
export function bez(t: number, h: number): [number, number] {
  const k = K(h);
  const u = 1 - t;
  const x = u * u * u * X0 + 3 * u * u * t * CX1 + 3 * u * t * t * CX2 + t * t * t * X3;
  const y = FLOOR - k * (3 * u * u * t + 3 * u * t * t);
  return [x, y];
}
/** contour height at a given x (searches t) */
export function yAtX(x: number, h: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (bez(m, h)[0] < x) lo = m; else hi = m;
  }
  return bez((lo + hi) / 2, h)[1];
}

export const soleD = (h: number) => `M${X0} ${FLOOR} C${CX1} ${f(FLOOR - K(h))} ${CX2} ${f(FLOOR - K(h))} ${X3} ${FLOOR}`;
/** the closed space between floor and arch: where the insert sits */
export const cavityD = (h: number) => `${soleD(h)} Z`;

/** how far the top of the foot sinks when the arch collapses */
const sink = (h: number) => (1 - clamp01(h)) * 92;

/** the foot, open path from the front of the leg round the heel, sole and toes back up the top of the foot */
export function outlineD(h: number): string {
  const d = sink(h);
  return [
    `M232 60 L224 220 C214 268 196 300 198 350 C200 388 218 400 252 400 L${X0} 400`,
    `C${CX1} ${f(FLOOR - K(h))} ${CX2} ${f(FLOOR - K(h))} ${X3} ${FLOOR}`,
    'L770 400 C835 400 880 392 888 366 C894 344 870 330 836 320',
    `C746 ${f(298 + 0.3 * d)} 630 ${f(236 + 0.7 * d)} 520 ${f(197 + 0.85 * d)}`,
    `C462 ${f(178 + 0.8 * d)} 404 ${f(164 + 0.3 * d)} 372 130 L366 60`,
  ].join(' ');
}
/** closed version for the soft fill */
export const fillD = (h: number) => `${outlineD(h)} Z`;

/** the plantar fascia: a band just inside the skin that ties heel to ball */
export function fasciaD(h: number): string {
  const k = K(h);
  return `M264 391 L${X0} 391 C${CX1} ${f(FLOOR - 9 - k)} ${CX2} ${f(FLOOR - 9 - k)} ${X3} 391 L676 391`;
}

/* ---------- bones ---------- */
export interface Bone { id: string; label: string; n: number; d: string; tf: string; ax: number; ay: number }
const SHAPES = {
  calcaneus: 'M-70 8 C-76 -26 -52 -40 -16 -40 C14 -40 40 -34 58 -20 C72 -8 70 14 50 28 C30 40 -10 42 -42 38 C-62 34 -68 22 -70 8Z',
  talus: 'M-46 6 C-50 -24 -22 -34 6 -32 C34 -30 52 -16 52 2 C52 16 40 26 20 28 C-6 30 -26 30 -38 24 C-44 20 -46 14 -46 6Z',
  navicular: 'M-16 -24 C-4 -30 12 -26 17 -10 C20 6 14 24 2 28 C-10 30 -17 14 -18 0 C-18 -10 -18 -18 -16 -24Z',
  cuneiform: 'M-18 -18 C-6 -26 14 -24 19 -10 C22 4 18 20 4 24 C-10 26 -19 12 -20 0 C-20 -8 -20 -14 -18 -18Z',
};
function capsule(x1: number, y1: number, x2: number, y2: number, r: number): string {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * r, ny = (dx / len) * r;
  return `M${f(x1 + nx)} ${f(y1 + ny)} A${r} ${r} 0 0 1 ${f(x1 - nx)} ${f(y1 - ny)} L${f(x2 - nx)} ${f(y2 - ny)} A${r} ${r} 0 0 1 ${f(x2 + nx)} ${f(y2 + ny)} Z`;
}
/** a bone that follows a curve: a ribbon of half-width r around the centre points, with round ends */
function ribbon(pts: [number, number][], r: number): string {
  const L: [number, number][] = [], R: [number, number][] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * r, ny = (dx / len) * r;
    L.push([p[0] + nx, p[1] + ny]); R.push([p[0] - nx, p[1] - ny]);
  });
  const fw = L.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join(' ');
  const bw = R.reverse().map((p) => `L${f(p[0])} ${f(p[1])}`).join(' ');
  const rl = R[0], fl = L[0];
  return `${fw} A${r} ${r} 0 0 0 ${f(rl[0])} ${f(rl[1])} ${bw} A${r} ${r} 0 0 0 ${f(fl[0])} ${f(fl[1])} Z`;
}
const T_NAV = 0.42, T_CUN = 0.56;
export function bones(h: number): Bone[] {
  const nav = bez(T_NAV, h), cun = bez(T_CUN, h);
  const navY = nav[1] - 40, cunY = cun[1] - 34;
  const shaft: [number, number][] = [];
  for (let i = 0; i <= 8; i++) { const t = 0.66 + (0.955 - 0.66) * (i / 8); const p = bez(t, h); shaft.push([p[0], p[1] - 27]); }
  const mid = shaft[4];
  return [
    { id: 'calcaneus', label: 'Calcaneus', n: 1, d: SHAPES.calcaneus, tf: `translate(268 350) scale(.94) rotate(${f(-(8 + 12 * h))})`, ax: 206, ay: 352 },
    { id: 'talus', label: 'Talus', n: 2, d: SHAPES.talus, tf: `translate(338 ${f(250 + 36 * (1 - h))}) rotate(${f(-4 + 4 * h)})`, ax: 292, ay: 258 + 36 * (1 - h) },
    { id: 'navicular', label: 'Navicular', n: 3, d: SHAPES.navicular, tf: `translate(${f(nav[0])} ${f(navY)}) rotate(${f(-6 + 3 * h)})`, ax: nav[0], ay: navY - 30 },
    { id: 'cuneiform', label: 'Medial cuneiform', n: 4, d: SHAPES.cuneiform, tf: `translate(${f(cun[0])} ${f(cunY)}) rotate(-4)`, ax: cun[0], ay: cunY - 26 },
    { id: 'metatarsal', label: 'First metatarsal', n: 5, d: ribbon(shaft, 13), tf: '', ax: mid[0], ay: mid[1] - 13 },
    { id: 'toe1', label: '', n: 0, d: capsule(704, 382, 776, 384, 12), tf: '', ax: 0, ay: 0 },
    { id: 'toe2', label: '', n: 0, d: capsule(786, 383, 842, 380, 10), tf: '', ax: 0, ay: 0 },
  ];
}

/* ---------- callouts: labels sit in the margins, leaders run straight to the bone ---------- */
export interface Callout { id: string; label: string; n: number; lx: number; ly: number; anchor: 'start' | 'end'; ex: number; ey: number; sx: number; sy: number; mx: number; my: number }
export function callouts(h: number): Callout[] {
  const B = Object.fromEntries(bones(h).map((b) => [b.id, b]));
  return [
    // right-hand labels step down as they step right, so no leader crosses another label
    { id: 'navicular', label: 'Navicular', n: 3, lx: B.navicular.ax + 10, ly: 40, anchor: 'start', sx: B.navicular.ax, sy: 50, ex: B.navicular.ax, ey: B.navicular.ay, mx: B.navicular.ax, my: 34 },
    { id: 'cuneiform', label: 'Medial cuneiform', n: 4, lx: B.cuneiform.ax + 10, ly: 92, anchor: 'start', sx: B.cuneiform.ax, sy: 102, ex: B.cuneiform.ax, ey: B.cuneiform.ay, mx: B.cuneiform.ax, my: 86 },
    { id: 'metatarsal', label: 'First metatarsal', n: 5, lx: B.metatarsal.ax + 10, ly: 144, anchor: 'start', sx: B.metatarsal.ax, sy: 154, ex: B.metatarsal.ax, ey: B.metatarsal.ay, mx: B.metatarsal.ax, my: 138 },
    // left-hand labels
    { id: 'talus', label: 'Talus', n: 2, lx: 170, ly: 216, anchor: 'end', sx: 178, sy: 210, ex: B.talus.ax, ey: B.talus.ay, mx: 146, my: 204 },
    { id: 'calcaneus', label: 'Calcaneus', n: 1, lx: 170, ly: 384, anchor: 'end', sx: 178, sy: 378, ex: B.calcaneus.ax, ey: B.calcaneus.ay, mx: 146, my: 372 },
    // below the floor
    { id: 'fascia', label: 'Plantar fascia', n: 6, lx: 276, ly: 462, anchor: 'end', sx: 284, sy: 446, ex: 284, ey: 392, mx: 284, my: 450 },
  ];
}

/* ---------- insert toolpath: horizontal passes between floor and arch, like slicer layers ---------- */
export const PITCH = 7;
export const MAX_PASSES = Math.floor((L_MAX - 6) / PITCH) + 1;
export interface Pass { y: number; x1: number; x2: number; on: boolean }
export function passes(h: number): Pass[] {
  const out: Pass[] = [];
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) pts.push(bez(i / 120, h));
  for (let i = 0; i < MAX_PASSES; i++) {
    const y = FLOOR - 5 - i * PITCH;
    let a = Infinity, b = -Infinity;
    for (const p of pts) if (p[1] <= y - 3) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); }
    const on = b - a > 24;
    // serpentine: odd passes run right to left
    const [s, e] = on ? [a + 5, b - 5] : [468, 470];
    out.push(i % 2 ? { y, x1: e, x2: s, on } : { y, x1: s, x2: e, on });
  }
  return out;
}
export const passCount = (h: number) => passes(h).filter((p) => p.on).length;

/** dimension line from floor to the arch peak */
export function dim(h: number) {
  const [x, y] = bez(0.5, h);
  return { x, y, off: h < 0.05 };
}

/* ---------- wet-test footprint, sole view. Lateral edge stays put; the medial edge pulls in as the arch rises ---------- */
export function printD(h: number): string {
  const m = 50 + 70 * clamp01(h); // medial edge at midfoot
  return [
    'M110 404 C86 404 72 390 72 366',
    `C72 330 ${f(m)} 316 ${f(m)} 270`,
    `C${f(m)} 234 46 220 46 178`,
    'C46 138 76 122 116 122 C158 122 188 138 188 178',
    'C188 226 172 250 168 292 C164 332 150 366 148 372',
    'C148 392 134 404 110 404Z',
  ].join(' ');
}
/** five toes of the print */
export const TOES: { cx: number; cy: number; rx: number; ry: number }[] = [
  { cx: 66, cy: 90, rx: 24, ry: 28 },
  { cx: 108, cy: 68, rx: 14, ry: 19 },
  { cx: 136, cy: 72, rx: 13, ry: 18 },
  { cx: 160, cy: 84, rx: 11, ry: 16 },
  { cx: 178, cy: 104, rx: 9, ry: 13 },
];

export const WORDS = {
  flat: 'Flat. The whole sole touches down, so the print is full width at the midfoot.',
  low: 'Starting to lift. The midfoot print begins to narrow.',
  mid: 'Supported. The heel, outer edge and ball still print, and the midfoot narrows.',
  high: 'Raised high. Only a thin band joins the heel and the ball.',
};
export const wordsFor = (h: number) => (h < 0.12 ? WORDS.flat : h < 0.45 ? WORDS.low : h < 0.85 ? WORDS.mid : WORDS.high);
