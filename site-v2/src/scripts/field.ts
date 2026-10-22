// Hero halftone: a full-surface dot screen, pointer lens and double-beat pulse.
// Text exclusion is measured once per layout change; no pointer event reads text geometry.
export interface FieldOpts { maskEls: () => Element[]; onFirstInteract?: () => void; still?: boolean }
interface Src { x: number; y: number; e: number; ve: number }

const HIDE = 11, SOFT = 9, CELL = 2;
// Quality ladder, stepped by a 30-frame average of draw time.
const LEVELS = [{ gap: 16, dpr: 2 }, { gap: 18, dpr: 1.5 }, { gap: 21, dpr: 1.25 }, { gap: 24, dpr: 1 }];
const sstep = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const hash = (i: number, k: number) => {
  let h = Math.imul(i, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca6b);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};

export function startField(wire: HTMLElement, o: FieldOpts): (() => void) | null {
  const hero = wire.parentElement as HTMLElement;
  const cv = document.createElement('canvas');
  cv.className = 'wire-canvas'; cv.setAttribute('aria-hidden', 'true');
  const ctx = cv.getContext('2d', { alpha: false });
  if (!ctx) return null;
  wire.appendChild(cv);
  const cs = getComputedStyle(hero);
  const YEL = cs.backgroundColor, INK = cs.color, WHITE = cs.getPropertyValue('--white').trim() || '#fff';

  let W = 0, H = 0, RR = 220, R2 = 1, gw = 0, gh = 0, q = 0, gap = LEVELS[0].gap, dprCap = 2;
  let mg = new Float32Array(1);                       // static text force-field mask, sampled on a CELL grid (rebuilt on resize / font load only)
  let inkDistance = new Float32Array(1);
  let dots: { x: number; y: number; tone: number; white: boolean; phase: number }[] = [];
  const ptr: Src = { x: 0, y: 0, e: 0, ve: 0 };
  const nav: Src = { x: 0, y: 0, e: 0, ve: 0 };
  let hovered: HTMLElement | null = null, focused: HTMLElement | null = null, activeNav: HTMLElement | null = null;
  const navRects = new Map<HTMLElement, { left: number; right: number; top: number; bottom: number }>();
  let tx = 0, ty = 0, inside = false, pressed = false, lastMove = -9, first = false, T = o.still ? 14 : 0, last = 0, raf = 0, vis = true, onScreen = true, dead = false;
  let hl = 0, ht = 0, stale = true;                    // cached hero origin: pointer events never touch layout
  const ft = new Float32Array(30); let fi = 0, fn = 0, cool = 0, calm = 0;

  const arrange = () => {
    dots = [];
    const cols = Math.ceil(W / gap) + 1, rows = Math.ceil(H / gap) + 1;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = col * gap + (row % 2) * gap / 2, y = row * gap;
      const tone = 0.5 + 0.35 * Math.sin(x / W * 3.2 + y / H * 2.4) + (hash(col, row) - 0.5) * 0.12;
      dots.push({ x, y, tone, white: hash(col + 97, row) > 0.84, phase: hash(col, row) * Math.PI * 2 });
    }
  };
  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, W * H > 1.6e6 ? Math.min(1.5, dprCap) : dprCap);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const setQ = (n: number) => {
    q = Math.max(0, Math.min(LEVELS.length - 1, n)); const v = LEVELS[q];
    gap = v.gap; dprCap = v.dpr; arrange(); sizeCanvas(); cv.dataset.q = String(q); fn = 0; fi = 0; cool = 60; calm = 0;
  };

  const measure = () => {
    const hr = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(hr.width)); H = Math.max(1, Math.round(hr.height)); hl = hr.left; ht = hr.top; stale = false;
    RR = Math.min(300, Math.max(130, Math.min(W, H) * 0.27)); R2 = RR * RR;
    sizeCanvas(); arrange();
    gw = Math.ceil(W / CELL) + 1; gh = Math.ceil(H / CELL) + 1;
    if (mg.length !== gw * gh) mg = new Float32Array(gw * gh); else mg.fill(0);
    inkDistance = new Float32Array(gw * gh); inkDistance.fill(Infinity);
    navRects.clear();
    for (const el of o.maskEls()) {
      const big = el.matches('.hl .stmt, .wordmark');
      const eb = el.getBoundingClientRect(), hide = big ? 2 : HIDE, soft = big ? 3 : SOFT, pad = big ? 12 : hide + soft;
      const rg = document.createRange(); rg.selectNodeContents(el);
      let list = Array.from(rg.getClientRects()).filter((r) => r.width > 2 && r.height > 2);
      if (!list.length) list.push(eb);
      if (big && el.firstChild?.nodeType === Node.TEXT_NODE) {
        const style = getComputedStyle(el);
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.fontStretch = 'condensed'; // Both display treatments use the font's 75% width axis.
        const glyphs: DOMRect[] = [], text = el.firstChild.textContent ?? '';
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) continue;
          rg.setStart(el.firstChild, i); rg.setEnd(el.firstChild, i + 1);
          const r = rg.getBoundingClientRect(), m = ctx.measureText(text[i]);
          const baseline = r.top + (r.height - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent;
          if (!Number.isFinite(baseline)) { glyphs.length = 0; break; }
          glyphs.push(new DOMRect(r.left - m.actualBoundingBoxLeft, baseline - m.actualBoundingBoxAscent,
            m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
        }
        if (glyphs.length) list = glyphs;
      }
      if (el.matches('.toplinks a')) {
        navRects.set(el as HTMLElement, { left: Math.min(...list.map(r => r.left)) - hr.left, right: Math.max(...list.map(r => r.right)) - hr.left,
          top: Math.min(...list.map(r => r.top)) - hr.top, bottom: Math.max(...list.map(r => r.bottom)) - hr.top });
      }
      for (const r of list) {
        const rl = r.left - hr.left, rr = r.right - hr.left, rt = r.top - hr.top, rb = r.bottom - hr.top;
        const c0 = Math.max(0, Math.floor((rl - pad) / CELL)), c1 = Math.min(gw - 1, Math.ceil((rr + pad) / CELL));
        const r0 = Math.max(0, Math.floor((rt - pad) / CELL)), r1 = Math.min(gh - 1, Math.ceil((rb + pad) / CELL));
        for (let gy = r0; gy <= r1; gy++) {
          const y = gy * CELL, dy = Math.max(rt - y, 0, y - rb);
          for (let gx = c0; gx <= c1; gx++) {
            const x = gx * CELL, dx = Math.max(rl - x, 0, x - rr);
            const distance = Math.hypot(dx, dy);
            if (big) inkDistance[gy * gw + gx] = Math.min(inkDistance[gy * gw + gx], distance);
            const v = 1 - sstep(hide, hide + soft, distance);
            if (v > mg[gy * gw + gx]) mg[gy * gw + gx] = v;
          }
        }
      }
    }
    if (!tx) { tx = W * 0.6; ty = H * 0.62; ptr.x = tx; ptr.y = ty; }
    if (o.still) draw();
  };

  const draw = () => {
    ctx.fillStyle = YEL; ctx.fillRect(0, 0, W, H);
    const selected = activeNav ? navRects.get(activeNav) : undefined;
    for (const p of dots) {
      let x = p.x, y = p.y;
      if (selected && nav.e > 0.001) {
        const nearX = Math.max(selected.left - 15, Math.min(selected.right + 15, x));
        const nearY = Math.max(selected.top - 15, Math.min(selected.bottom + 15, y));
        const dx = nearX - x, dy = nearY - y;
        const pull = Math.exp(-(dx * dx + dy * dy) / 6400) * nav.e;
        x += dx * pull * 0.28 + Math.sin(T * 31 + p.phase) * pull * 1.7;
        y += dy * pull * 0.28 + Math.cos(T * 27 + p.phase) * pull * 1.4;
      }
      const gx = Math.round(x / CELL), gy = Math.round(y / CELL);
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      const exclusion = mg[gy * gw + gx];
      if (exclusion >= 0.98) continue;
      const dx = p.x - ptr.x, dy = p.y - ptr.y;
      const lens = Math.exp(-(dx * dx + dy * dy) / R2) * ptr.e * (pressed ? -0.55 : 1);
      // Paired pulses travel out from the lower right; fixed dot centres keep the print screen calm.
      const distance = Math.hypot(p.x - W * 0.78, p.y - H * 0.7);
      const phase = ((T - distance * 0.00022) % 1.05 + 1.05) % 1.05;
      const beat = o.still ? 0 : Math.exp(-Math.pow((phase - 0.16) / 0.065, 2)) + 0.55 * Math.exp(-Math.pow((phase - 0.34) / 0.08, 2));
      const radius = Math.min(7.6, inkDistance[gy * gw + gx] - 3, Math.max(0.8, 1.2 + p.tone * 1.8 + lens * 3.5 + beat * 1.2));
      if (radius <= 0) continue;
      ctx.fillStyle = p.white ? WHITE : INK;
      ctx.globalAlpha = (1 - exclusion) * (p.white ? 0.95 : 0.78);
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    if (selected && nav.e > 0.001) {
      // A finer screen outlines the selected word without changing the main field's spacing.
      for (let y = selected.top - 28, row = 0; y <= selected.bottom + 28; y += 5, row++) {
        for (let x = selected.left - 28, col = 0; x <= selected.right + 28; x += 5, col++) {
          const distance = Math.hypot(Math.max(selected.left - x, 0, x - selected.right), Math.max(selected.top - y, 0, y - selected.bottom));
          if (distance < 14 || distance > 26) continue;
          const phase = hash(col, row) * Math.PI * 2;
          const px = x + Math.sin(T * 31 + phase) * nav.e * 0.65, py = y + Math.cos(T * 27 + phase) * nav.e * 0.65;
          const gx = Math.round(px / CELL), gy = Math.round(py / CELL);
          if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
          ctx.globalAlpha = (1 - mg[gy * gw + gx]) * nav.e * 0.9;
          ctx.fillStyle = (col + row) % 4 === 0 ? WHITE : INK;
          ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // Critically damped: no overshoot, no wobble. w = 42 reaches ~95% in ~110 ms; release uses a slower w so the field exhales.
  const spring = (c: Src, target: number, w: number, dt: number) => {
    const a = w * w * (target - c.e) - 2 * w * c.ve; c.ve += a * dt; c.e += c.ve * dt; if (c.e < 0) { c.e = 0; c.ve = 0; }
    if (c.e > 1) { c.e = 1; c.ve = Math.min(c.ve, 0); }
  };
  const tick = (now: number) => {
    raf = 0; if (dead) return;
    const p0 = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now; T += dt;
    if (hovered || focused) activeNav = hovered ?? focused;
    const sub = 2, h = dt / sub;
    // the source sits on the pointer exactly; only the strength of the field is eased
    ptr.x = tx; ptr.y = ty;
    for (let n = 0; n < sub; n++) {
      const idle = T - lastMove, tgt = inside ? (idle < 2.2 ? 1 : 0.3) : 0;
      spring(ptr, tgt, tgt > ptr.e ? 42 : 9, h);
      spring(nav, hovered || focused ? 1 : 0, 16, h);
    }
    draw();
    // adaptive quality: 30-frame moving average of JS time (update + draw)
    ft[fi] = performance.now() - p0; fi = (fi + 1) % 30; if (fn < 30) fn++;
    if (cool > 0) cool--;
    else if (fn === 30) {
      let sum = 0; for (let i = 0; i < 30; i++) sum += ft[i]; const avg = sum / 30;
      if (avg > 14 && q < LEVELS.length - 1) setQ(q + 1);
      else if (avg < 5 && q > 0 && ++calm > 300) setQ(q - 1);
      else if (avg >= 5) calm = 0;
    }
    schedule();
  };
  const schedule = () => { if (!raf && !dead && vis && onScreen && !o.still) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  // Pointer: passive listeners, no layout reads (hero origin is cached), coalesced samples collapse to the newest.
  const dirty = () => { stale = true; };
  const move = (e: PointerEvent) => {
    if (stale) { const r = hero.getBoundingClientRect(); hl = r.left; ht = r.top; stale = false; }
    const c = e.getCoalescedEvents?.(), l = c && c.length ? c[c.length - 1] : e;
    const x = l.clientX - hl, y = l.clientY - ht;
    tx = x; ty = y; inside = true; if (e.type === 'pointerdown') pressed = true;
    if (T - lastMove > 3) { ptr.x = x; ptr.y = y; }
    lastMove = T;
    if (ptr.e < 0.55) { ptr.e = 0.55; ptr.ve = Math.max(ptr.ve, 0); }   // first contact is visible on the very next frame
    if (!first) { first = true; o.onFirstInteract?.(); }
  };
  const leave = () => { inside = false; pressed = false; };
  const up = (e: PointerEvent) => { pressed = false; if (e.pointerType !== 'mouse') leave(); };
  const navLink = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>('.toplinks a') : null;
  const over = (e: PointerEvent) => { hovered = navLink(e.target); };
  const out = (e: PointerEvent) => { hovered = navLink(e.relatedTarget); };
  const focusIn = (e: FocusEvent) => { focused = navLink(e.target); };
  const focusOut = (e: FocusEvent) => { focused = navLink(e.relatedTarget); };
  const io = new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); if (onScreen) schedule(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  const vc = () => { vis = !document.hidden; if (vis) schedule(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  const ro = new ResizeObserver(() => { measure(); });
  const P = { passive: true } as const;

  measure(); setQ(0);
  if (!o.still) {
    hero.addEventListener('pointermove', move, P); hero.addEventListener('pointerdown', move, P);
    hero.addEventListener('pointerleave', leave, P); hero.addEventListener('pointerup', up, P);
    hero.addEventListener('pointercancel', leave, P);
    hero.addEventListener('pointerover', over, P); hero.addEventListener('pointerout', out, P);
    hero.addEventListener('focusin', focusIn); hero.addEventListener('focusout', focusOut);
    addEventListener('scroll', dirty, P); addEventListener('resize', dirty, P);
    document.addEventListener('visibilitychange', vc); io.observe(hero);
    schedule();
  }
  ro.observe(hero); document.fonts?.ready.then(() => { if (!dead) measure(); });
  draw();
  return () => {
    dead = true; if (raf) cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', vc); removeEventListener('scroll', dirty); removeEventListener('resize', dirty);
    hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerdown', move); hero.removeEventListener('pointerleave', leave);
    hero.removeEventListener('pointerover', over); hero.removeEventListener('pointerout', out);
    hero.removeEventListener('focusin', focusIn); hero.removeEventListener('focusout', focusOut);
    hero.removeEventListener('pointerup', up); hero.removeEventListener('pointercancel', leave); cv.remove();
  };
}
