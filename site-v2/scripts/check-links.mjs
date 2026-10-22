// Link + number checker for the built site. Run after `npm run build`: node scripts/check-links.mjs
// 1. Every internal href/src in dist/**/*.html resolves to a file (or an id on the target page).
// 2. Every number in visible text of content pages appears in src/content/ledger.json, jobhub.json or src/content/docs/*.json
//    (dates, years and version strings excepted). Cells marked data-illustrative (synthetic mass-spec sheets) are exempt.
import fs from 'node:fs';
import path from 'node:path';
const dist = new URL('../dist/', import.meta.url).pathname;
const contentDir = new URL('../src/content/', import.meta.url);
const sources = ['ledger.json', 'jobhub.json'].map((f) => new URL(f, contentDir));
const docsDir = new URL('docs/', contentDir);
for (const f of fs.readdirSync(docsDir)) if (f.endsWith('.json')) sources.push(new URL(f, docsDir));
const hay = sources.map((u) => JSON.stringify(JSON.parse(fs.readFileSync(u)))).join(' ').replace(/,/g, '');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const idsCache = new Map();
const ids = (f) => { if (!idsCache.has(f)) idsCache.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); return idsCache.get(f); };
const resolve = (p) => { for (const c of [p, p + '.html', path.join(p, 'index.html')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return null; };
let bad = 0, links = 0;
for (const page of pages) {
  const rel = '/' + path.relative(dist, page).replace(/index\.html$/, '').replace(/\.html$/, '');
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src|poster|data-src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
    links++;
    const [pathPart, hash] = u.split('#');
    const target = pathPart === '' ? page : resolve(path.join(dist, pathPart.startsWith('/') ? pathPart : path.join(rel, pathPart)));
    if (!target) { console.log(`BROKEN ${rel} -> ${u}`); bad++; continue; }
    if (hash && target.endsWith('.html') && !ids(target).has(hash)) { console.log(`MISSING ANCHOR ${rel} -> ${u}`); bad++; }
  }
}
console.log(`${links} internal references checked across ${pages.length} pages, ${bad} problems`);

// Numbers
const EXEMPT = ['/colophon/', '/privacy/', '/style-guide/', '/404.html'];
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
let nbad = 0;
for (const page of pages) {
  const rel = '/' + path.relative(dist, page).replace(/index\.html$/, '');
  if (EXEMPT.some((e) => rel === e || rel.startsWith(e))) continue;
  let t = fs.readFileSync(page, 'utf8').replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ').replace(/<(\w+)\b[^>]*\sdata-illustrative\b[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
  // allow-list: years, dates, versions, course codes, ids
  t = t.replace(new RegExp(`\\b\\d{1,2}\\s+${MONTH}\\s+\\d{4}\\b`, 'g'), ' ').replace(new RegExp(`${MONTH}\\s+\\d{4}`, 'g'), ' ').replace(/\b(19|20)\d{2}\b/g, ' ')
       .replace(/\bv?\d+\.\d+\.\d+\b/gi, (m) => (hay.includes(m.replace(/^v/i, '')) ? ' ' : m)).replace(/\bBME\s*\d{4}C?\b/g, ' ').replace(/\b\d+(?:\.\d+)?\s*(?:MB|KB)\b/g, ' ').replace(/\bFusion 360\b/g, ' ').replace(/\bLast 12 samples\b/g, ' ').replace(/\bGroup\s+\d+\b/g, ' ')
       .replace(/\b[VvL]\d\b/g, ' ').replace(/\b\d+\(\d+\):\d+\b/g, ' ').replace(/\b\d+\.\d{3,}\/\S+/g, ' ').replace(/\b10\.\d{4,}\S*/g, ' ');
  const seen = new Set();
  for (const m of t.matchAll(/(?<![\w.#-])\d[\d,]*(?:\.\d+)?%?(?![\w-])/g)) {
    const tok = m[0].replace(/%$/, '').replace(/,/g, '');
    if (seen.has(tok)) continue; seen.add(tok);
    const re = new RegExp(`(?<![\\d.])${tok.replace('.', '\\.')}(?![\\d])`);
    if (!re.test(hay)) { console.log(`NUMBER NOT IN CONTENT ${rel}: "${m[0]}" ...${t.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\s+/g, ' ')}`); nbad++; }
  }
}
console.log(`number check: ${nbad} numbers not found in ledger.json, jobhub.json or docs/*.json (exempt: ${EXEMPT.join(' ')})`);
process.exit(bad || nbad ? 1 : 0);
