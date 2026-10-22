import site from '../content/site.json';
import casesJson from '../content/cases.json';
import ledgerJson from '../content/ledger.json';
import mediaMap from '../content/media-map.json';

export type Status = 'measured' | 'target' | 'cited' | 'failed' | 'ongoing';
export interface LedgerRow { id: string; claim: string; value: string; type: Status; source: string; date_checked: string; caveat: string; case: string }
export const ledger = ledgerJson as LedgerRow[];
const byId = new Map(ledger.map((r) => [r.id, r]));
export function row(id: string): LedgerRow {
  const r = byId.get(id);
  if (!r) throw new Error(`Unknown ledger id: ${id}`);
  return r;
}

export const cases = (casesJson as any[]).slice().sort((a, b) => a.order - b.order);
export { site };

export const media = (src: string) => {
  const m = mediaMap.items.find((i) => i.src === src);
  if (!m) throw new Error(`No media-map entry for ${src}`);
  return m;
};

export const CASE_LABEL: Record<string, string> = {
  'flex-v2': 'Single-cell Flex v2', lungscope: 'LungScope', 'arch-support': 'Pediatric arch support', 'mass-spec': 'Mass-spectrometry workflow',
  ecg: 'ECG board to trace', jobhub: 'JobHub', research: 'Research', also: 'Also explored', now: 'Now',
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(d: string | null): string {
  if (!d) return 'present';
  const m = d.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return d.replace('-', ' ').replace(/^(\d{4}) summer$/, 'Summer $1').replace(/^(\d{4})\s+summer$/, 'Summer $1');
  return `${m[3] ? Number(m[3]) + ' ' : ''}${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
