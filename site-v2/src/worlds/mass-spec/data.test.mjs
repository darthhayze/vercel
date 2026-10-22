import assert from 'node:assert/strict';
import { FEATURES, SAMPLES, plotX, plotY } from './data.ts';

assert.equal(FEATURES.length, 56);
assert.equal(new Set(FEATURES.map(f => f.id)).size, FEATURES.length);
for (const feature of FEATURES) {
  assert.equal(feature.raw.length, SAMPLES.length);
  assert.ok(feature.raw.every(v => v > 0));
  const logged = feature.raw.map(Math.log2);
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(Math.abs(mean(logged.slice(0, 3)) - feature.mA) < 0.00001);
  assert.ok(Math.abs(mean(logged.slice(3)) - feature.mB) < 0.00001);
  assert.ok(Math.abs(feature.mB - feature.mA - feature.lfc) < 1e-12);
  assert.ok(feature.p > 0 && feature.p <= 1);
  assert.equal(feature.nlp, -Math.log10(feature.p));
  assert.ok(plotX(feature.lfc) >= 54 && plotX(feature.lfc) <= 574);
  assert.ok(plotY(feature.nlp) >= 26 && plotY(feature.nlp) <= 330);
  const passes = feature.p < .05 && Math.abs(feature.lfc) >= 1;
  assert.equal(feature.cls, passes ? feature.lfc > 0 ? 'up' : 'down' : 'ns');
}
assert.equal(FEATURES.filter(f => f.cls !== 'ns').length, 7);
assert.equal(plotX(0), 314);
assert.equal(plotY(0), 330);
console.log('mass-spec data: means, changes, p-value bounds, classifications and plot coordinates pass');
