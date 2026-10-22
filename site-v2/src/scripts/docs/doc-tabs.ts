// DocTabs behaviour: roving-tabindex ARIA tabs + #doc-<slug> deep links. External script (CSP).
function init(root: HTMLElement) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('.dt-tab')];
  const panels = [...root.querySelectorAll<HTMLElement>('.dt-panel')];
  if (tabs.length < 2) return;
  root.querySelectorAll<HTMLElement>('[data-js-only]').forEach((e) => e.removeAttribute('hidden'));
  root.classList.add('is-on');
  const slugs = tabs.map((t) => t.dataset.slug!);

  function show(slug: string, o: { focus?: boolean; hash?: boolean } = {}) {
    const i = Math.max(0, slugs.indexOf(slug));
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      const on = p.dataset.slug === slugs[i];
      p.hidden = !on;
    });
    if (o.focus) tabs[i].focus();
    if (o.hash) { try { history.replaceState(null, '', '#doc-' + slugs[i]); } catch { /* ignore */ } }
  }

  // which tab owns the current hash? #doc-<slug>, or an anchor inside a panel (e.g. a no-JS note link)
  function fromHash(): string | null {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return null;
    if (h.startsWith('doc-') && slugs.includes(h.slice(4))) return h.slice(4);
    const el = document.getElementById(h);
    return el?.closest<HTMLElement>('.dt-panel')?.dataset.slug ?? null;
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.slug!, { hash: true }));
    t.addEventListener('keydown', (e) => {
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      e.preventDefault();
      show(slugs[n], { focus: true, hash: true });
    });
  });

  const start = fromHash() ?? root.dataset.first ?? slugs[0];
  show(start);
  if (fromHash()) requestAnimationFrame(() => document.getElementById('doc-' + start)?.scrollIntoView({ block: 'start' }));
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s) show(s); });
}
document.querySelectorAll<HTMLElement>('[data-dt]').forEach(init);
