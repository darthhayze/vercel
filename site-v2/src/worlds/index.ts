// World registry: slug -> template, palette, title, og colour.
// A world lives in src/worlds/<slug>/World.astro (props: { slug, c }). /work/[slug] picks it up automatically
// (import.meta.glob), and falls back to src/worlds/_Fallback.astro (built from cases.json) when it is missing.
// Palettes become /worlds/<slug>.css (CSP-safe: no inline styles). Only these roles are re-pointed; the nav/footer stay yellow/ink.
export interface Palette {
  ground: string;   // page background
  fg: string;       // running text
  panel: string;    // raised/secondary surface
  acc: string;      // main accent (large fields, links, rules)
  onAcc: string;    // text on a field of `acc`
  acc2: string;     // second accent (highlights)
  mute: string;     // secondary text, AA on ground and panel
  focus?: string;   // focus ring colour (default: fg)
}
export interface WorldDef {
  slug: string;
  title: string;
  /** path of the world template, relative to src/ */
  component: string;
  palette: Palette;
  /** CSS font-family for --font-accent (the world's own accent face; load it in the world). Falls back to Caveat. */
  fontAccent?: string;
  /** <meta name="theme-color"> and share colour */
  ogColor: string;
  /** `dark` worlds get color-scheme: dark (form controls, scrollbars) */
  scheme: 'light' | 'dark';
}
const w = (slug: string, title: string, palette: Palette, ogColor: string, scheme: 'light' | 'dark', fontAccent?: string): WorldDef =>
  ({ slug, title, component: `worlds/${slug}/World.astro`, palette, ogColor, scheme, fontAccent });

export const worlds: Record<string, WorldDef> = {
  // SOUND: deep teal / violet night
  lungscope: w('lungscope', 'LungScope', { ground: '#0A1B26', fg: '#E8F5F2', panel: '#12303D', acc: '#7352FF', onAcc: '#FFFFFF', acc2: '#3FE6C6', mute: '#A7C4CB', focus: '#3FE6C6' }, '#0A1B26', 'dark'),
  // 3D PRINTING: PLA white + orange on blueprint grey
  'arch-support': w('arch-support', 'Pediatric arch support', { ground: '#2C3540', fg: '#F7F2E8', panel: '#39444F', acc: '#FF7A1A', onAcc: '#111111', acc2: '#F7F2E8', mute: '#C5CCD3', focus: '#FF9B4D' }, '#2C3540', 'dark'),
  // SIGNAL: the yellow poster, with a green-on-black scope panel inside
  ecg: w('ecg', 'ECG board', { ground: '#FFD60A', fg: '#111111', panel: '#F2C900', acc: '#07110B', onAcc: '#39FF88', acc2: '#39FF88', mute: '#3A3500', focus: '#111111' }, '#FFD60A', 'light', "ui-monospace, monospace"),
  // LAB DATA: spreadsheet green on white grid paper
  'mass-spec': w('mass-spec', 'Mass-spectrometry workflow', { ground: '#F6F8F5', fg: '#16261C', panel: '#E3EDE4', acc: '#1D6F42', onAcc: '#FFFFFF', acc2: '#BFE0C8', mute: '#44574A', focus: '#16261C' }, '#1D6F42', 'light', "ui-monospace, monospace"),
  // PRODUCT: charcoal and red
  jobhub: w('jobhub', 'JobHub', { ground: '#16171A', fg: '#F2F0EC', panel: '#232529', acc: '#E5484D', onAcc: '#111111', acc2: '#F2F0EC', mute: '#ABADB3', focus: '#F2F0EC' }, '#16171A', 'dark'),
  // LIBRARY: cool-grey reading room, slate ink, serif set in the page CSS
  research: w('research', 'Research', { ground: '#F3F2EC', fg: '#111111', panel: '#E4E2D8', acc: '#1F35F5', onAcc: '#FFFFFF', acc2: '#FFD60A', mute: '#4A4A44', focus: '#1F35F5' }, '#F3F2EC', 'light'),
};
// GENOMICS: warm lab paper, ink-teal, coral and teal probe halves
worlds['flex-v2'] = w('flex-v2', 'Flex v2 single-cell sequencing', { ground: '#F6F3EA', fg: '#20313B', panel: '#E8E3D3', acc: '#17696D', onAcc: '#FFFFFF', acc2: '#A8483B', mute: '#4B5B63', focus: '#17696D' }, '#20313B', 'light');
export const worldSlugs = Object.keys(worlds);
export const getWorld = (slug: string): WorldDef | undefined => worlds[slug];

/** CSS for /worlds/<slug>.css */
export function paletteCss(wd: WorldDef): string {
  const p = wd.palette;
  const font = wd.fontAccent ? `\n  --font-accent: ${wd.fontAccent};` : '';
  return `.world-${wd.slug} {
  color-scheme: ${wd.scheme};
  --ground: ${p.ground}; --fg: ${p.fg}; --panel: ${p.panel}; --acc: ${p.acc}; --on-acc: ${p.onAcc};
  --acc2: ${p.acc2}; --mute: ${p.mute}; --focus: ${p.focus ?? p.fg};${font}
}
`;
}
