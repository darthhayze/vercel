// R-peak detector shared by the generator (node) and the browser (src/scripts/ecg-replay.ts).
// Derivative -> square -> adaptive threshold -> refractory period -> snap to local raw maximum.
export function detectRPeaks(samples, rate = 100) {
  const n = samples.length;
  if (n < 5) return [];
  const d = new Array(n).fill(0);
  for (let i = 2; i < n - 2; i++) d[i] = (-samples[i - 2] - 2 * samples[i - 1] + 2 * samples[i + 1] + samples[i + 2]) / 8;
  const e = d.map((v) => v * v);
  let max = 0;
  for (const v of e) if (v > max) max = v;
  const thr = 0.25 * max;
  const refractory = Math.round(0.3 * rate);
  const win = Math.round(0.08 * rate);
  const peaks = [];
  let i = 0;
  while (i < n) {
    if (e[i] > thr) {
      let j = i;
      while (j < n && e[j] > thr) j++;
      const lo = Math.max(0, i - win), hi = Math.min(n - 1, j + win);
      let best = lo;
      for (let k = lo; k <= hi; k++) if (samples[k] > samples[best]) best = k;
      if (!peaks.length || best - peaks[peaks.length - 1] >= refractory) peaks.push(best);
      i = j;
    } else i++;
  }
  return peaks;
}
export function bpmFromPeaks(peaks, rate = 100) {
  if (peaks.length < 2) return null;
  const rr = [];
  for (let i = 1; i < peaks.length; i++) rr.push((peaks[i] - peaks[i - 1]) / rate);
  return Math.round(60 / (rr.reduce((a, b) => a + b, 0) / rr.length));
}
