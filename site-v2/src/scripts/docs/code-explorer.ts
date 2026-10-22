// CodeExplorer behaviour. External script (CSP script-src 'self').
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

import { ensureContrast } from './contrast';

function init(root: HTMLElement) {
  ensureContrast(root);
  const code = root.querySelector<HTMLElement>('[data-scroll]')!;
  const segEls = [...root.querySelectorAll<HTMLElement>('.ce-seg')];
  const mapBs = [...root.querySelectorAll<HTMLButtonElement>('.ce-map-b')];
  const notes = [...root.querySelectorAll<HTMLElement>('.ce-note')];
  const state = root.querySelector<HTMLElement>('[data-copystate]');
  const ids = segEls.map((s) => s.dataset.seg!);
  let cur = -1;

  root.querySelectorAll<HTMLElement>('[data-js-only]').forEach((e) => e.removeAttribute('hidden'));
  root.classList.add('is-on');
  mapBs.forEach((b) => b.style.setProperty('--span', b.dataset.span || '1'));

  function select(i: number, scrollCode = true) {
    if (!ids.length) return;
    cur = Math.max(0, Math.min(ids.length - 1, i));
    const id = ids[cur];
    segEls.forEach((s) => s.classList.toggle('is-active', s.dataset.seg === id));
    notes.forEach((n) => n.classList.toggle('is-active', n.dataset.seg === id));
    mapBs.forEach((b) => { const on = b.dataset.seg === id; b.classList.toggle('is-active', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (scrollCode) {
      const el = segEls[cur];
      const top = el.offsetTop - 8;
      const visible = top >= code.scrollTop && top + el.offsetHeight <= code.scrollTop + code.clientHeight;
      if (!visible) code.scrollTo({ top: Math.max(0, top), behavior: reduce() ? 'auto' : 'smooth' });
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'next') return select(cur + 1);
    if (act === 'prev') return select(cur - 1);
    if (act === 'copy') return void copy();
    const mb = t.closest<HTMLElement>('.ce-map-b');
    if (mb) return select(ids.indexOf(mb.dataset.seg!));
    const seg = t.closest<HTMLElement>('.ce-seg');
    if (seg) select(ids.indexOf(seg.dataset.seg!), false);
  });

  root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select')) return;
    const inCode = !!el.closest('.ce-code, .ce-map');
    let d = 0;
    if (e.key === 'j' || (inCode && e.key === 'ArrowDown')) d = 1;
    else if (e.key === 'k' || (inCode && e.key === 'ArrowUp')) d = -1;
    else if (inCode && e.key === 'Home') { e.preventDefault(); return select(0); }
    else if (inCode && e.key === 'End') { e.preventDefault(); return select(ids.length - 1); }
    if (!d) return;
    e.preventDefault();
    select(cur < 0 ? (d > 0 ? 0 : ids.length - 1) : cur + d);
  });

  async function copy() {
    const text = [...root.querySelectorAll<HTMLElement>('.ce-t')].map((l) => (l.textContent || '').replace(/​/g, '')).join('\n');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.className = 'sr-only'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    }
    const btn = root.querySelector<HTMLElement>('[data-act="copy"]')!;
    const label = btn.textContent;
    btn.textContent = ok ? 'Copied' : 'Failed';
    if (state) state.textContent = ok ? 'Code copied to clipboard' : 'Could not copy';
    setTimeout(() => { btn.textContent = label; }, 1600);
  }

  if (ids.length) select(0, false);
}

document.querySelectorAll<HTMLElement>('[data-ce]').forEach(init);
