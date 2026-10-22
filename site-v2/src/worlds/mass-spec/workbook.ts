const workbook = document.querySelector<HTMLElement>('.ms-workbook');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (workbook) {
  const sheets = [...workbook.querySelectorAll<HTMLElement>('[data-ms-sheet]')];
  let current = -1;
  let queued = false;
  const show = (index: number) => {
    if (index === current) return;
    const moveFocus = sheets[current]?.contains(document.activeElement);
    current = index;
    sheets.forEach((sheet, i) => {
      sheet.toggleAttribute('data-ms-active', i === index);
      sheet.inert = i !== index && !reduced.matches;
    });
    const sheet = sheets[index];
    // Move focus with its sheet so hidden controls cannot retain keyboard focus.
    if (moveFocus) {
      const heading = sheet.querySelector<HTMLElement>('h2')!;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    if (!reduced.matches) {
      [...sheet.querySelectorAll<HTMLElement>('[data-ms-cell]')].forEach((cell, i) => {
        cell.animate([
          { opacity: .2, transform: sheet.id === 'ms-reshaped' ? 'scaleX(.25)' : 'translateY(8px)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 650, delay: Math.floor(i / 7) * 45, easing: 'ease-out' });
      });
      sheet.querySelector('[data-ms-points]')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650 });
    }
  };
  const travel = () => workbook.offsetHeight - workbook.querySelector<HTMLElement>('.ms-stage')!.offsetHeight;
  const readScroll = () => {
    queued = false;
    if (reduced.matches || !workbook.offsetHeight) return;
    show(Math.max(0, Math.min(sheets.length - 1, Math.round(-workbook.getBoundingClientRect().top / travel() * (sheets.length - 1)))));
  };
  const go = (id: string) => {
    const index = sheets.findIndex(sheet => sheet.id === id);
    if (index < 0) return;
    if (reduced.matches) { sheets[index].scrollIntoView({ block: 'start' }); return; }
    scrollTo({ top: workbook.getBoundingClientRect().top + scrollY + travel() * index / (sheets.length - 1), behavior: 'instant' });
    show(index);
  };
  for (const button of workbook.querySelectorAll<HTMLButtonElement>('[data-ms-next]')) {
    button.hidden = false;
    button.addEventListener('click', () => go(button.dataset.msNext!));
  }
  for (const tab of workbook.querySelectorAll<HTMLAnchorElement>('.ms-tabs a')) {
    tab.addEventListener('click', event => { event.preventDefault(); go(tab.hash.slice(1)); });
  }
  const configure = () => {
    workbook.classList.toggle('ms-scroll-story', !reduced.matches);
    sheets.forEach(sheet => { sheet.inert = false; });
    current = -1;
    if (!reduced.matches) readScroll();
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(readScroll); } }, { passive: true });
  addEventListener('resize', readScroll);
  reduced.addEventListener('change', configure);
  configure();
}
