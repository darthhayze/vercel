// Runtime AA guard for code tokens. Reads the world's computed colours (so it works with any palette);
// if any token drops below 4.5:1 against the world's --ground or --panel, root gets data-hc and docs.css
// swaps in the high-contrast token set (plain --fg, differentiated by weight/style).
function rgb(css: string): [number, number, number] | null {
  const m = css.match(/(?:rgba?|color)\(\s*(?:srgb\s+)?([\d.\s,%/-]+)\)/);
  if (!m) return null;
  const n = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  if (n.length < 3 || n.some(Number.isNaN)) return null;
  const f = css.startsWith('color(') ? 255 : 1;
  return [n[0] * f, n[1] * f, n[2] * f];
}
const lum = (c: [number, number, number]) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a: [number, number, number], b: [number, number, number]) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export function ensureContrast(root: HTMLElement) {
  const cs = getComputedStyle(root);
  const probe = document.createElement('span');
  probe.style.position = 'absolute'; probe.style.visibility = 'hidden';
  root.appendChild(probe);
  const grab = (cls: string) => { probe.className = cls; return rgb(getComputedStyle(probe).color); };
  const bgs = ['--panel', '--ground'].map((v) => { probe.style.color = `var(${v})`; probe.className = ''; return rgb(getComputedStyle(probe).color); }).filter(Boolean) as [number, number, number][];
  probe.style.color = '';
  const toks = ['k-kw', 'k-ty', 'k-fn', 'k-num', 'k-str', 'k-cm', 'k-pp'].map(grab).filter(Boolean) as [number, number, number][];
  probe.remove();
  void cs;
  if (!bgs.length || !toks.length) return;
  if (toks.some((t) => bgs.some((b) => ratio(t, b) < 4.5))) root.setAttribute('data-hc', '');
}
