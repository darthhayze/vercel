// JobHub system map: camera, wires, inspector, keyboard, AI-rules board.
// The camera is a translate+scale on one world element. Frames come from map.ts; narrow screens split a frame into smaller ones.
// Camera moves are time-based tweens (ease in-out, with a short pull-back on long hops). Reduced motion jumps.
import { NODES, WIRES, DECOR, FRAMES, REGION_TITLES, WORLD, type Rect, type Tone } from './map';

const root = document.querySelector<HTMLElement>('[data-jm]');
if (root) boot(root);

type Frame = { id: string; name: string; nodes: string[]; rect: Rect; scale: number; focus: string };
type Cam = { x: number; y: number; s: number };

function boot(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const view = $('[data-view]'), world = $('[data-world]'), track = $('[data-track]'), stage = $('[data-stage]');
  const under = root.querySelector<SVGSVGElement>('[data-under]')!, over = root.querySelector<SVGSVGElement>('[data-over]')!;
  const where = $('[data-where]'), bar = $('[data-bar]'), pathEl = $('[data-path]'), status = $('[data-status]'), ipbody = $('[data-ipbody]');
  const prevBtn = $<HTMLButtonElement>('[data-jm-prev]'), nextBtn = $<HTMLButtonElement>('[data-jm-next]');
  const tour = $('[data-tour]');
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const REG = Object.fromEntries(REGION_TITLES.map((t) => [t.id, t.text]));
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const nodeEl: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => (nodeEl[el.dataset.node!] = el));
  const pane: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>('[data-pane]').forEach((el) => (pane[el.dataset.pane!] = el));
  const rectOf = (id: string): Rect => byId[id]?.rect ?? DECOR[id];
  const TONE: Record<Tone, string> = { shared: '#6f9ab6', private: '#e5484d', ai: '#a688c8', code: '#73c79b', plain: '#8d9097' };

  /* ---------- place nodes, build the drawing ---------- */
  root.classList.add('jm-on');
  for (const n of NODES) {
    const s = nodeEl[n.id].style;
    s.left = n.rect.x + 'px'; s.top = n.rect.y + 'px'; s.width = n.rect.w + 'px'; s.height = n.rect.h + 'px';
  }
  root.querySelectorAll<HTMLElement>('[data-note]').forEach((el) => {
    const r = DECOR[el.dataset.note!];
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px';
  });
  for (const svg of [under, over]) {
    svg.setAttribute('viewBox', `${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`);
    svg.style.left = WORLD.x + 'px'; svg.style.top = WORLD.y + 'px'; svg.style.width = WORLD.w + 'px'; svg.style.height = WORLD.h + 'px';
  }
  const hz = (s: string) => s === 'l' || s === 'r';
  const pt = (r: Rect, s: string, k: number): [number, number] =>
    s === 'l' ? [r.x, r.y + r.h * k] : s === 'r' ? [r.x + r.w, r.y + r.h * k] : s === 't' ? [r.x + r.w * k, r.y] : [r.x + r.w * k, r.y + r.h];
  // spread wires that meet the same side
  const endCount: Record<string, number> = {}, endSeen: Record<string, number> = {};
  for (const w of WIRES) for (const e of [w.from, w.to]) endCount[e] = (endCount[e] ?? 0) + 1;
  const k = (e: string) => { const n = endCount[e]; const i = (endSeen[e] = (endSeen[e] ?? -1) + 1); return n === 1 ? 0.5 : (i + 1) / (n + 1); };
  const round = (pts: [number, number][], r = 16) => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
      const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy), rr = Math.min(r, l1 / 2, l2 / 2);
      const ax = cx + ((px - cx) / l1) * rr, ay = cy + ((py - cy) / l1) * rr, bx = cx + ((nx - cx) / l2) * rr, by = cy + ((ny - cy) / l2) * rr;
      d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
    }
    const e = pts[pts.length - 1];
    return d + ` L${e[0]} ${e[1]}`;
  };
  const cylD = (r: Rect) => `M${r.x + 1} ${r.y + 24} a${r.w / 2 - 1} 24 0 0 1 ${r.w - 2} 0 v${r.h - 48} a${r.w / 2 - 1} 24 0 0 1 ${-(r.w - 2)} 0 z`;
  type Wire = { from: string; to: string; el: SVGGElement };
  const wires: Wire[] = [];
  let u = '<defs>';
  for (const t of Object.keys(TONE) as Tone[]) u += `<marker id="jm-ar-${t}" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 1 L9 5 L0 9 z" fill="${TONE[t]}"/></marker>`;
  u += `<pattern id="jm-dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" class="jm-dot"/></pattern>`;
  u += `<pattern id="jm-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="16" class="jm-hl"/></pattern></defs>`;
  u += `<rect x="${WORLD.x}" y="${WORLD.y}" width="${WORLD.w}" height="${WORLD.h}" fill="url(#jm-dots)"/>`;
  for (const t of REGION_TITLES) u += `<text class="jm-rt" x="${t.x}" y="${t.y}">${t.text}</text>`;
  const f = DECOR['ai-fence'];
  u += `<rect class="jm-fence" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="22"/>`;
  const p = DECOR['ui-plate'];
  u += `<g class="jm-plate"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="20"/><path d="M${p.x} ${p.y + 56} H${p.x + p.w}"/>`
    + [0, 1, 2].map((i) => `<circle cx="${p.x + 34 + i * 22}" cy="${p.y + 28}" r="6"/>`).join('')
    + `<text x="${p.x + 120}" y="${p.y + 34}">JobHub web app</text></g>`;
  for (const n of NODES) {
    const r = n.rect;
    u += n.shape === 'db'
      ? `<path class="jm-ghost" d="${cylD(r)}"/><ellipse class="jm-ghost" cx="${r.x + r.w / 2}" cy="${r.y + 24}" rx="${r.w / 2 - 1}" ry="23"/><text class="jm-gt" x="${r.x + 24}" y="${r.y + 96}">${n.title}</text>`
      : n.shape === 'wall'
      ? `<rect class="jm-ghost jm-ghost-wall" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" fill="url(#jm-hatch)"/>`
      : `<rect class="jm-ghost" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14"/><text class="jm-gt" x="${r.x + 18}" y="${r.y + 34}">${n.title}</text>`;
  }
  let ports = '';
  for (const w of WIRES) {
    const [a, as] = w.from.split('.'), [b, bs] = w.to.split('.');
    const ra = rectOf(a), rb = rectOf(b);
    const p1 = pt(ra, as, k(w.from)), p2 = pt(rb, bs, k(w.to));
    let pts: [number, number][];
    if (hz(as) && hz(bs)) { const mx = (p1[0] + p2[0]) / 2; pts = [p1, [mx, p1[1]], [mx, p2[1]], p2]; }
    else if (!hz(as) && !hz(bs)) { const my = (p1[1] + p2[1]) / 2; pts = [p1, [p1[0], my], [p2[0], my], p2]; }
    else if (hz(as)) pts = [p1, [p2[0], p1[1]], p2];
    else pts = [p1, [p1[0], p2[1]], p2];
    pts = pts.filter((q, i) => i === 0 || i === pts.length - 1 || !((pts[i - 1][0] === q[0] && q[0] === pts[i + 1][0]) || (pts[i - 1][1] === q[1] && q[1] === pts[i + 1][1])));
    // shorten the end so the arrowhead sits outside the port dot
    {
      const [qx, qy] = pts[pts.length - 2], e = pts[pts.length - 1], l = Math.hypot(e[0] - qx, e[1] - qy) || 1;
      pts[pts.length - 1] = [e[0] + ((qx - e[0]) / l) * 8, e[1] + ((qy - e[1]) / l) * 8];
    }
    let label = '';
    if (w.label) {
      const lines = w.label.split('\n');
      const est = Math.max(...lines.map((l) => l.length)) * 7.6 + 12;
      const segs = pts.slice(0, -1).map((a, i) => ({ i, len: Math.hypot(pts[i + 1][0] - a[0], pts[i + 1][1] - a[1]), h: a[1] === pts[i + 1][1] }));
      segs.sort((a, b) => b.len - a.len || b.i - a.i);
      const seg = segs.find((g) => !g.h || g.len >= est) ?? segs[0];
      const [x1, y1] = pts[seg.i], [x2, y2] = pts[seg.i + 1], lp = w.lp ?? 0.5;
      const mx = x1 + (x2 - x1) * lp, my = y1 + (y2 - y1) * lp;
      if (seg.h) label = `<text class="jm-wl" text-anchor="middle" x="${mx}" y="${my - 10 - (lines.length - 1) * 17}">${lines.map((l, i) => `<tspan x="${mx}" dy="${i ? 17 : 0}">${l}</tspan>`).join('')}</text>`;
      else label = `<text class="jm-wl" x="${mx + 14}" y="${my - ((lines.length - 1) * 17) / 2 + 5}">${lines.map((l, i) => `<tspan x="${mx + 14}" dy="${i ? 17 : 0}">${l}</tspan>`).join('')}</text>`;
    }
    u += `<g class="jm-w jm-w-${w.tone}" data-from="${a}" data-to="${b}"><path d="${round(pts)}" marker-end="url(#jm-ar-${w.tone})"/>${label}</g>`;
    for (const [pp, id] of [[p1, a], [p2, b]] as [[number, number], string][]) ports += `<circle class="jm-port jm-port-${w.tone}" data-port="${id}" cx="${pp[0]}" cy="${pp[1]}" r="6"/>`;
  }
  under.innerHTML = u;
  over.innerHTML = ports;
  under.querySelectorAll<SVGGElement>('.jm-w').forEach((el) => wires.push({ from: el.dataset.from!, to: el.dataset.to!, el }));

  for (const id in pane) pane[id].hidden = true;

  /* ---------- frames ---------- */
  let vw = 0, vh = 0, frames: Frame[] = [], cur = 0, sel = '', topPad = 0, botPad = 0;
  const bbox = (ids: string[]): Rect => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id of ids) { const r = rectOf(id); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 });
  function buildFrames() {
    const vr = view.getBoundingClientRect();
    vw = vr.width; vh = vr.height;
    const narrow = vw < 700;
    const p = narrow ? 8 : 44;
    topPad = narrow ? 40 : 56; botPad = narrow ? 30 : 40;
    const aw = vw - 12, ah = vh - topPad - botPad;
    const fit = (r: Rect) => Math.min(aw / r.w, ah / r.h);
    const MIN = narrow ? 0.8 : 0.78;
    const out: Frame[] = [];
    const mk = (id: string, name: string, nodes: string[], decor: string[], focus: string, max: number) => {
      const rect = pad(bbox([...nodes, ...decor]), p);
      out.push({ id, name, nodes, rect, scale: Math.min(fit(rect), max), focus });
    };
    for (const fd of FRAMES) {
      const max = fd.max ?? (narrow ? 1.3 : 1.2);
      const whole = pad(bbox([...fd.nodes, ...(fd.decor ?? [])]), p);
      if (fit(whole) >= MIN || fd.nodes.length === 1) { mk(fd.id, fd.name, fd.nodes, fd.decor ?? [], fd.focus ?? fd.nodes[0], max); continue; }
      let group: string[] = [];
      const flush = () => { if (!group.length) return; const first = byId[group[0]]; mk(fd.id + ':' + group[0], fd.name + ': ' + first.title, group, [], group.includes(fd.focus ?? '') ? fd.focus! : group[0], max); group = []; };
      for (const id of fd.nodes) {
        const test = pad(bbox([...group, id]), p);
        if (group.length && fit(test) < MIN) flush();
        group.push(id);
      }
      flush();
    }
    frames = out;
  }
  const frameOfNode = (id: string) => Math.max(0, frames.findIndex((f) => f.nodes.includes(id)));

  /* ---------- camera ---------- */
  let cam: Cam = { x: 0, y: 0, s: 1 };
  let tw: { t0: number; dur: number; a: Cam; b: Cam; arc: number } | null = null, raf = 0;
  const target = (f: Frame): Cam => ({ x: f.rect.x + f.rect.w / 2, y: f.rect.y + f.rect.h / 2, s: f.scale });
  const paint = () => {
    const ty = topPad + (vh - topPad - botPad) / 2 - cam.y * cam.s, tx = vw / 2 - cam.x * cam.s;
    world.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
  };
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function tick(now: number) {
    if (!tw) return;
    const t = Math.min(1, (now - tw.t0) / tw.dur), e = ease(t);
    const s = (tw.a.s + (tw.b.s - tw.a.s) * e) * (1 - tw.arc * Math.sin(Math.PI * e));
    cam = { x: tw.a.x + (tw.b.x - tw.a.x) * e, y: tw.a.y + (tw.b.y - tw.a.y) * e, s };
    paint();
    if (t < 1) raf = requestAnimationFrame(tick);
    else { cam = tw.b; tw = null; paint(); settle(); }
  }
  function fly(f: Frame, instant = false) {
    const b = target(f);
    cancelAnimationFrame(raf);
    if (instant || reduceMq.matches) { tw = null; cam = b; paint(); settle(); return; }
    const dist = Math.hypot(b.x - cam.x, b.y - cam.y);
    if (dist < 2 && Math.abs(b.s - cam.s) < 0.01) { tw = null; cam = b; paint(); settle(); return; }
    world.dataset.moving = '1';
    tw = { t0: performance.now(), dur: Math.min(1400, 640 + dist * 0.11), a: { ...cam }, b, arc: Math.min(0.32, dist / 7000) };
    raf = requestAnimationFrame(tick);
  }
  function settle() { delete world.dataset.moving; markFrame(); }

  /* ---------- frame state, selection, inspector ---------- */
  function markFrame() {
    const f = frames[cur];
    const decor = FRAMES.find((d) => d.id === f?.id.split(':')[0])?.decor ?? [];
    root.querySelectorAll<HTMLElement>('[data-note]').forEach((el) => el.classList.toggle('in-frame', f?.id.indexOf(':') < 0 && decor.includes(el.dataset.note!)));
    for (const id in nodeEl) nodeEl[id].classList.toggle('in-frame', !!f && f.nodes.includes(id));
    for (const w of wires) w.el.classList.toggle('on', !!f && (f.nodes.includes(w.from) || f.nodes.includes(w.to)));
  }
  function setFrame(i: number, instant = false, pick = true) {
    cur = Math.max(0, Math.min(frames.length - 1, i));
    const f = frames[cur];
    where.textContent = f.name;
    bar.style.transform = `scaleX(${frames.length > 1 ? (cur + 1) / frames.length : 1})`;
    prevBtn.disabled = cur === 0; nextBtn.disabled = cur === frames.length - 1;
    if (pick && !f.nodes.includes(sel)) select(f.focus, false);
    fly(f, instant);
    markFrame();
  }
  function select(id: string, announce: boolean) {
    if (!pane[id]) return;
    if (sel && pane[sel]) pane[sel].hidden = true;
    sel = id;
    pane[id].hidden = false;
    if (!reduceMq.matches) pane[id].animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' });
    ipbody.scrollTop = 0;
    for (const nid in nodeEl) {
      const on = nid === id;
      nodeEl[nid].classList.toggle('is-sel', on);
      if (nodeEl[nid].matches('button')) nodeEl[nid].setAttribute('aria-pressed', String(on));
    }
    const head = nodeEl.rules.querySelector('[data-head]'); if (head) head.setAttribute('aria-pressed', String(id === 'rules'));
    for (const w of wires) w.el.classList.toggle('hot', w.from === id || w.to === id);
    over.querySelectorAll<SVGCircleElement>('.jm-port').forEach((c) => c.classList.toggle('hot', c.dataset.port === id));
    const n = byId[id];
    pathEl.textContent = `jobhub / ${REG[n.region] ?? n.region} / ${n.title}`;
    if (announce) status.textContent = `Inspecting ${n.title}. ${n.what}`;
  }

  /* ---------- scroll drives the camera ---------- */
  let sTop = 0, step = 1, lock = false, lockTimer = 0;
  const offTop = () => parseFloat(getComputedStyle(stage).top) || 0;
  function metrics() {
    const stepPx = Math.max(280, vh * 0.55);
    track.style.height = stage.offsetHeight + (frames.length - 1) * stepPx + 'px';
    sTop = track.getBoundingClientRect().top + scrollY;
    step = stepPx;
    const tf = frames.findIndex((f) => f.nodes.includes('ui-roles'));
    tour.style.top = Math.max(0, tf * step - offTop()) + 'px';
  }
  const scrollForFrame = (i: number) => sTop - offTop() + i * step + 1;
  function onScroll() {
    if (lock) return;
    const p = (scrollY + offTop() - sTop) / step;
    const i = Math.max(0, Math.min(frames.length - 1, Math.round(p)));
    if (i !== cur) setFrame(i);
  }
  function goFrame(i: number, scroll = true) {
    i = Math.max(0, Math.min(frames.length - 1, i));
    if (scroll) {
      lock = true; clearTimeout(lockTimer);
      scrollTo({ top: scrollForFrame(i), behavior: reduceMq.matches ? 'instant' : 'smooth' });
      lockTimer = window.setTimeout(() => { lock = false; onScroll(); }, reduceMq.matches ? 60 : 1100);
    }
    setFrame(i);
  }
  addEventListener('scroll', onScroll, { passive: true });
  prevBtn.addEventListener('click', () => goFrame(cur - 1));
  nextBtn.addEventListener('click', () => goFrame(cur + 1));

  /* ---------- pick: click, focus, arrow keys ---------- */
  view.addEventListener('click', (e) => {
    const nd = (e.target as HTMLElement).closest<HTMLElement>('[data-node]');
    if (nd) select(nd.dataset.node!, true);
  });
  view.addEventListener('focusin', (e) => {
    const nd = (e.target as HTMLElement).closest<HTMLElement>('[data-node]');
    if (!nd) return;
    const id = nd.dataset.node!;
    if (!frames[cur].nodes.includes(id)) goFrame(frameOfNode(id));
    select(id, true);
  });
  const focusTarget = (id: string) => { const el = nodeEl[id]; return el.matches('button') ? el : el.querySelector<HTMLElement>('[data-head]')!; };
  const center = (id: string) => { const r = byId[id].rect; return [r.x + r.w / 2, r.y + r.h / 2]; };
  function neighbour(id: string, dir: string): string | null {
    const [cx, cy] = center(id);
    const here = frames[cur]?.nodes ?? [];
    let best: string | null = null, bs = 1e12;
    for (const pass of [0, 1]) {
      for (const n of NODES) {
        if (n.id === id || (pass === 0 && !here.includes(n.id))) continue;
        const [x, y] = center(n.id);
        const dx = x - cx, dy = y - cy;
        const along = dir === 'ArrowRight' ? dx : dir === 'ArrowLeft' ? -dx : dir === 'ArrowDown' ? dy : -dy;
        const across = dir === 'ArrowRight' || dir === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
        if (along <= 8 || across > along * 2.2 + 120) continue;
        const sc = along + across * 1.6;
        if (sc < bs) { bs = sc; best = n.id; }
      }
      if (best) return best;
    }
    return null;
  }
  view.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ke.key)) return;
    const el = ke.target as HTMLElement;
    const nd = el.closest<HTMLElement>('[data-node]');
    if (!nd || focusTarget(nd.dataset.node!) !== el) return;
    const next = neighbour(nd.dataset.node!, ke.key);
    if (!next) return;
    ke.preventDefault();
    const fi = frameOfNode(next);
    if (fi !== cur) goFrame(fi);
    select(next, true);
    focusTarget(next).focus({ preventScroll: true });
  });

  /* ---------- AI rules board ---------- */
  root.querySelectorAll<HTMLButtonElement>('[data-sw]').forEach((b) => {
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-checked') === 'true';
      const next = !on;
      b.setAttribute('aria-checked', String(next));
      const m = b.querySelector('[data-msg]')!;
      m.textContent = next ? b.dataset.on! : b.dataset.off!;
      b.classList.toggle('is-off', !next);
      status.textContent = `${b.querySelector('.sw-t')!.firstChild!.textContent}: ${next ? 'on' : 'off'}. ${m.textContent}`;
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.sw-lock').forEach((b) => {
    b.addEventListener('click', () => {
      const m = b.querySelector('[data-msg]')!;
      status.textContent = b.dataset.locked!;
      if (reduceMq.matches) return;
      const x = [0, -6, 6, -4, 4, 0];
      b.animate(x.map((v) => ({ transform: `translateX(${v}px)` })), { duration: 280, easing: 'ease-out' });
      m.classList.add('flash');
      setTimeout(() => m.classList.remove('flash'), 600);
    });
  });

  /* ---------- hash, resize, start ---------- */
  function layout(keep = true) {
    const id = frames[cur]?.nodes[0];
    buildFrames();
    metrics();
    cur = id ? frameOfNode(id) : 0;
    const fi = Math.max(0, Math.min(frames.length - 1, Math.round((scrollY + offTop() - sTop) / step)));
    cur = keep ? fi : 0;
    cur = Math.max(0, Math.min(frames.length - 1, cur));
    setFrame(cur, true, !sel);
    if (sel && !frames[cur].nodes.includes(sel)) select(frames[cur].focus, false);
  }
  const toHash = () => {
    if (location.hash === '#tour') { const i = frames.findIndex((f) => f.nodes.includes('ui-roles')); if (i >= 0) { scrollTo({ top: scrollForFrame(i), behavior: 'instant' }); setFrame(i, true); } }
  };
  let rt = 0;
  new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => layout(true), 120); }).observe(view);
  addEventListener('hashchange', toHash);
  document.fonts?.ready.then(() => { metrics(); });
  layout(true);
  toHash();
  root.classList.add('jm-ready');
}
