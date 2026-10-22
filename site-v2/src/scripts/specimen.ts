// Home: hero halftone lens (decorative). No Motion dependency here.

// Preserve the original site's evidence bookmark.
if (location.hash === '#evidence') location.replace('/evidence/');

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// Hero halftone lens (decorative). Lazy: after load and idle. A pre-rendered frame of the same field stays underneath as the
// fallback (no JS, no canvas). Reduced motion gets one still frame, drawn live so the text exclusion fits the layout.
const wire = document.querySelector<HTMLElement>('[data-wire]');
if (wire) {
  let stop: (() => void) | null = null, booting = false;
  const hint = document.querySelector<HTMLElement>('[data-paint-hint]');
  const boot = async () => {
    if (stop || booting) return;
    booting = true;
    try {
      const mod = await import('./field');
      stop = mod.startField(wire, { still: reduce.matches, onFirstInteract: () => hint?.classList.add('gone'), maskEls: () => Array.from(wire.parentElement!.querySelectorAll('[data-mask]')) });
      if (stop) requestAnimationFrame(() => wire.classList.add('is-live'));
    } catch (e) { console.error(e); }
    booting = false;
  };
  reduce.addEventListener('change', () => { stop?.(); stop = null; wire.classList.remove('is-live'); boot(); });
  const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: object) => void);
  const first = () => { idle ? idle(boot, { timeout: 1200 }) : setTimeout(boot, 250); };
  if (document.readyState === 'complete') first(); else addEventListener('load', first, { once: true });
}
