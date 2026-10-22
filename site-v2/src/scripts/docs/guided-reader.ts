// GuidedReader behaviour. External script (CSP script-src 'self'); positions via element.style.setProperty (CSSOM, allowed).
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

function init(root: HTMLElement) {
  // inside DocTabs: hide non-first panels before revealing thumbnails, so a background tab never fetches images
  const panel = root.closest<HTMLElement>('.dt-panel');
  const dt = panel?.closest<HTMLElement>('.dt');
  if (panel && dt?.querySelector('.dt-list') && panel.dataset.slug !== dt.dataset.first) panel.hidden = true;
  const pages = Number(root.dataset.pages) || 1;
  const path = (root.dataset.path || '').split(',').filter(Boolean).map(Number);
  const scroll = root.querySelector<HTMLElement>('[data-scroll]')!;
  const pageEls = [...root.querySelectorAll<HTMLElement>('.gr-page')];
  const pins = [...root.querySelectorAll<HTMLButtonElement>('.gr-pin')];
  const notes = [...root.querySelectorAll<HTMLElement>('.gr-note')];
  const thumbs = [...root.querySelectorAll<HTMLButtonElement>('.gr-thumb')];
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const curEl = root.querySelector<HTMLElement>('[data-cur]')!;
  const zoomLabel = root.querySelector<HTMLElement>('[data-zoomlabel]')!;
  const fill = root.querySelector<HTMLElement>('[data-fill]')!;
  const progText = root.querySelector<HTMLElement>('[data-progtext]')!;
  const track = root.querySelector<HTMLElement>('.gr-track')!;
  const pinByN = new Map(pins.map((p) => [Number(p.dataset.n), p]));
  const order = notes.map((n) => Number(n.dataset.n));
  const pageOfNote = new Map(notes.map((n) => [Number(n.dataset.n), Number(n.dataset.page)]));

  let page = 1, zoom = 0, activeN: number | null = null, pathPos = -1;

  pins.forEach((p) => { p.style.setProperty('--x', p.dataset.x || '0'); p.style.setProperty('--y', p.dataset.y || '0'); });
  pins.forEach((p) => {
    if (!p.dataset.margin) return;
    const right = p.dataset.margin === 'right';
    p.style.setProperty('--mx', right ? '1' : '0');
    p.style.setProperty('--dir', right ? '1' : '-1');
    p.style.setProperty('--lead', String(Math.abs(Number(p.dataset.x) - (right ? 1 : 0))));
  });
  root.querySelectorAll<HTMLElement>('[data-js-only]').forEach((e) => e.removeAttribute('hidden'));
  root.classList.add('is-on');

  const behavior = (): ScrollBehavior => (reduce() ? 'auto' : 'smooth');

  function setZoom(i: number) {
    zoom = Math.max(0, Math.min(ZOOMS.length - 1, i));
    scroll.style.setProperty('--zoom', String(ZOOMS[zoom]));
    zoomLabel.textContent = Math.round(ZOOMS[zoom] * 100) + '%';
    if (activeN != null) centerPin(activeN, 'auto');
  }

  function setPage(p: number, resetScroll = true) {
    page = Math.max(1, Math.min(pages, p));
    pageEls.forEach((el) => el.classList.toggle('is-current', Number(el.dataset.page) === page));
    thumbs.forEach((t) => {
      const on = Number(t.dataset.goto) === page;
      t.classList.toggle('is-current', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    curEl.textContent = String(page);
    const cur = thumbs[page - 1];
    if (cur) {
      const strip = cur.closest<HTMLElement>('.gr-thumbs')!;
      strip.scrollTo({ left: cur.offsetLeft - strip.clientWidth / 2 + cur.clientWidth / 2, behavior: behavior() });
    }
    if (resetScroll) scroll.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // warm the neighbours
    if (root.getClientRects().length && (root.checkVisibility?.({ visibilityProperty: true }) ?? true)) [page + 1, page - 1].forEach((n) => pageEls[n - 1]?.querySelector('img')?.setAttribute('loading', 'eager'));
  }

  function centerPin(n: number, b: ScrollBehavior = behavior()) {
    const pin = pinByN.get(n); if (!pin) return;
    const frame = pin.parentElement as HTMLElement;
    const targetX = frame.clientWidth * Number(pin.dataset.x);
    const pinX = frame.offsetLeft + pin.offsetLeft;
    const midpoint = frame.offsetLeft + (pin.offsetLeft + targetX) / 2;
    const left = Math.min(pinX - 32, Math.max(pinX - scroll.clientWidth + 32, midpoint - scroll.clientWidth / 2));
    const top = frame.offsetTop + pin.offsetTop - scroll.clientHeight / 2;
    scroll.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: b });
  }

  function select(n: number | null, opts: { focus?: boolean; center?: boolean } = {}) {
    activeN = n;
    notes.forEach((x) => x.classList.toggle('is-active', Number(x.dataset.n) === n));
    pins.forEach((p) => { const on = Number(p.dataset.n) === n; p.classList.toggle('is-active', on); p.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    empty.hidden = n != null;
    if (n == null) return;
    const pg = pageOfNote.get(n)!;
    const changed = pg !== page;
    if (changed) setPage(pg, false);
    pathPos = path.indexOf(n);
    updateProgress();
    // wait a frame so a just-shown page has layout before we scroll to the pin
    requestAnimationFrame(() => { if (opts.center !== false) centerPin(n, changed ? 'auto' : behavior()); });
    if (opts.focus) pinByN.get(n)?.focus({ preventScroll: true });
  }

  function updateProgress() {
    const total = path.length;
    const done = pathPos >= 0 ? pathPos + 1 : 0;
    fill.style.setProperty('--p', total ? String(done / total) : '0');
    track.setAttribute('aria-valuenow', String(done));
    progText.textContent = pathPos >= 0 ? `Note ${activeN} · stop ${done} of ${total} on the path · page ${page}.` : total ? `${total} notes on the guided path. Page ${page} of ${pages}.` : `Page ${page} of ${pages}.`;
  }

  function step(dir: 1 | -1) {
    if (!order.length) return;
    const current = activeN == null ? -1 : order.indexOf(activeN);
    const i = current < 0 ? (dir === 1 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, current + dir));
    select(order[i]);
  }

  // Auto-tour: walks the guided path, one note per beat. Any other click/key stops it. Scrolling is instant under reduced motion.
  let tourTimer = 0;
  const tourBtn = root.querySelector<HTMLElement>('[data-act="tour"]');
  function stopTour() {
    if (!tourTimer) return;
    clearInterval(tourTimer); tourTimer = 0;
    tourBtn?.setAttribute('aria-pressed', 'false'); if (tourBtn) tourBtn.textContent = 'Start the guided tour';
  }
  function startTour() {
    if (!path.length) return;
    root.scrollIntoView({ block: 'nearest', behavior: behavior() });
    select(path[0]);
    tourBtn?.setAttribute('aria-pressed', 'true'); if (tourBtn) tourBtn.textContent = 'Stop the tour';
    tourTimer = window.setInterval(() => {
      if (document.hidden) return;
      if (panel?.hidden) { stopTour(); return; }
      if (pathPos >= path.length - 1) { stopTour(); return; }
      select(path[pathPos + 1]);
    }, 7000);
  }

  function goPage(p: number) {
    setPage(p);
    select(null);
    pathPos = -1; updateProgress();
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-act="tour"]')) { if (tourTimer) stopTour(); else startTour(); return; }
    stopTour();
    const pin = t.closest<HTMLElement>('.gr-pin');
    if (pin) { const n = Number(pin.dataset.n); select(activeN === n ? null : n, { center: false }); return; }
    const th = t.closest<HTMLElement>('[data-goto]');
    if (th) { goPage(Number(th.dataset.goto)); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    switch (act) {
      case 'start': select(order[0] ?? null); break;
      case 'note-next': step(1); break;
      case 'note-prev': step(-1); break;
      case 'page-next': goPage(page + 1); break;
      case 'page-prev': goPage(page - 1); break;
      case 'zoom-in': setZoom(zoom + 1); break;
      case 'zoom-out': setZoom(zoom - 1); break;
    }
  });

  root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select')) return;
    if (!el.closest('[data-act="tour"]')) stopTour();
    switch (e.key) {
      case ']': goPage(page + 1); break;
      case '[': goPage(page - 1); break;
      case 'n': step(1); break;
      case 'p': step(-1); break;
      case '+': case '=': setZoom(zoom + 1); break;
      case '-': case '_': setZoom(zoom - 1); break;
      case 'Escape': if (activeN != null) { const n = activeN; select(null); pinByN.get(n)?.focus({ preventScroll: true }); } else return; break;
      default: return;
    }
    e.preventDefault();
  });

  setZoom(0);
  setPage(pageOfNote.get(order[0]) ?? 1, true);
  select(order[0] ?? null, { center: false });
  updateProgress();
}

document.querySelectorAll<HTMLElement>('[data-gr]').forEach(init);
