// Stage player (src/components/stage). Scroll-driven stage activation, progress rail, Play / Pause / Replay, reduced motion.
// Each stage SVG is authored in its final frame; elements carry data-a="<kind> <start s> <dur s> <ease> [param]".
// We build one paused Web Animation per element, then set currentTime from the scroll position inside the stage's pinned track.
// Play / Pause / Replay drive the same time value on a real-time clock and keep the page scroll in step, so scroll stays the one source of truth.
// Reduced motion: nothing is built, every stage stays on its final frame.

import { EASE, num, keyframes } from './engine';
const SCRUB = 0.8; // share of the pinned scroll distance used to scrub; the rest holds the final frame
const LEAD = 0.3; // the stage starts playing when it is this share of the viewport height below the pin, so it never opens empty
interface Stage {
  track: HTMLElement;
  stage: HTMLElement;
  svg: SVGSVGElement;
  dur: number;
  anims: Animation[];
  built: boolean;
  t: number;
  play: HTMLButtonElement | null;
  replay: HTMLButtonElement | null;
}

function buildStage(st: Stage) {
  if (st.built) return;
  st.built = true;
  st.svg.querySelectorAll<SVGElement>('[data-a]').forEach((el) => {
    const [kind, s, d, e, ...rest] = (el.getAttribute('data-a') || '').split(' ');
    const start = num(s, 0) * 1000, dur = Math.max(1, num(d, 0.6) * 1000), easing = EASE[e] || EASE.out, param = rest.join(' ');
    if (kind === 'draw') {
      const shapes = el.matches('path,line,polyline,circle,ellipse,rect') ? [el] : Array.from(el.querySelectorAll<SVGElement>('path,line,polyline,circle,ellipse,rect'));
      shapes.forEach((sh) => {
        sh.setAttribute('pathLength', '1');
        const a = sh.animate([{ strokeDasharray: '1', strokeDashoffset: '1', opacity: 0, offset: 0 }, { strokeDasharray: '1', strokeDashoffset: '1', opacity: 1, offset: 0.02 }, { strokeDasharray: '1', strokeDashoffset: '0', opacity: 1, offset: 1 }], { delay: start, duration: dur, easing, fill: 'both' });
        a.pause(); st.anims.push(a);
      });
      return;
    }
    const kf = keyframes(kind, param);
    if (!kf) return;
    const a = el.animate(kf, { delay: start, duration: dur, easing: kind === 'trip' ? EASE.inout : easing, fill: 'both' });
    a.pause();
    st.anims.push(a);
  });
}

function setT(st: Stage, t: number) {
  st.t = t;
  const ms = Math.max(0, t) * 1000;
  for (const a of st.anims) a.currentTime = ms;
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-stage-root]');
  if (!root) return;
  root.classList.add('stg-js');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const tracks = Array.from(root.querySelectorAll<HTMLElement>('[data-stage-track]'));
  const stages: Stage[] = tracks.map((track) => ({
    track, stage: track.querySelector<HTMLElement>('.stg-stage')!, svg: track.querySelector<SVGSVGElement>('svg')!,
    dur: num(track.dataset.dur, 10), anims: [], built: false, t: 0,
    play: track.querySelector('[data-play]'), replay: track.querySelector('[data-replay]'),
  }));
  const rail = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-rail]'));
  const olEl = root.querySelector<HTMLElement>('.stg-ol');
  const mN = root.querySelector<HTMLElement>('[data-mn]'), mT = root.querySelector<HTMLElement>('[data-mtitle]');
  const prev = root.querySelector<HTMLAnchorElement>('[data-prev]'), next = root.querySelector<HTMLAnchorElement>('[data-next]');
  const N = stages.length;
  let active = 0, playing: Stage | null = null, last = 0, expectY = -1, raf = 0, live = false;

  const mobileBar = root.querySelector<HTMLElement>('.stg-m')!;
  const barPx = () => mobileBar.getBoundingClientRect().height;
  const measureBar = () => root!.style.setProperty('--bar', `${barPx()}px`);
  new ResizeObserver(measureBar).observe(mobileBar);
  measureBar();
  const scrubRange = (st: Stage) => st.track.offsetHeight - st.stage.offsetHeight;
  const trackTop = (st: Stage) => st.track.getBoundingClientRect().top + scrollY;
  const lead = () => innerHeight * LEAD;
  const yFor = (st: Stage, t: number) => trackTop(st) - barPx() - lead() + Math.min(1, t / st.dur) * (SCRUB * scrubRange(st) + lead());

  const setBtn = (st: Stage, on: boolean) => { if (st.play) st.play.textContent = on ? 'Pause' : 'Play stage'; };

  function stopPlay() { if (playing) { setBtn(playing, false); playing = null; } }

  function update() {
    raf = 0;
    const vh = innerHeight, bar = barPx();
    let act = 0;
    stages.forEach((st, i) => {
      const r = st.track.getBoundingClientRect();
      if (r.top <= vh * 0.5) act = i;
      if (!live || r.bottom < -vh || r.top > vh * 2) return;
      if (playing === st) return;
      buildStage(st);
      const range = scrubRange(st);
      const q = (bar + lead() - r.top) / (SCRUB * range + lead());
      setT(st, Math.min(1, Math.max(0, q)) * st.dur);
    });
    if (act !== active || !rail[0].dataset.init) { active = act; paintRail(); }
    const cur = stages[active], r = cur.track.getBoundingClientRect(), range = scrubRange(cur);
    const q = range > 0 ? Math.min(1, Math.max(0, (bar - r.top) / range)) : 0;
    olEl?.style.setProperty('--prog', Math.min(1, (active + (active < N - 1 ? q : 0)) / (N - 1)).toFixed(3));
  }

  function paintRail() {
    rail.forEach((a, i) => {
      a.dataset.init = '1';
      if (i === active) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-done', i < active);
    });
    if (mN) mN.textContent = `Stage ${active + 1} of ${N}`;
    if (mT) mT.textContent = (stages[active].track.querySelector('h2') as HTMLElement).textContent || '';
    if (prev) prev.setAttribute('href', active > 0 ? `#${stages[active - 1].track.id}` : `#${stages[0].track.id}`);
    if (next) next.setAttribute('href', active < N - 1 ? `#${stages[active + 1].track.id}` : `#${stages[N - 1].track.id}`);
  }

  const onScroll = () => {
    if (playing && expectY >= 0 && Math.abs(scrollY - expectY) > 4) stopPlay();
    if (!raf) raf = requestAnimationFrame(update);
  };

  function tick(now: number) {
    if (!playing) return;
    const st = playing;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    setT(st, st.t + dt);
    expectY = Math.round(yFor(st, st.t));
    scrollTo({ top: expectY, behavior: 'instant' as ScrollBehavior });
    if (st.t >= st.dur) { stopPlay(); return; }
    requestAnimationFrame(tick);
  }

  function startPlay(st: Stage, fromStart: boolean) {
    stopPlay();
    buildStage(st);
    if (fromStart || st.t >= st.dur - 0.05) {
      setT(st, 0);
      expectY = Math.round(yFor(st, 0));
      scrollTo({ top: expectY, behavior: 'instant' as ScrollBehavior });
    }
    playing = st; last = performance.now(); setBtn(st, true);
    requestAnimationFrame(tick);
  }

  stages.forEach((st) => {
    st.play?.addEventListener('click', () => (playing === st ? stopPlay() : startPlay(st, false)));
    st.replay?.addEventListener('click', () => startPlay(st, true));
  });

  function goLive() {
    if (live) return;
    live = true;
    root!.classList.add('stg-live');
    root!.querySelectorAll<HTMLElement>('.stg-ctl').forEach((c) => c.removeAttribute('hidden'));
    stages.forEach((st) => (st.play ? (st.play.textContent = 'Play stage') : null));
    update();
  }
  function goStatic() {
    live = false; stopPlay();
    root!.classList.remove('stg-live');
    root!.querySelectorAll<HTMLElement>('.stg-ctl').forEach((c) => c.setAttribute('hidden', ''));
    stages.forEach((st) => { st.anims.forEach((a) => a.cancel()); st.anims = []; st.built = false; });
    update();
  }
  if (!mq.matches) goLive();
  mq.addEventListener('change', () => (mq.matches ? goStatic() : goLive()));

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
  // build the first stage before it is on screen so it never flashes its final frame
  if (live) { buildStage(stages[0]); update(); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
