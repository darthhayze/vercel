const reduced = matchMedia('(prefers-reduced-motion: reduce)');
for (const chapter of document.querySelectorAll<HTMLElement>('[data-chapter]')) {
  if (reduced.matches) continue;
  const notes = [...chapter.querySelectorAll<HTMLElement>('[data-note]')];
  const papers = [...chapter.querySelectorAll<HTMLElement>('[data-paper]')];
  const select = (index: number) => {
    papers.forEach((paper, i) => {
      const wasHidden = paper.hidden;
      paper.hidden = i !== index;
      if (wasHidden && !paper.hidden) paper.querySelector('rect')?.animate(
        [{ opacity: 0, transform: 'translateY(2px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 260, easing: 'ease-out' },
      );
    });
    notes.forEach((note, i) => {
      note.dataset.active = String(i === index);
      note.querySelector('button')?.setAttribute('aria-pressed', String(i === index));
    });
  };
  chapter.dataset.enhanced = '';
  select(0);
  chapter.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(button => {
    button.addEventListener('click', () => select(Number(button.dataset.select)));
  });
  const observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting);
    if (entering.length) select(Number((entering[entering.length - 1].target as HTMLElement).dataset.note));
  }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
  notes.forEach(note => observer.observe(note));
}

// DocTabs reveals a hidden reader on hashchange; scroll after it becomes visible.
window.addEventListener('hashchange', () => {
  const panel = [...document.querySelectorAll<HTMLElement>('.rr-readers .dt-panel')]
    .find(panel => panel.id === location.hash.slice(1));
  if (panel) requestAnimationFrame(() => panel.scrollIntoView({ block: 'start' }));
});
