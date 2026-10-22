// Synthetic ECG-like signal in Arduino counts (0 to 1023 scale, resting near 380, R peaks near 560).
// Pure functions of time, so the drawing is smooth at any resolution and the beat demo can run the same
// detector as the Processing sketch (flag at threshold, re-arm below threshold - 20, 300 to 2000 ms gap window).
// Not a recording. Used at build time (static frames) and in the browser (live frames).

const g = (t: number, c: number, w: number, a: number) => a * Math.exp(-((t - c) ** 2) / (2 * w * w));
export const BEATS = [0.55, 1.4, 2.3];
const AMP = [190, 172, 186];
export const DUR = 3;
export const f1 = (n: number) => Math.round(n * 10) / 10;

/** the clean signal, in counts */
export const count = (t: number) => {
  let v = 380 + 5 * Math.sin(t * 2.1) + 3 * Math.sin(t * 173) + 2 * Math.sin(t * 61 + 1);
  BEATS.forEach((b, i) => {
    v += g(t, b - 0.17, 0.035, 22) - g(t, b - 0.035, 0.011, 28) + g(t, b, 0.012, AMP[i]) - g(t, b + 0.04, 0.014, 42) + g(t, b + 0.3, 0.06, 58);
  });
  return v;
};
export const periodic = (t: number) => count(((t % DUR) + DUR) % DUR);
export const SAMPLES = Array.from({ length: DUR * 100 }, (_, i) => Math.round(count(i * 0.01)));

/** the same beat as it looks at the skin: small, with mains hum and a wandering baseline (illustrative) */
export const raw = (t: number) => {
  const c = periodic(t) - 380;
  return 0.16 * c + 11 * Math.sin(t * 2 * Math.PI * 5.2) + 5.5 * Math.sin(t * 91 + 0.6) + 4.5 * Math.sin(t * 37) + 14 * Math.sin(t * 0.9);
};

export interface Flag { i: number; ms: number; gap: number | null; ok: boolean }
/** the Processing sketch's detector: flag at >= threshold while armed, re-arm below threshold - 20, rate from gaps of 300 to 2000 ms */
export function detect(thr: number) {
  const flags: Flag[] = [];
  let armed = true, last: number | null = null, bpm: number | null = null;
  SAMPLES.forEach((v, i) => {
    if (v >= thr && armed) {
      armed = false;
      const ms = i * 10;
      let gap: number | null = null, ok = false;
      if (last !== null) { gap = ms - last; ok = gap > 300 && gap < 2000; if (ok) bpm = Math.round(60000 / gap); }
      flags.push({ i, ms, gap, ok });
      last = ms;
    }
    if (v < thr - 20) armed = true;
  });
  return { flags, bpm };
}

export const summary = (thr: number) => {
  const { flags, bpm } = detect(thr);
  const n = flags.length;
  const beats = n === 0 ? 'No flags on the 3-second trace.' : `${n} ${n === 1 ? 'flag' : 'flags'} on the 3-second trace.`;
  return `Threshold ${thr}, re-arm ${thr - 20}. ${beats} ${bpm ? `The last accepted gap gives about ${bpm} beats a minute.` : 'No gap inside 300 to 2000 ms, so no rate.'}`;
};
