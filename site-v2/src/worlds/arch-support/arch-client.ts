// Arch-support world: motion and interaction.
// One reveal engine (declarative: data-rise / data-draw + data-d delay), the raise-the-arch spring, the Build scrubber
// (scroll, drag, or Replay) and the test schematic. Everything is time-based WAAPI or Motion.
// Reduced motion: every element shows its final state and nothing is driven by scroll or time.
import { animate } from 'motion';
import { fillD, outlineD, soleD, cavityD, fasciaD, bones, callouts, passes, dim, printD, wordsFor } from './foot';

(window as any).__asReady = true;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)';
const EASE_IO = 'cubic-bezier(.65, 0, .35, 1)';
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/* ============ reveal engine: staggered waterfall with decelerating curves ============ */
function reveal(root: Element) {
  const els = $$('[data-rise],[data-draw]', root).filter((el) => el.closest('[data-seq]') === root);
  for (const el of els) {
    const d = Number((el as HTMLElement).dataset.d ?? 0);
    const wasOff = el.classList.contains('is-off');
    el.classList.add('is-in');
    if (reduce || el.closest('.as-scroll')) continue;
    if (el.hasAttribute('data-draw')) {
      if (el.closest('.foot--build')) continue; // scrubbed by the Build control instead
      const isPass = el.classList.contains('tp');
      if (wasOff) continue;
      el.animate(
        [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 1, opacity: 1, offset: 0.02 }, { strokeDashoffset: 0, opacity: 1 }],
        { duration: isPass ? 480 : Number((el as HTMLElement).dataset.t ?? 1100), delay: d, easing: isPass ? EASE_IO : EASE_IO, fill: 'backwards' },
      );
    } else {
      el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay: d, easing: EASE_OUT, fill: 'backwards' });
    }
  }
}
const seqHooks: Record<string, (el: HTMLElement) => void> = {};
const observers = new Map<string, IntersectionObserver>();
function watchSeq() {
  for (const el of $$('[data-seq]')) {
    const margin = el.dataset.margin ?? '-12%';
    let io = observers.get(margin);
    if (!io) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io!.unobserve(e.target);
          const t = e.target as HTMLElement;
          reveal(t);
          seqHooks[t.dataset.seq!]?.(t);
        }
      }, { rootMargin: `0px 0px ${margin} 0px`, threshold: 0 });
      observers.set(margin, io);
    }
    io.observe(el);
  }
}

/* ============ foot painter: one function morphs contour, bones, labels, layers and dimension ============ */
interface FootRefs {
  svg: SVGSVGElement; fill?: SVGElement; out?: SVGElement; arch?: SVGElement; fascia?: SVGElement; pouch?: SVGElement; pocket?: SVGElement; sleeve?: SVGElement;
  bones: Map<string, SVGElement>; leads: Map<string, { l: SVGElement; d: SVGElement }>; tp: SVGLineElement[]; on: boolean[];
  dimG?: SVGElement; dimLines: SVGElement[]; dimTop?: SVGElement;
}
function refs(svg: SVGSVGElement): FootRefs {
  const r = (n: string) => svg.querySelector<SVGElement>(`[data-r="${n}"]`) ?? undefined;
  const bonesMap = new Map<string, SVGElement>();
  $$('[data-b]', svg).forEach((b) => bonesMap.set(b.dataset.b!, b as unknown as SVGElement));
  const leads = new Map<string, { l: SVGElement; d: SVGElement }>();
  $$('[data-co]', svg).forEach((g) => leads.set(g.dataset.co!, { l: g.querySelector('[data-r="lead"]') as SVGElement, d: g.querySelector('[data-r="dot"]') as SVGElement }));
  const tp = $$<SVGLineElement>('[data-r="tp"]', svg);
  return { svg, fill: r('fill'), out: r('out'), arch: r('arch'), fascia: r('fascia'), pouch: r('pouch'), pocket: r('pocket'), sleeve: r('sleeve'), bones: bonesMap, leads, tp, on: tp.map((t) => !t.classList.contains('is-off')), dimG: r('dim'), dimLines: $$('[data-d-line]', svg) as unknown as SVGElement[], dimTop: svg.querySelector<SVGElement>('[data-d-top]') ?? undefined };
}
function paintFoot(R: FootRefs, h: number, drawNew = false) {
  const set = (el: SVGElement | undefined, d: string) => el?.setAttribute('d', d);
  set(R.fill, fillD(h)); set(R.out, outlineD(h)); set(R.arch, soleD(h)); set(R.fascia, fasciaD(h)); set(R.pouch, cavityD(h)); set(R.pocket, cavityD(h)); set(R.sleeve, outlineD(h));
  for (const b of bones(h)) {
    const el = R.bones.get(b.id);
    if (el && b.tf) el.setAttribute('transform', b.tf);
    else if (el) el.setAttribute('d', b.d);
  }
  for (const c of callouts(h)) {
    const ld = R.leads.get(c.id);
    if (!ld) continue;
    ld.l.setAttribute('x2', String(c.ex)); ld.l.setAttribute('y2', String(c.ey));
    ld.d.setAttribute('cx', String(c.ex)); ld.d.setAttribute('cy', String(c.ey));
  }
  const P = passes(h);
  P.forEach((p, i) => {
    const t = R.tp[i]; if (!t) return;
    t.setAttribute('x1', String(p.x1)); t.setAttribute('x2', String(p.x2));
    if (p.on !== R.on[i]) {
      R.on[i] = p.on; t.classList.toggle('is-off', !p.on);
      if (p.on && drawNew && !reduce) t.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 260, easing: EASE_OUT });
    }
  });
  if (R.dimG) {
    const D = dim(h);
    R.dimG.classList.toggle('is-off', D.off);
    R.dimLines.forEach((l) => l.setAttribute('y1', String(D.y)));
    R.dimTop?.setAttribute('y1', String(D.y)); R.dimTop?.setAttribute('y2', String(D.y));
  }
}

// Scroll owns progress only while the page moves; direct controls keep their value at rest.
function scrub(root: HTMLElement, paint: (progress: number) => void) {
  if (reduce) return;
  root.classList.add('as-scroll');
  $$('[data-rise],[data-draw]', root).forEach((el) => el.classList.add('is-in'));
  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = root.getBoundingClientRect();
    if (rect.height <= 0) return;
    const endSpace = matchMedia('(max-width: 61.99rem)').matches ? 1 : 0.7;
    const travel = Math.max(1, rect.height - innerHeight * endSpace);
    paint(clamp01((innerHeight * 0.18 - rect.top) / travel));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  schedule();
}

/* ============ 1. hero + section sequences ============ */

/* ============ 2. raise the arch: direct manipulation, spring-eased visuals ============ */
const lab = $('[data-lab]');
if (lab) {
  const input = $<HTMLInputElement>('.as-arch', lab)!;
  const R = refs($<SVGSVGElement>('svg[data-foot="lab"]', lab)!);
  const printSvg = $<SVGSVGElement>('svg[data-print-svg="lab"]', lab)!;
  const pFill = $('[data-r="pfill"]', printSvg) as unknown as SVGElement;
  const pLine = $('[data-r="pline"]', printSvg) as unknown as SVGElement;
  const out = $('[data-archout]', lab)!;
  let cur = 0.7, vel = 0, tgt = 0.7, raf = 0, last = 0, spoken = out.textContent ?? '';
  const paint = (h: number) => {
    const hh = clamp01(h);
    paintFoot(R, hh, true);
    const d = printD(hh); pFill.setAttribute('d', d); pLine.setAttribute('d', d);
    lab.dataset.h = hh < 0.12 ? 'flat' : 'up';
  };
  const speak = (h: number) => {
    const w = wordsFor(h);
    if (w !== spoken) { spoken = w; out.textContent = w; }
    input.setAttribute('aria-valuetext', `${Math.round(h * 100)} percent. ${w.split('.')[0]}`);
  };
  // critically-damped spring, slight overshoot (damping ratio ~0.8): the input answers on the first frame, the picture follows with weight
  const K = 300, C = 2 * Math.sqrt(K) * 0.8;
  const step = (t: number) => {
    const dt = Math.min(0.034, (t - last) / 1000); last = t;
    vel += (K * (tgt - cur) - C * vel) * dt; cur += vel * dt;
    paint(cur);
    if (Math.abs(tgt - cur) < 0.0005 && Math.abs(vel) < 0.005) { cur = tgt; paint(cur); raf = 0; return; }
    raf = requestAnimationFrame(step);
  };
  const go = (h: number) => {
    tgt = h; speak(h);
    if (reduce) { cur = h; paint(h); return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  };
  input.addEventListener('input', () => go(Number(input.value) / 100));
  paint(0.7); speak(0.7);
  const story = lab.closest<HTMLElement>('[data-anatomy-story]')!;
  scrub(story, (progress) => {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    cur = progress * 0.7; tgt = cur; vel = 0;
    input.value = String(Math.round(cur * 100));
    paint(cur); speak(cur);
  });
  new IntersectionObserver((es) => es.forEach((e) => lab.classList.toggle('is-idle', e.isIntersecting))).observe(lab);
}

/* ============ 3. build: sleeve, pocket, insert layers, strap ============ */
const bsplit = $('[data-bsplit]');
if (bsplit) {
  const svg = $<SVGSVGElement>('svg[data-foot="build"]', bsplit)!;
  const R = refs(svg);
  const sleeve = R.sleeve!, pocket = R.pocket!, strap = svg.querySelector<SVGElement>('[data-r="strap"]')!;
  const nozzle = svg.querySelector<SVGElement>('[data-r="nozzle"]')!;
  const cos = new Map<string, SVGElement>($$('[data-co]', svg).map((g) => [g.dataset.co!, g as unknown as SVGElement]));
  const stepEls = $$('[data-step]', bsplit);
  const stepsList = $('[data-steps]', bsplit)!;
  const state = $('[data-bstate]', bsplit)!;
  const ctl = $('[data-bctl]', bsplit)!;
  const range = $<HTMLInputElement>('.as-buildrange', bsplit)!;
  const replay = $<HTMLButtonElement>('[data-replay]', bsplit)!;
  const lines = R.tp.filter((_, i) => R.on[i]);
  const N = lines.length;
  const W = [0.2, 0.14, 0.5, 0.16]; // share of the slider for sleeve, pocket, insert, strap
  const start = [0, W[0], W[0] + W[1], W[0] + W[1] + W[2]];
  const NAMES = ['Sleeve', 'Pocket', 'Insert', 'Strap'];
  const setDraw = (el: Element, q: number) => { const s = (el as HTMLElement | SVGElement).style; s.strokeDashoffset = String(1 - q); s.opacity = q > 0.002 ? '1' : '0'; };
  let q = [1, 1, 1, 1];
  const apply = (nq: number[]) => {
    q = nq;
    setDraw(sleeve, easeOut(q[0])); setDraw(pocket, easeIO(q[1])); setDraw(strap, easeOut(q[3]));
    const span = q[2] * N;
    lines.forEach((l, i) => setDraw(l, easeIO(clamp01(span - i))));
    // the nozzle rides the head of the active pass
    const i = Math.min(N - 1, Math.floor(span));
    if (q[2] > 0.001 && q[2] < 0.999) {
      const l = lines[i], f = easeIO(clamp01(span - i));
      const x1 = Number(l.getAttribute('x1')), x2 = Number(l.getAttribute('x2')), y = Number(l.getAttribute('y1'));
      nozzle.setAttribute('cx', String(x1 + (x2 - x1) * f)); nozzle.setAttribute('cy', String(y));
      (nozzle as unknown as HTMLElement).style.opacity = '1';
    } else (nozzle as unknown as HTMLElement).style.opacity = '0';
    const on = [q[0] > 0.01, q[1] > 0.01, q[2] > 0.01, q[3] > 0.01];
    cos.forEach((g, id) => g.classList.toggle('is-on', on[{ sleeve: 0, pocket: 1, insert: 2, strap: 3 }[id as 'sleeve'] ?? 0]));
    let act = 0; q.forEach((v, k) => { if (v > 0.001) act = k; });
    const all = q.every((v) => v >= 0.999);
    state.textContent = all ? 'Sleeve, pocket, insert and strap' : act === 2 ? `Insert: layer ${Math.max(1, Math.min(N, Math.ceil(span)))} of ${N}` : q.every((v) => v <= 0.001) ? 'Bare foot' : NAMES[act];
    stepEls.forEach((s, k) => { s.dataset.active = String(!all && k === act); s.dataset.done = String(q[k] > 0.02); });
    stepsList.toggleAttribute('data-live', !all);
    const v = Math.round(q.reduce((a, b, k) => a + W[k] * b, 0) * 100);
    range.value = String(v);
    range.setAttribute('aria-valuetext', all ? 'Complete' : state.textContent!);
  };
  const fromValue = (v: number) => W.map((w, k) => clamp01((v / 100 - start[k]) / w));
  apply([1, 1, 1, 1]);

  let playing: { stop: () => void } | null = null;
  ctl.hidden = false;
  if (reduce) replay.hidden = true;
  range.addEventListener('input', () => { playing?.stop(); playing = null; apply(fromValue(Number(range.value))); });
  const play = () => {
    playing?.stop();
    const c = animate(0, 100, { duration: 5.2, ease: [0.45, 0, 0.25, 1], onUpdate: (v) => apply(fromValue(v)), onComplete: () => { playing = null; } });
    playing = { stop: () => c.stop() };
  };
  replay.addEventListener('click', () => play());

  scrub(bsplit, (progress) => {
    playing?.stop(); playing = null;
    apply(fromValue(progress * 100));
  });
}

/* ============ 4. test schematic: weight lowers and holds, weight drops ============ */
const tests = $('[data-tests]');
if (tests && !reduce) {
  const hold = $<SVGElement>('[data-t-weight="hold"]', tests)!, drop = $<SVGElement>('[data-t-weight="drop"]', tests)!;
  const ins1 = $<SVGElement>('[data-t-insert]', tests)!, ins2 = $<SVGElement>('[data-t-insert2]', tests)!;
  const timer = $<SVGElement>('[data-t-timer]', tests)!;
  const btn = $<HTMLButtonElement>('[data-replay-test]', tests)!;
  const run = () => {
    btn.disabled = true;
    // static hold: lowers slowly, insert compresses a little, timer fills, weight rests
    hold.animate([{ transform: 'translateY(-56px)' }, { transform: 'translateY(0)' }], { duration: 900, delay: 200, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'backwards' });
    ins1.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.93)', offset: 0.12 }, { transform: 'scaleY(.93)', offset: 0.9 }, { transform: 'scaleY(1)' }], { duration: 3600, delay: 1000, easing: EASE_OUT, fill: 'backwards' });
    timer.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 2600, delay: 1000, easing: 'linear', fill: 'backwards' });
    // drop: gravity curve in, squash and rebound on impact
    const fall = drop.animate([{ transform: 'translateY(-92px)' }, { transform: 'translateY(0)' }], { duration: 460, delay: 700, easing: 'cubic-bezier(.55, 0, 1, .45)', fill: 'backwards' });
    ins2.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.86)', offset: 0.28 }, { transform: 'scaleY(1)' }], { duration: 520, delay: 1160, easing: EASE_OUT, fill: 'backwards' });
    drop.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 520, delay: 1160, easing: 'cubic-bezier(.3, 0, .4, 1)' });
    void fall;
    setTimeout(() => { btn.disabled = false; }, 4700);
  };
  btn.hidden = false;
  btn.addEventListener('click', run);
  seqHooks['test-fig'] = () => setTimeout(run, 400);
}
watchSeq();
