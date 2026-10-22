// ECG world client: scroll (or arrow keys) moves the probe along the signal chain; the scope screen shows the signal at the
// probe point; the code drawer follows; the threshold knob runs the Processing sketch's detector on the synthetic trace.
// Reduced motion: the probe snaps from point to point and every screen shows its final frame. No JS: see the static list.
import { NODES } from './nodes';
import { screen, loopReading, serialLine, monitorRaw } from './screens';
import { detect, summary, periodic, DUR } from './signal';

const root = document.querySelector<HTMLElement>('[data-sc]');
const track = root?.querySelector<HTMLElement>('[data-track]');
const pin = root?.querySelector<HTMLElement>('[data-pin]');
const inst = root?.querySelector<HTMLElement>('[data-inst]');
if (root && track && pin && inst) init(root, track, pin, inst);

function init(root: HTMLElement, track: HTMLElement, pin: HTMLElement, inst: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = <T extends HTMLElement = HTMLElement>(sel: string, r: ParentNode = root) => r.querySelector<T>(sel)!;
  const N = NODES.length, LAST = N - 1;
  const layers = { a: $<SVGGElement & HTMLElement>('[data-layer="a"]'), b: $<SVGGElement & HTMLElement>('[data-layer="b"]') };
  const chain = Array.from(root.querySelectorAll<HTMLButtonElement>('.ch-n'));
  const cap2t = $('[data-cap2-t]'), cap2 = $('[data-cap2]');
  const rAt = $('[data-r-at]'), rShows = $('[data-r-shows]'), rKey = $('[data-r-key]'), rLive = $('[data-r-live]');
  const desc = $('[data-scr-desc]');
  const drName = $('[data-dr-name]'), drCap = $('[data-dr-cap]'), drNo = $('[data-dr-no]'), chips = $('[data-chips]');
  const thrIn = $<HTMLInputElement>('#ecg-thr-in'), thrOut = $('#ecg-thr-out'), thrSay = $('[data-thr-say]'), knob = $('[data-knob]');
  const runBtn = $<HTMLButtonElement>('[data-run]');
  const pov = $<SVGSVGElement & HTMLElement>('[data-probe-svg]');

  root.classList.add('is-live');
  root.querySelectorAll<HTMLElement>('[data-js-only]').forEach((e) => e.removeAttribute('hidden'));

  let fs = 16;
  let thr = 450, still = reduce.matches, running = !reduce.matches, onscreen = true;
  let curRef: { doc: string; seg: string } = { doc: 'arduino', seg: 'pin' };
  let pT = 0, pD = 0, active = -1, t = 0, last = performance.now(), dirty = true, tRead = 0;
  let stepPx = 600, topPx = 0;

  /* ---------- scroll <-> probe position ---------- */
  const measure = () => {
    stepPx = Math.round(Math.max(420, innerHeight * 0.7));
    track.style.setProperty('--step', stepPx + 'px');
    topPx = parseFloat(getComputedStyle(pin).top) || 0;
    const svg = layers.a.ownerSVGElement;
    const nf = Math.round(Math.min(40, Math.max(16, (12.6 * 800) / (svg?.getBoundingClientRect().width || 800))));
    if (nf !== fs) { fs = nf; svg?.style.setProperty('--fs', fs + 'px'); svg?.style.setProperty('--fs-big', fs * 3 + 'px'); dirty = true; }
  };
  const scrollTarget = () => {
    const r = track.getBoundingClientRect();
    const q = Math.min(LAST, Math.max(0, (topPx - r.top) / stepPx));
    const k = Math.min(LAST - 1, Math.floor(q)), f = q - k;
    const e = f < 0.55 ? 0 : (() => { const u = (f - 0.55) / 0.45; return u * u * (3 - 2 * u); })();
    return q >= LAST ? LAST : k + e;
  };
  const moveTo = (i: number, smooth = true) => {
    i = Math.min(LAST, Math.max(0, i));
    const r = track.getBoundingClientRect();
    const y = scrollY + r.top - topPx + i * stepPx + 1;
    scrollTo({ top: y, behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
    pT = i; dirty = true;
  };
  addEventListener('scroll', () => { pT = scrollTarget(); dirty = true; }, { passive: true });

  /* ---------- the probe, its cable and the ground lead (decor) ---------- */
  type Pt = { x: number; y: number };
  let tps: Pt[] = [], bnc: Pt = { x: 0, y: 0 }, gnd: Pt = { x: 0, y: 0 };
  const geom = () => {
    const o = inst.getBoundingClientRect();
    pov.setAttribute('viewBox', `0 0 ${Math.round(o.width)} ${Math.round(o.height)}`);
    tps = chain.map((b) => { const r = b.querySelector('.tp')!.getBoundingClientRect(); return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top }; });
    const bn = $('[data-bnc]').getBoundingClientRect();
    const lane = $('[data-lane]').getBoundingClientRect();
    bnc = bn.width ? { x: bn.left + bn.width / 2 - o.left, y: bn.bottom - o.top - 2 } : { x: 26, y: lane.top - o.top };
    gnd = { x: Math.max(14, tps[0].x - 34), y: tps[0].y };
  };
  const drawProbe = () => {
    const lo = Math.min(LAST - 1, Math.floor(pD)), f = Math.min(1, pD - lo);
    const x = tps[lo].x + (tps[lo + 1].x - tps[lo].x) * f, y = tps[lo].y + (tps[lo + 1].y - tps[lo].y) * f;
    const hy = y - 70, dy = hy - bnc.y;
    const cable = `M${bnc.x} ${bnc.y}C${bnc.x} ${bnc.y + dy * 0.8} ${x} ${hy - dy * 0.8} ${x} ${hy}`;
    const lead = `M${x - 8} ${y - 26}C${x - 30} ${y - 26} ${gnd.x + 24} ${y - 10} ${gnd.x} ${y - 10}`;
    pov.innerHTML = `<path class="pv-cable" d="${cable}"/><path class="pv-lead" d="${lead}"/>
<g class="pv-gnd" transform="translate(${gnd.x} ${y})"><path d="M0 -10V2M-9 2H9M-6 7H6M-3 12H3"/></g>
<g transform="translate(${x} ${y})"><path class="pv-tip" d="M0 0L-2.4 -12H2.4Z"/><path class="pv-body" d="M-4 -12H4L10 -30V-62Q10 -66 6 -66H-6Q-10 -66 -10 -62V-30Z"/><rect class="pv-band" x="-10" y="-52" width="20" height="7"/><rect class="pv-grip" x="-5" y="-42" width="10" height="9" rx="2"/><path class="pv-clip" d="M-8 -26L-18 -28L-18 -22Z"/></g>`;
  };

  /* ---------- the screen ---------- */
  const strip = (s: string) => s.replace(/<text[^>]*>[^<]*<\/text>/g, '');
  const show = (layer: SVGGElement & HTMLElement, i: number, op: number, text = true) => {
    const m = screen(i, t, { thr, still, fs });
    layer.innerHTML = text ? m : strip(m);
    layer.setAttribute('opacity', String(op));
  };
  const render = () => {
    const lo = Math.min(LAST, Math.floor(pD)), fr = pD - lo;
    if (fr < 0.02 || lo >= LAST) { show(layers.a, lo, 1); layers.b.innerHTML = ''; layers.b.setAttribute('opacity', '0'); }
    else if (fr > 0.98) { show(layers.a, lo + 1, 1); layers.b.innerHTML = ''; layers.b.setAttribute('opacity', '0'); }
    else { show(layers.a, lo, 1 - fr, fr < 0.5); show(layers.b, lo + 1, fr, fr >= 0.5); }
  };

  /* ---------- readouts ---------- */
  const live = (i: number) => {
    const head = still ? 0.99 : (t % DUR) / DUR;
    if (i === 0) return 'small, noisy';
    if (i === 1) return 'amplified';
    if (i === 2) return `${Math.round(periodic(head * DUR))} of 1023`;
    if (i === 3) return `${loopReading(t, still)} counts`;
    if (i === 4) return serialLine(still ? 6.9 : t);
    if (i === 5) return `${monitorRaw(t, still)} counts`;
    const { bpm, flags } = detect(thr), n = flags.length;
    return `${bpm ? bpm + ' bpm' : '-- bpm'}, ${n} ${n === 1 ? 'flag' : 'flags'}`;
  };
  const readLive = () => { rLive.textContent = live(active); };

  /* ---------- the code drawer ---------- */
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));
  const showTab = (name: string, focus = false) => {
    tabs.forEach((b) => { const on = b.dataset.tab === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => showTab(b.dataset.tab!));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); e.stopPropagation();
      showTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].dataset.tab!, true);
    });
  });
  const openRef = (doc: string, seg: string, tries = 0) => {
    showTab(doc);
    const host = root.querySelector<HTMLElement>(`[data-panel="${doc}"]`);
    const ce = host?.querySelector<HTMLElement>('.ce');
    const btn = host?.querySelector<HTMLElement>(`.ce-map-b[data-seg="${seg}"]`);
    if (!ce?.classList.contains('is-on') || !btn) { if (tries < 40) setTimeout(() => openRef(doc, seg, tries + 1), 75); return; }
    btn.click();
  };
  const setChips = (i: number) => {
    const n = NODES[i];
    chips.replaceChildren();
    if (n.code.length < 2) { chips.hidden = true; return; }
    chips.hidden = false;
    n.code.forEach((r, k) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = r.label; b.setAttribute('aria-pressed', String(k === 0));
      b.addEventListener('click', () => { chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); curRef = r; openRef(r.doc, r.seg); });
      li.append(b); chips.append(li);
    });
  };

  /* ---------- a probe point becomes active ---------- */
  const activate = (i: number) => {
    if (i === active) return;
    active = i;
    const n = NODES[i];
    chain.forEach((b, k) => { b.classList.toggle('is-on', k === i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    rAt.textContent = n.at; rShows.textContent = n.shows; rKey.textContent = n.live;
    desc.textContent = n.desc;
    drName.textContent = n.title; drCap.textContent = n.caption; cap2t.textContent = n.title; cap2.textContent = n.caption;
    drNo.hidden = !n.nocode; if (n.nocode) drNo.textContent = n.nocode;
    inst.dataset.node = n.id;
    root.dataset.node = String(i);
    setChips(i);
    curRef = n.code[0] ?? { doc: 'arduino', seg: 'pin' };
    openRef(curRef.doc, curRef.seg);
    readLive();
  };

  /* ---------- threshold knob ---------- */
  const setThr = (v: number, fromUser: boolean) => {
    thr = v;
    thrOut.textContent = String(v);
    knob.setAttribute('transform', `rotate(${(-135 + ((v - 300) / 300) * 270).toFixed(1)} 24 24)`);
    thrSay.textContent = summary(v);
    if (fromUser && active !== LAST) moveTo(LAST);
    dirty = true; readLive();
  };
  thrIn.addEventListener('input', () => setThr(+thrIn.value, true));
  setThr(450, false);

  /* ---------- run / stop ---------- */
  const setRun = (on: boolean) => {
    running = on && !reduce.matches;
    runBtn.setAttribute('aria-pressed', String(!running));
    runBtn.querySelector('span')!.textContent = running ? 'Run' : 'Stopped';
    runBtn.classList.toggle('is-stop', !running);
    dirty = true; last = performance.now();
  };
  runBtn.addEventListener('click', () => { if (reduce.matches) return; setRun(!running); });
  if (reduce.matches) { runBtn.hidden = true; }

  /* ---------- phone and tablet: scope or code in the one pinned panel ---------- */
  const viewBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-view-btn]'));
  viewBtns.forEach((b) => b.addEventListener('click', () => {
    pin.dataset.view = b.dataset.viewBtn;
    viewBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    requestAnimationFrame(() => { geom(); dirty = true; if (b.dataset.viewBtn === 'code') openRef(curRef.doc, curRef.seg); });
  }));
  pin.dataset.view = 'scope';

  /* ---------- clicks and keys ---------- */
  chain.forEach((b) => b.addEventListener('click', () => moveTo(+b.dataset.i!)));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, [role="tab"], .ce-code') || el.isContentEditable) return;
    if ((e.key === 'Home' || e.key === 'End') && !el.closest('[data-chain]')) return;
    const r = track.getBoundingClientRect();
    if (r.top > topPx + 6 || r.bottom < innerHeight * 0.6) return; // only while the scope is pinned in view
    const cur = Math.round(pT);
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? LAST : cur + (e.key === 'ArrowDown' ? 1 : -1);
    if (to < 0 || to > LAST) return;
    e.preventDefault();
    moveTo(to);
  });
  const hash = () => { if (location.hash === '#demo') { measure(); moveTo(LAST, false); } };
  addEventListener('hashchange', hash);

  /* ---------- frame loop ---------- */
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (running && onscreen) { t += dt; dirty = true; }
    const target = reduce.matches ? Math.round(pT) : pT;
    const nd = reduce.matches ? target : pD + (target - pD) * Math.min(1, dt * 9);
    if (Math.abs(nd - pD) > 0.0005 || dirty) {
      pD = Math.abs(target - nd) < 0.004 ? target : nd;
      activate(Math.round(pD));
      if (onscreen) { render(); drawProbe(); }
      dirty = Math.abs(target - pD) > 0.0005;
      tRead += dt; if (tRead > 0.12) { tRead = 0; readLive(); }
    }
    requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => { onscreen = es[0].isIntersecting; if (onscreen) { last = performance.now(); dirty = true; } }, { threshold: 0 }).observe(track);
  reduce.addEventListener('change', () => { still = reduce.matches; setRun(!reduce.matches); runBtn.hidden = reduce.matches; dirty = true; });
  addEventListener('resize', () => { measure(); geom(); pT = scrollTarget(); dirty = true; });

  measure(); geom(); pT = scrollTarget(); pD = pT;
  document.fonts?.ready.then(() => { geom(); dirty = true; });
  addEventListener('load', () => { measure(); geom(); pT = scrollTarget(); dirty = true; });
  setRun(running);
  if (location.hash === '#demo') requestAnimationFrame(hash);
  requestAnimationFrame(frame);
}
