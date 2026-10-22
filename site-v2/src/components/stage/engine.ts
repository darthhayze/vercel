// Stage engine: the standalone animation core of the stage kit. No DOM shell required.
// Any bespoke shell can import it: author SVG in its final frame with the glyph libraries (glyphs/*), tag parts with A(),
// then drive time yourself (scroll, a playhead, a button):
//   import { prepare } from '.../stage/engine'; const st = prepare(svgEl); st.setTime(2.4);   // seconds
// Label sizes: wrap the SVG in an element with class "stg" and import stage.css, or use LABEL_UNITS below.
export const EASE: Record<string, string> = {
  out: 'cubic-bezier(.16,1,.3,1)', inout: 'cubic-bezier(.65,0,.35,1)', in: 'cubic-bezier(.55,0,.85,.35)',
  soft: 'cubic-bezier(.34,1.4,.64,1)', lin: 'linear',
};
/** SVG text size in user units of an 800-wide viewBox, by container width: phone, tablet, desktop, wide (the kit sets --lbs to these) */
export const LABEL_UNITS = { phone: 34, tablet: 22, desktop: 20, wide: 18 } as const;
export const num = (s: string | undefined, d: number) => (s !== undefined && s !== '' && !Number.isNaN(+s) ? +s : d);

export function keyframes(kind: string, param: string): Keyframe[] | null {
  const px = (n: number) => `${n}px`;
  switch (kind) {
    case 'fade': return [{ opacity: 0 }, {}];
    case 'rise': return [{ opacity: 0, transform: `translateY(${px(num(param, 22))})` }, {}];
    case 'drop': return [{ opacity: 0, transform: `translateY(${px(-num(param, 60))})` }, {}];
    case 'pop': return [{ opacity: 0, transform: 'scale(.78)' }, {}];
    case 'move': { const [dx, dy] = param.split(',').map(Number); return [{ opacity: 0, transform: `translate(${px(dx || 0)},${px(dy || 0)})` }, {}]; }
    case 'zoom': { const [dx, dy, sc] = param.split(',').map(Number); return [{ transform: `translate(${px(dx)},${px(dy)}) scale(${sc})` }, {}]; }
    case 'spin': return [{ transform: 'rotate(0deg)' }, { transform: `rotate(${num(param, 360)}deg)` }];
    case 'gone': {
      let tr = 'translate(0px,0px)';
      if (param === 'drip') tr = 'translate(0px,38px)';
      else if (param.includes(',')) { const [dx, dy] = param.split(',').map(Number); tr = `translate(${px(dx)},${px(dy)})`; }
      return [{ opacity: 1, transform: 'translate(0px,0px)' }, { opacity: 0, transform: tr }];
    }
    case 'trip': {
      const path = document.querySelector<SVGGeometryElement>(param);
      if (!path) return null;
      const L = path.getTotalLength(), N = 28, kf: Keyframe[] = [];
      for (let i = 0; i <= N; i++) {
        const p = path.getPointAtLength((L * i) / N), f = i / N;
        kf.push({ offset: f, opacity: f < 0.1 ? f / 0.1 : f > 0.88 ? (1 - f) / 0.12 : 1, transform: `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)` });
      }
      return kf;
    }
    default: return null;
  }
}

export interface Prepared { anims: Animation[]; duration: number; setTime: (seconds: number) => void; finish: () => void }

/** build one paused Web Animation per [data-a] element under root; returns a controller. duration = latest end time in seconds. */
export function prepare(root: Element): Prepared {
  const anims: Animation[] = [];
  let end = 0;
  root.querySelectorAll<SVGElement>('[data-a]').forEach((el) => {
    const [kind, s, d, e, ...rest] = (el.getAttribute('data-a') || '').split(' ');
    const start = num(s, 0), dur = Math.max(0.001, num(d, 0.6)), easing = EASE[e] || EASE.out, param = rest.join(' ');
    end = Math.max(end, start + dur);
    if (kind === 'draw') {
      const shapes = el.matches('path,line,polyline,circle,ellipse,rect') ? [el] : Array.from(el.querySelectorAll<SVGElement>('path,line,polyline,circle,ellipse,rect'));
      shapes.forEach((sh) => {
        sh.setAttribute('pathLength', '1');
        const a = sh.animate([{ strokeDasharray: '1', strokeDashoffset: '1', opacity: 0, offset: 0 }, { strokeDasharray: '1', strokeDashoffset: '1', opacity: 1, offset: 0.02 }, { strokeDasharray: '1', strokeDashoffset: '0', opacity: 1, offset: 1 }], { delay: start * 1000, duration: dur * 1000, easing, fill: 'both' });
        a.pause(); anims.push(a);
      });
      return;
    }
    const kf = keyframes(kind, param);
    if (!kf) return;
    const a = el.animate(kf, { delay: start * 1000, duration: dur * 1000, easing: kind === 'trip' ? EASE.inout : easing, fill: 'both' });
    a.pause(); anims.push(a);
  });
  return { anims, duration: end, setTime: (t) => { const ms = Math.max(0, t) * 1000; for (const a of anims) a.currentTime = ms; }, finish: () => { for (const a of anims) a.finish(); } };
}
