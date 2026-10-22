// Story mode: quick/explore switch (URL hash + sessionStorage), the mode kept on Previous/Next links, a guarded arrow-key
// project navigation (no Esc), and "Explore details" landing on the world's first demo.
const root = document.querySelector<HTMLElement>('[data-story-root]');
if (root) {
  const html = document.documentElement;
  const nextBase = root.dataset.next || '/#contact';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const segs = root.querySelectorAll<HTMLAnchorElement>('.story-seg');
  const links = root.querySelectorAll<HTMLAnchorElement>('a[data-story-link]');
  const bases = new Map<HTMLAnchorElement, string>();
  links.forEach((a) => bases.set(a, a.getAttribute('href') || ''));
  const apply = (mode: 'quick' | 'explore') => {
    html.setAttribute('data-story', mode);
    segs.forEach((s) => {
      if (s.dataset.storySet === mode) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current');
    });
    // Previous / Next / handoff keep the mode in the URL
    links.forEach((a) => a.setAttribute('href', `${(bases.get(a) || '').split('#')[0]}#${mode}`));
    root.dataset.next = nextBase === '/#contact' ? nextBase : `${nextBase.split('#')[0]}#${mode}`;
    if (root.dataset.prev) root.dataset.prev = `${root.dataset.prev.split('#')[0]}#${mode}`;
    try { sessionStorage.setItem('story-mode', mode); } catch {}
    // the explore half holds the page h1 and is hidden in quick mode: promote the quick heading so the page always exposes one h1
    const qh = document.getElementById('quick-h');
    if (qh) {
      if (mode === 'quick') qh.setAttribute('aria-level', '1'); else qh.removeAttribute('aria-level');
    }
  };
  const fromHash = () => (location.hash === '#explore' ? 'explore' : location.hash === '#quick' ? 'quick' : null);
  const initial = (html.getAttribute('data-story') as 'quick' | 'explore') || 'quick';
  apply(initial);
  const head = root.querySelector<HTMLElement>('.story-head')!;
  // Switching view is predictable: each view remembers where you left it and returns there; a view you have not seen lands at its top
  // (the strip stays in view). The "Explore details" button in Quick read goes to the world's first demo.
  const seen: Record<string, number> = {};
  root.querySelectorAll<HTMLElement>('[data-story-set]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = a.dataset.storySet as 'quick' | 'explore';
      const from = html.getAttribute('data-story') as 'quick' | 'explore';
      if (mode === from) return;
      seen[from] = scrollY;
      apply(mode);
      history.pushState(null, '', `#${mode}`);
      const sel = a.dataset.storyDemo;
      const demo = mode === 'explore' && sel ? document.querySelector<HTMLElement>(sel) : null;
      if (demo) demo.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      else if (seen[mode] != null) scrollTo(0, seen[mode]);
      else scrollTo(0, head.getBoundingClientRect().top + scrollY);
    });
  });
  // landing on #quick/#explore starts at the story header, not mid-page
  if (fromHash()) { scrollTo(0, 0); requestAnimationFrame(() => scrollTo(0, 0)); }
  const syncMode = () => {
    const mode = fromHash() || initial;
    const from = html.getAttribute('data-story') as 'quick' | 'explore';
    if (mode === from) return;
    seen[from] = scrollY;
    apply(mode);
    if (seen[mode] != null) scrollTo(0, seen[mode]);
  };
  addEventListener('popstate', syncMode);
  addEventListener('hashchange', syncMode);

  // Let links and ordinary buttons keep project shortcuts; editing and arrow-key widgets own their keys.
  const BLOCK = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role=slider],[role=tab],[role=tablist],[role=textbox],[role=listbox],[role=spinbutton],dialog[open],[role=dialog],[aria-modal=true]';
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const target = e.target as Element | null;
    if (document.querySelector('dialog[open],[aria-modal="true"]') || target?.closest(BLOCK)) return;
    const href = e.key === 'ArrowRight' ? root.dataset.next : root.dataset.prev;
    if (href) { e.preventDefault(); e.stopPropagation(); location.href = href; }
  }, { capture: true });
}
