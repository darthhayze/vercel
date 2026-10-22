import { FEATURES, plotX, plotY } from './data';

const stage = document.querySelector<HTMLElement>('#ms-volcano');
const controls = stage?.querySelector<HTMLElement>('[data-volcano-controls]');
if (stage && controls) {
  controls.hidden = false;
  const fold = controls.querySelector<HTMLInputElement>('#ms-fold')!;
  const p = controls.querySelector<HTMLInputElement>('#ms-p')!;
  const points = [...stage.querySelectorAll<SVGCircleElement>('[data-point]')];
  const inspect = (i: number) => {
    const f = FEATURES[i];
    stage.querySelector('[data-ms-id]')!.textContent = f.id;
    stage.querySelector('[data-ms-fc]')!.textContent = f.lfc.toFixed(2);
    stage.querySelector('[data-ms-pv]')!.textContent = f.p.toPrecision(3);
    points.forEach((point, index) => {
      point.toggleAttribute('data-inspected', index === i);
      point.setAttribute('tabindex', index === i ? '0' : '-1');
    });
  };
  points.forEach((point, i) => {
    point.setAttribute('tabindex', i === 0 ? '0' : '-1');
    point.setAttribute('role', 'button');
    point.addEventListener('pointerenter', () => inspect(i));
    point.addEventListener('focus', () => inspect(i));
    point.addEventListener('click', () => { inspect(i); point.focus(); });
    point.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(i); return; }
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      points[(i + step + points.length) % points.length].focus();
    });
  });
  const update = () => {
    const fc = Number(fold.value), pv = Number(p.value);
    controls.querySelector('#ms-fold-out')!.textContent = fc.toFixed(1);
    controls.querySelector('#ms-p-out')!.textContent = pv.toFixed(2);
    stage.querySelector('[data-fold-cut]')!.setAttribute('d', `M${plotX(-fc)} 26V330M${plotX(fc)} 26V330`);
    stage.querySelector('[data-p-cut]')!.setAttribute('d', `M54 ${plotY(-Math.log10(pv))}H574`);
    let count = 0;
    points.forEach((point, i) => {
      const f = FEATURES[i], passes = f.p < pv && Math.abs(f.lfc) >= fc;
      point.classList.toggle('ms-up', passes && f.lfc > 0);
      point.classList.toggle('ms-down', passes && f.lfc < 0);
      if (passes) count++;
    });
    controls.querySelector('[data-ms-count]')!.textContent = `${count} of ${FEATURES.length} illustrative features meet both cut-offs.`;
  };
  fold.addEventListener('input', update);
  p.addEventListener('input', update);
  update();
}
