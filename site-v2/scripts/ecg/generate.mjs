// Generates a SYNTHETIC ECG-like waveform. Not a recording. Run: node scripts/ecg/generate.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { detectRPeaks, bpmFromPeaks } from './detect.mjs';

const RATE = 100, DURATION = 10, N = RATE * DURATION;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261020);
const g = (t, mu, s, a) => a * Math.exp(-((t - mu) ** 2) / (2 * s * s));
// [offset from R (s), sigma (s), amplitude (arbitrary ADC counts)]
const waves = [[-0.16, 0.025, 120], [-0.035, 0.010, -110], [0, 0.011, 1000], [0.035, 0.012, -220], [0.24, 0.045, 260]];

const beats = [];
for (let t = 0.45; t < DURATION + 0.5; ) { beats.push(t); t += 0.83 + (rand() - 0.5) * 0.06; }
const samples = [];
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  let v = 0;
  for (const b of beats) if (Math.abs(t - b) < 0.6) for (const [o, s, a] of waves) v += g(t, b + o, s, a);
  v += 40 * Math.sin(2 * Math.PI * 0.25 * t) + 15 * Math.sin(2 * Math.PI * 0.07 * t + 1);
  v += (rand() - 0.5) * 24;
  samples.push(Math.round(v));
}
const rpeaks = detectRPeaks(samples, RATE);
const bpm = bpmFromPeaks(rpeaks, RATE);
const meta = { kind: 'synthetic', label: 'Synthetic illustration — not a recording from the board', rate_hz: RATE, duration_s: DURATION, non_diagnostic: true, swap_note: 'replace samples with a cleared real capture' };
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/ecg-replay.json', JSON.stringify({ meta, samples, rpeaks }) + '\n');

// static SVG fallback
const W = 800, H = 220, pad = 16;
const min = Math.min(...samples), max = Math.max(...samples);
const X = (i) => (pad + (i / (N - 1)) * (W - 2 * pad)).toFixed(1);
const Y = (v) => (pad + 10 + (1 - (v - min) / (max - min)) * (H - 2 * pad - 40)).toFixed(1);
const pts = samples.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
const marks = rpeaks.map((i) => `<circle cx="${X(i)}" cy="${Y(samples[i])}" r="3.5" fill="none" stroke="#E9EEF1" stroke-width="1.5"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d"><title id="t">Synthetic ECG-like waveform</title><desc id="d">${meta.label}. ${rpeaks.length} R-peaks marked, about ${bpm} BPM. Non-diagnostic.</desc><rect width="${W}" height="${H}" fill="#0E1216"/><polyline points="${pts}" fill="none" stroke="#E9EEF1" stroke-width="1.5" stroke-linejoin="round"/>${marks}<text x="${pad}" y="${H - 22}" font-family="ui-monospace,monospace" font-size="12" fill="#E9EEF1">${meta.label}</text><text x="${pad}" y="${H - 7}" font-family="ui-monospace,monospace" font-size="11" fill="#9AA6AE">synthetic · educational · non-diagnostic · ${rate()} Hz · ${DURATION} s · ${rpeaks.length} R-peaks · ~${bpm} BPM</text></svg>\n`;
function rate() { return RATE; }
writeFileSync('public/data/ecg-replay.svg', svg);
console.log(JSON.stringify({ samples: samples.length, rpeaks: rpeaks.length, bpm, expectedBeats: beats.filter((b) => b < DURATION - 0.05).length, rpeakIdx: rpeaks }));
