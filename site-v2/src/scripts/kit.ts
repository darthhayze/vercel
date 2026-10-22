// KIT interactions (shared by every page and world). Vanilla ports of MIT-licensed components (see ASSETS.md):
// Motion Primitives Magnetic; spring drag built on Motion (MIT).
import { animate, inView, motionValue } from 'motion';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

/* ---- reveal on scroll (content is visible without JS) ---- */
document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
  if (reduce) { el.classList.add('in'); return; }
  inView(el, () => { el.classList.add('in'); }, { amount: 0.25 });
});

/* ---- Magnetic (Motion Primitives, adapted) ---- */
if (!reduce && matchMedia('(hover: hover)').matches) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const intensity = 0.5, range = 120;
    const x = motionValue(0), y = motionValue(0);
    const apply = () => { el.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0)`; };
    x.on('change', apply); y.on('change', apply);
    const spring = { type: 'spring', stiffness: 150, damping: 12, mass: 0.2 } as const;
    document.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const within = d <= range + Math.max(r.width, r.height) / 2;
      const k = within ? 1 - Math.min(1, d / (range + Math.max(r.width, r.height) / 2)) : 0;
      animate(x, dx * intensity * k, spring); animate(y, dy * intensity * k, spring);
    }, { passive: true });
  });
}

/* ---- Draggable specimens: pointer drag, thrown with a Motion spring ---- */
document.querySelectorAll<HTMLElement>('[data-drag]').forEach((el) => {
  const bounds = el.closest<HTMLElement>('section') ?? el.closest<HTMLElement>('[data-bounds]');
  const x = motionValue(0), y = motionValue(0), s = motionValue(1);
  const rot = parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0;
  const rm = motionValue(rot);
  const paint = () => { el.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) rotate(${rm.get()}deg) scale(${s.get()})`; };
  [x, y, s, rm].forEach((m) => m.on('change', paint));
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0, active = false;
  let minX = -1e5, maxX = 1e5, minY = -1e5, maxY = 1e5;
  let suppress = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    active = true; moved = 0; suppress = false;
    el.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY; ox = x.get(); oy = y.get(); lx = sx; ly = sy; lt = performance.now(); vx = vy = 0;
    if (bounds) {
      const b = bounds.getBoundingClientRect(), r = el.getBoundingClientRect();
      minX = ox + (b.left - r.left); maxX = ox + (b.right - r.right);
      minY = oy + (b.top - r.top); maxY = oy + (b.bottom - r.bottom);
    }
    el.classList.add('is-held');
    if (!reduce) { animate(s, 1.07, { type: 'spring', stiffness: 400, damping: 22 }); animate(rm, 0, { type: 'spring', stiffness: 200, damping: 18 }); }
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.hypot(dx, dy));
    const now = performance.now(), dt = Math.max(1, now - lt);
    vx = (e.clientX - lx) / dt * 1000; vy = (e.clientY - ly) / dt * 1000; lx = e.clientX; ly = e.clientY; lt = now;
    x.set(Math.min(maxX, Math.max(minX, ox + dx))); y.set(Math.min(maxY, Math.max(minY, oy + dy)));
  });
  const end = () => {
    if (!active) return; active = false;
    el.classList.remove('is-held');
    if (moved > 5) suppress = true;
    const sp = { type: 'spring', stiffness: 90, damping: 14 } as const;
    if (reduce) { s.set(1); rm.set(rot); return; }
    const cl = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    animate(x, cl(x.get() + vx * 0.22, minX, maxX), sp);
    animate(y, cl(y.get() + vy * 0.22, minY, maxY), sp);
    animate(s, 1, { type: 'spring', stiffness: 300, damping: 20 });
    animate(rm, rot + cl(vx / 400, -9, 9), { type: 'spring', stiffness: 120, damping: 8 }).then(() => animate(rm, rot, { type: 'spring', stiffness: 120, damping: 14 }));
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); suppress = false; } });
  el.addEventListener('dragstart', (e) => e.preventDefault());
  el.addEventListener('keydown', (e) => {
    const step = 24, k = e.key;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.shiftKey && d[k]) {
      e.preventDefault();
      animate(x, Math.min(maxX, Math.max(minX, x.get() + d[k][0])), { type: 'spring', stiffness: 200, damping: 20 });
      animate(y, Math.min(maxY, Math.max(minY, y.get() + d[k][1])), { type: 'spring', stiffness: 200, damping: 20 });
    }
  });
});
