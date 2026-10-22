// ILLUSTRATIVE, SYNTHETIC numbers for the mass-spec demo. Seeded so every build is identical.
// Not study data, not an export from any instrument, not the real macro's output.
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

// regularised incomplete beta (Numerical-Recipes style continued fraction) -> Welch t-test p-value
function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const k of c) s += k / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a: number, b: number, x: number): number {
  let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function ibeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const vari = (v: number[]) => { const m = mean(v); return v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1); };
function welch(a: number[], b: number[]) {
  const va = vari(a) / a.length, vb = vari(b) / b.length;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  return Math.min(1, ibeta(df / 2, 0.5, df / (df + t * t)));
}

export const SAMPLES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'] as const;
export interface Feat { id: string; raw: number[]; mA: number; mB: number; lfc: number; p: number; nlp: number; cls: 'up' | 'down' | 'ns' }
const r = rng(20251020);
export const FEATURES: Feat[] = Array.from({ length: 56 }, (_, i) => {
  const base = 17 + r() * 5;                       // log2 intensity
  const shift = i % 7 === 0 ? (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.6) : gauss(r) * 0.25;
  const sd = 0.12 + r() * 0.22;
  const l2 = SAMPLES.map((_, k) => base + (k >= 3 ? shift : 0) + gauss(r) * sd);
  const A = l2.slice(0, 3), B = l2.slice(3);
  const p = Math.max(welch(B, A), 1e-6), lfc = mean(B) - mean(A);
  const cls = p < 0.05 && Math.abs(lfc) >= 1 ? (lfc > 0 ? 'up' : 'down') : 'ns';
  return { id: 'F' + String(i + 1).padStart(2, '0'), raw: l2.map((v) => Math.round(2 ** v)), mA: mean(A), mB: mean(B), lfc, p, nlp: -Math.log10(p), cls };
});


export const plotX = (v: number) => 54 + (Math.max(-3.4, Math.min(3.4, v)) + 3.4) / 6.8 * 520;
export const plotY = (v: number) => 330 - Math.min(6, v) / 6 * 304;
