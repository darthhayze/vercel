// LungScope page engine. Scroll position -> playhead -> clip layouts (lerped between scene layouts).
// Also: transport (Play moves the scroll), the leak test (drag or button), and the synthetic tone.
import { CLIPS, SUBJ, BIN, N, START, WEIGHTS, SUM, TR, TOTAL_S, geo, states, svg, delay, sceneP, playheadX, scenes, tf, type Counts, type Geo, type State, type Ch } from './daw';
import { createTone } from './tone';


const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (p: number) => { const s = Math.round(p * TOTAL_S); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** One drawn timeline (the live canvas, or one of the static frames) and a way to move its parts. */
class Canvas {
  svg: SVGSVGElement; g: Geo; st: State[]; els = new Map<string, SVGElement>(); off = new Map<string, number>(); order: string[] = [];
  constructor(svgEl: SVGSVGElement) {
    this.svg = svgEl;
    this.g = geo(Number(svgEl.dataset.w), Number(svgEl.dataset.h));
    this.st = states(this.g);
    svgEl.querySelectorAll<SVGElement>('[data-e]').forEach((e) => { this.els.set(e.dataset.e!, e); this.order.push(e.dataset.e!); });
  }
  put(id: string, ch: Ch) {
    const el = this.els.get(id); if (!el) return;
    const dy = this.off.get(id) ?? 0;
    el.setAttribute('transform', tf(dy ? { ...ch, y: ch.y + dy } : ch));
    el.setAttribute('opacity', String(Math.round(ch.o * 100) / 100)); el.setAttribute('visibility', ch.o < 0.02 ? 'hidden' : 'visible');
    if (/^[cut]\d+$/.test(id)) {
      const [a, b] = [el.children[0], el.children[1]];
      a?.classList.toggle('lit', ch.lit > 0.5); a?.setAttribute('opacity', String(Math.round((1 - ch.m) * 100) / 100));
      b?.classList.toggle('lit', ch.lit > 0.5); b?.setAttribute('opacity', String(Math.round(ch.m * 100) / 100));
    }
  }
  apply(state: State, p: number) {
    for (const id in state) this.put(id, state[id]);
    this.svg.querySelector('[data-ph]')?.setAttribute('transform', `translate(${Math.round(playheadX(this.g, p) * 10) / 10} 0)`);
  }
}

function sample(c: Canvas, p: number): { k: number; u: number; state: State } {
  let k = N - 1; while (k > 0 && p < START[k]) k--;
  const u = clamp((p - START[k]) / (WEIGHTS[k] / SUM));
  if (k === 0) return { k, u, state: c.st[0] };
  const tau = clamp(u / TR), a = c.st[k - 1], b = c.st[k], out: State = {};
  // Moves run first, exits fade at the start, entrances fade in once things have settled: text never lands on text mid-way.
  for (const id in b) {
    const x = a[id] ?? b[id], y = b[id], e = ease(clamp((tau - delay(id)) / 0.6));
    const fo = ease(y.o < x.o ? clamp(tau / 0.35) : clamp((tau - (id.startsWith('lane') ? 0.4 : 0.65)) / (id.startsWith('lane') ? 0.6 : 0.35)));
    out[id] = { x: x.x + (y.x - x.x) * e, y: x.y + (y.y - x.y) * e, r: x.r + (y.r - x.r) * e, s: x.s + (y.s - x.s) * e, sx: x.sx + (y.sx - x.sx) * e, o: x.o + (y.o - x.o) * fo, lit: e > 0.5 ? y.lit : x.lit, m: x.m + (y.m - x.m) * e };
  }
  return { k, u, state: out };
}

/** The leak test: pick or drag a subject lane toward a second bin. The project refuses. */
class Leak {
  sel = 0; busy = false; armed = false;
  constructor(private ctl: HTMLElement, private canvases: () => Canvas[], private onVoice: (i: number) => void, private outEl: () => HTMLElement | null) {
    ctl.querySelectorAll<HTMLButtonElement>('[data-bin]').forEach((b) => b.addEventListener('click', () => this.attempt(this.sel, Number(b.dataset.bin))));
  }
  private out(msg: string, no = false) { const o = this.outEl(); if (o) { o.textContent = msg; o.classList.toggle('no', no); } }
  refresh() {
    const s = SUBJ[this.sel];
    const lbl = this.ctl.querySelector('[data-ls-sel]'); if (lbl) lbl.textContent = `Subject ${s.k} (${BIN[s.bin].name})`;
    for (const c of this.canvases()) {
      c.svg.classList.toggle('ls-armed', this.armed);
      c.svg.querySelectorAll<SVGGElement>('.ls-lane').forEach((l) => {
        const i = Number(l.dataset.lane);
        l.classList.toggle('sel', i === this.sel);
        l.setAttribute('aria-pressed', String(i === this.sel));
        l.setAttribute('tabindex', this.armed ? '0' : '-1');
      });
    }
  }
  select(i: number, speak = true) {
    this.sel = clamp(i, 0, 5); this.onVoice(this.sel); this.refresh();
    if (speak) this.out(`Subject ${SUBJ[this.sel].k} is in ${BIN[SUBJ[this.sel].bin].name}.`);
  }
  mark(target: number, on: boolean) {
    for (const c of this.canvases()) {
      c.svg.querySelector(`[data-gh="${target}"]`)?.classList.toggle('refused', on);
      c.svg.querySelector(`[data-z="${target}"]`)?.classList.toggle('refused', on);
    }
  }
  hot(target: number) {
    for (const c of this.canvases()) c.svg.querySelectorAll('[data-z]').forEach((z) => z.classList.toggle('hot', Number((z as SVGElement).dataset.z) === target));
  }
  private ids(i: number) { return [`lane${i}`, `st${i}`, ...CLIPS.filter((k) => k.subj === i).map((k) => k.id)]; }
  /** a lifted lane draws above the others while it moves */
  private lift(i: number) {
    for (const c of this.canvases()) { const ph = c.svg.querySelector('[data-ph]'); for (const id of this.ids(i)) { const el = c.els.get(id); if (el && ph) c.svg.insertBefore(el, ph); } }
  }
  private settle() {
    for (const c of this.canvases()) { const ph = c.svg.querySelector('[data-ph]'); for (const id of c.order) { const el = c.els.get(id); if (el && ph) c.svg.insertBefore(el, ph); } }
  }
  private set(i: number, dy: number) {
    for (const c of this.canvases()) {
      const ids = this.ids(i);
      for (const id of ids) { c.off.set(id, dy); }
      const cur = c.st[5];
      for (const id of ids) c.put(id, cur[id]);
    }
  }
  private anim(ms: number, fn: (u: number) => void) {
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const step = (t: number) => { const u = clamp((t - t0) / ms); fn(u); if (u < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  async attempt(i: number, target: number, fromDy = 0) {
    if (this.busy) return;
    const s = SUBJ[i], own = s.bin;
    this.select(i, false);
    if (target === own) { this.out(`Subject ${s.k} already sits in ${BIN[own].name}.`); if (fromDy) await this.back(i, fromDy); return; }
    this.busy = true; this.lift(i);
    const c0 = this.canvases()[0], g = c0.g;
    const toY = (g.bin[target].y0 + g.bin[target].y1) / 2 - (g.y4[i] + g.laneH / 2);
    this.mark(target, true);
    this.out(`Refused. Subject ${s.k} is in ${BIN[own].name}, so ${s.k} cannot also sit in ${BIN[target].name}. One subject, one split.`, true);
    if (!reduced()) {
      if (!fromDy) await this.anim(220, (u) => this.set(i, toY * 0.5 * (1 - Math.pow(1 - u, 3))));
      const start = fromDy || toY * 0.5;
      await this.anim(760, (u) => this.set(i, start * Math.pow(1 - u, 2) * Math.cos(u * Math.PI * 2.3)));
    }
    this.set(i, 0); this.settle();
    window.setTimeout(() => this.mark(target, false), reduced() ? 2600 : 1500);
    this.busy = false;
  }
  private async back(i: number, from: number) {
    if (reduced()) { this.set(i, 0); this.settle(); return; }
    await this.anim(180, (u) => this.set(i, from * (1 - ease(u))));
    this.set(i, 0); this.settle();
  }
  /** pointer drag of a lane header */
  bind(c: Canvas) {
    const svgEl = c.svg;
    svgEl.addEventListener('pointerdown', (e) => {
      const lane = (e.target as Element).closest<SVGGElement>('.ls-lane');
      if (!lane || !this.armed || this.busy || e.button > 0) return;
      const i = Number(lane.dataset.lane); this.select(i, false);
      const r = svgEl.getBoundingClientRect(), k = r.height / c.g.H, y0 = e.clientY;
      let dy = 0; this.lift(i); svgEl.setPointerCapture(e.pointerId); svgEl.classList.add('ls-drag');
      const target = (cy: number) => { const y = (cy - r.top) / k; return c.g.bin.findIndex((b) => y >= b.y0 && y <= b.y1); };
      const move = (ev: PointerEvent) => {
        dy = (ev.clientY - y0) / k; this.set(i, dy);
        const t = target(ev.clientY); this.hot(t >= 0 && t !== SUBJ[i].bin ? t : -1);
      };
      const up = (ev: PointerEvent) => {
        svgEl.removeEventListener('pointermove', move); svgEl.removeEventListener('pointerup', up); svgEl.removeEventListener('pointercancel', up);
        svgEl.classList.remove('ls-drag'); this.hot(-1);
        const t = target(ev.clientY);
        if (ev.type === 'pointerup' && t >= 0 && t !== SUBJ[i].bin) this.attempt(i, t, dy);
        else if (Math.abs(dy) > 2) { this.out(`Subject ${SUBJ[i].k} is in ${BIN[SUBJ[i].bin].name}.`); this.back(i, dy); }
        else { this.out(`Subject ${SUBJ[i].k} is in ${BIN[SUBJ[i].bin].name}.`); this.settle(); }
      };
      svgEl.addEventListener('pointermove', move); svgEl.addEventListener('pointerup', up); svgEl.addEventListener('pointercancel', up);
    });
    svgEl.addEventListener('keydown', (e) => {
      const lane = (e.target as Element).closest<SVGGElement>('.ls-lane'); if (!lane || !this.armed) return;
      const i = Number(lane.dataset.lane);
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.select(i); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const n = clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, 5);
        svgEl.querySelector<SVGGElement>(`.ls-lane[data-lane="${n}"]`)?.focus(); this.select(n);
      }
    });
    svgEl.addEventListener('focusin', (e) => { const lane = (e.target as Element).closest<SVGGElement>('.ls-lane'); if (lane && this.armed) this.select(Number(lane.dataset.lane), false); });
  }
}

function boot(root: HTMLElement) {
  const counts: Counts = JSON.parse(root.dataset.counts!);
  const sc = scenes(counts);
  const live = document.documentElement.classList.contains('ls-live');
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const assign = $('[data-ls-assign]');
  const tone = createTone((on) => {
    toneBtn.setAttribute('aria-pressed', String(on)); toneT.textContent = on ? 'Stop' : 'Tone';
    root.classList.toggle('ls-tone-on', on); status(on ? 'Synthetic tone on.' : 'Synthetic tone off.');
  });
  const toneBtn = $('[data-ls-tone]'), toneT = $('[data-ls-tonet]'), vol = $<HTMLInputElement>('[data-ls-vol]'), statusEl = $('[data-ls-status]');
  let statusTimer = 0;
  const status = (m: string) => { window.clearTimeout(statusTimer); statusTimer = window.setTimeout(() => { statusEl.textContent = m; }, 350); };
  toneBtn.addEventListener('click', () => { if (tone.playing) tone.stop(); else tone.start(); });
  vol.addEventListener('input', () => tone.setVolume(Number(vol.value) / 100));
  tone.setVolume(Number(vol.value) / 100);
  window.addEventListener('pagehide', () => tone.stop());
  document.querySelector('[data-ls-start]')?.addEventListener('click', () => { if (!live) { const f = root.querySelector('.ls-fs'); f?.scrollIntoView({ block: 'start' }); } });

  if (!live) {
    // static frames: the leak test still works on the finished drawing of scene 6
    const slot = root.querySelector<HTMLElement>('[data-ls-flat-slot]');
    root.querySelector('#ls-leak')?.removeAttribute('id');
    root.querySelector('#ls-leak-flat')?.setAttribute('id', 'ls-leak');
    if (slot) {
      slot.append(assign); assign.removeAttribute('id'); assign.hidden = false;
      const cvs = [...root.querySelectorAll<SVGSVGElement>('[data-k="5"] svg.ls-svg')].map((s) => new Canvas(s));
      const leak = new Leak(assign, () => cvs, () => undefined, () => assign.querySelector<HTMLElement>('[data-ls-out]')); leak.armed = true;
      cvs.forEach((c) => leak.bind(c)); leak.refresh();
    }
    return;
  }

  // ---------- live ----------
  const stage = $('[data-ls-stage]'), track = $('[data-ls-track]'), host = $('[data-ls-canvas]');
  const titleEl = $('[data-ls-title]'), textEl = $('[data-ls-text]'), bigEl = $('[data-ls-big]'), bigL = $('[data-ls-biglabel]'), hintEl = $('[data-ls-hint]'), readEl = $('[data-ls-read]');
  const timeEl = $('[data-ls-time]'), playBtn = $('[data-ls-play]'), playT = $('[data-ls-playt]'), playI = $('[data-ls-playi]');
  let cv: Canvas | null = null, p = 0, shown = -1, lastP = -1, raf = 0, playing = false, paused5 = false;
  const leak = new Leak(assign, () => (cv ? [cv] : []), (i) => tone.setVoice(i), () => textEl);
  assign.hidden = true; assign.querySelector<HTMLElement>('[data-ls-out]')!.hidden = true;

  const range = () => track.offsetHeight - stage.offsetHeight;
  const trackTop = () => track.getBoundingClientRect().top + window.scrollY;
  const mount = () => {
    const w = host.clientWidth - 2 * parseFloat(getComputedStyle(host).paddingLeft || '0'), h = host.clientHeight;
    if (w < 200 || h < 200) return false;
    const W = Math.round(w), H = Math.round(h);
    if (cv && Number(cv.svg.dataset.w) === W && Number(cv.svg.dataset.h) === H) return true;
    const g = geo(W, H), st = states(g);
    host.innerHTML = svg(g, st[0], { counts, phx: playheadX(g, 0), interactive: true, label: 'Audio workstation timeline. Clips and lanes are drawn examples.' });
    cv = new Canvas(host.querySelector('svg')!);
    leak.bind(cv); lastP = -1; shown = -1; return true;
  };
  const showScene = (k: number) => {
    if (k === shown) return; shown = k;
    const s = sc[k];
    titleEl.textContent = s.title; textEl.textContent = s.text; textEl.classList.remove('no');
    const isLeak = k === 5;
    readEl.hidden = isLeak; hintEl.hidden = isLeak; assign.hidden = !isLeak;
    bigEl.textContent = s.big; bigL.textContent = s.label; hintEl.textContent = s.hint;
    leak.armed = isLeak; leak.refresh();
    if (!isLeak) tone.setVoice(Math.min(5, k)); else tone.setVoice(leak.sel);
    cv?.svg.querySelectorAll('.ls-mk').forEach((m) => m.classList.toggle('on', Number((m as SVGElement).dataset.k) === k));
    status(`${s.title}. ${s.text}`);
  };
  const render = () => {
    raf = 0;
    const r = range(); if (r <= 0 || !mount() || !cv) return;
    p = clamp(-track.getBoundingClientRect().top / r);
    if (Math.abs(p - lastP) < 1e-6 && cv) return; lastP = p;
    const { k, u, state } = sample(cv, p);
    cv.apply(state, p);
    showScene(u < 0.1 && k > 0 ? k - 1 : k);
    timeEl.textContent = fmt(p);
    if (playing) tick();
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(render); };
  window.addEventListener('scroll', queue, { passive: true });
  new ResizeObserver(() => { cv = cv && host.clientWidth ? cv : null; lastP = -1; queue(); }).observe(host);
  new ResizeObserver(() => { lastP = -1; queue(); }).observe(stage);

  // ---------- transport ----------
  const goto = (k: number) => {
    const y = k < 0 ? trackTop() : trackTop() + sceneP(Math.min(N - 1, k)) * range();
    window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const cur = () => { let k = N - 1; while (k > 0 && p < START[k] + (WEIGHTS[k] / SUM) * 0.3) k--; return k; };
  $('[data-ls-prev]').addEventListener('click', () => { stopPlay(); const k = cur(); goto(p > sceneP(k) + 0.004 ? k : k - 1); });
  $('[data-ls-next]').addEventListener('click', () => { stopPlay(); const k = cur(); if (k >= N - 1) window.scrollTo({ top: trackTop() + range() + stage.offsetHeight * 0.9, behavior: 'smooth' }); else goto(k + 1); });
  let last = 0;
  function tick() {
    const now = performance.now(), dt = Math.min(64, now - last); last = now;
    const rr = range(), np = clamp(p + dt / (TOTAL_S * 1000));
    if (p < sceneP(5) && np >= sceneP(5) && !paused5) { paused5 = true; window.scrollTo({ top: trackTop() + sceneP(5) * rr, behavior: 'instant' as ScrollBehavior }); stopPlay(); status('Your turn. Try to put a subject in a second bin.'); return; }
    if (np >= 0.999) { stopPlay(); return; }
    window.scrollTo({ top: trackTop() + np * rr, behavior: 'instant' as ScrollBehavior });
  }
  function startPlay() {
    if (p >= 0.995) window.scrollTo({ top: trackTop(), behavior: 'instant' as ScrollBehavior });
    if (p < sceneP(5) - 0.002) paused5 = false;
    playing = true; last = performance.now(); setPlayUi(); lastP = -1; queue();
  }
  function stopPlay() { if (!playing) return; playing = false; setPlayUi(); }
  function setPlayUi() {
    playBtn.setAttribute('aria-pressed', String(playing)); playT.textContent = playing ? 'Stop' : 'Play';
    playI.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${playing ? '<rect x="6" y="6" width="12" height="12" rx="2"/>' : '<path d="M7 4.5v15l12-7.5z"/>'}</svg>`;
  }
  playBtn.addEventListener('click', () => (playing ? stopPlay() : startPlay()));
  for (const ev of ['wheel', 'touchstart'] as const) window.addEventListener(ev, () => stopPlay(), { passive: true });
  window.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && !(e.target as HTMLElement).closest('button, input, [role="button"]')) stopPlay(); });
  // the tone also stops when the timeline is off screen
  new IntersectionObserver((es) => { if (!es[0].isIntersecting) { tone.stop(); stopPlay(); } }).observe(stage);
  queue();
}
const rootEl = document.querySelector<HTMLElement>('[data-ls-root]');
if (rootEl) boot(rootEl);
