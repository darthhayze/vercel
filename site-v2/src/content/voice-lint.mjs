// Voice lint. Checks visible strings against creative-direction/VOICE.md (EDITORIAL RULES v2) and the
// stop-slop, humanizer and avoid-ai-writing skills. Every pattern below can be checked with a regex.
//
// Usage:
//   node src/content/voice-lint.mjs                 content JSON, docs JSON, site source text and string literals in scripts
//   node src/content/voice-lint.mjs --content-only  content JSON and docs JSON only
//   node src/content/voice-lint.mjs --dist          also lint the visible text of dist/**/*.html (run after `npm run build`)
// Exits 1 on any hit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');
const dist = path.resolve(src, '..', 'dist');

// ---------------------------------------------------------------------------------------------
// Pattern list: [label, regex]. Text hits are reported with the label so a hit says why it matters.
// ---------------------------------------------------------------------------------------------
const P = (label, ...res) => res.map((re) => [label, re]);
const BANNED = [
  // VOICE.md banned words
  ...P('banned word (VOICE.md)',
    /\bleverag(e|es|ed|ing)\b/i, /\butili[sz](e|es|ed|ing)\b/i, /\bseamless(ly)?\b/i, /\brobust(ly|ness)?\b/i,
    /\bcutting[- ]edge\b/i, /\binnovati(ve|on|ons)\b/i, /\bpassionate\b/i, /\bdynamic\b/i, /\bsynerg(y|ies|istic)\b/i,
    /\bholistic(ally)?\b/i, /\bcomprehensive(ly)?\b/i, /\bstate[- ]of[- ]the[- ]art\b/i, /\bgame[- ]chang(er|ing)\b/i,
    /\bempower(s|ed|ing|ment)?\b/i, /\bstreamlin(e|es|ed|ing)\b/i, /\bend[- ]to[- ]end\b/i, /\ba testament to\b/i,
    /\bjourney\b/i, /\blandscape\b/i, /\bdelv(e|es|ed|ing)\b/i, /\btapestry\b/i, /\bin today'?s world\b/i,
    /\bwhether you'?re\b/i, /\bunlock(s|ed|ing)?\b/i, /\belevat(e|es|ed|ing)\b/i,
    /\bcrafted\b/i, /\bmeticulous(ly)?\b/i, /\brigorous(ly)?\b/i, /\bbridging the gap\b/i, /\bat the intersection of\b/i,
    /\bhere'?s the thing\b/i),
  ...P('exclamation mark', /!/),
  ...P('dash used as punctuation', /—/, /–/, / -- /),
  // Editorial rules v2: the site does not comment on its own honesty or process.
  ...P('site comments on itself (rules v2)',
    /\bbuilt it\.? broke it\b/i, /\bhonestly labell?ed\b/i, /\bfailures? left in\b/i, /\bevery number has a label\b/i,
    /\btargets are not results\b/i, /\bwhat did not work\b/i, /\bfive builds\b/i, /\bnothing to hide\b/i, /\bfull disclosure\b/i),

  // stop-slop / humanizer: stock words (avoid-ai-writing tier 1)
  ...P('stock AI word',
    /\badditionally\b/i, /\bmoreover\b/i, /\bfurthermore\b/i, /\bcrucial(ly)?\b/i, /\bpivotal\b/i, /\bvibrant\b/i,
    /\bshowcas(e|es|ed|ing)\b/i, /\bunderscor(e|es|ed|ing)\b/i, /\bfoster(s|ed|ing)?\b/i, /\benhanc(e|es|ed|ing|ement)\b/i,
    /\bintricate\b/i, /\bintricacies\b/i, /\binterplay\b/i, /\bgarner(s|ed|ing)?\b/i, /\bbolster(s|ed|ing)?\b/i,
    /\benduring\b/i, /\bnuanced?\b/i, /\bmultifaceted\b/i, /\bmyriad\b/i, /\bplethora\b/i, /\brealm\b/i, /\bparadigm\b/i,
    /\bembark(s|ed|ing)?\b/i, /\bbeacon\b/i, /\bthriving\b/i, /\bbustling\b/i, /\bever[- ](evolving|changing)\b/i,
    /\bactionable\b/i, /\bimpactful\b/i, /\blearnings\b/i, /\bbest practices\b/i, /\bthought leader/i,
    /\bresonat(e|es|ed|ing)\b/i, /\bharness(es|ed|ing)?\b/i, /\bspearhead(s|ed|ing)?\b/i, /\bpave the way\b/i,
    /\bworld[- ]class\b/i, /\bbest[- ]in[- ]class\b/i, /\btailored\b/i, /\bnavigat(e|es|ed|ing) (the|a|an|these|those|complex|challenges)\b/i,
    /\bdeep dive\b/i, /\bdive (in|into)\b/i, /\bunpack(s|ed|ing)?\b/i, /\blean(s|ed|ing)? into\b/i, /\bat its core\b/i,
    /\bit'?s worth noting\b/i, /\bit is worth noting\b/i, /\bworth (reading|a look|exploring|your time|checking out)\b/i,
    /\bplays? an? (key|crucial|vital|pivotal|important) role\b/i, /\bserves as\b/i, /\bstands as\b/i, /\bboasts\b/i,
    /\bnestled\b/i, /\bin the heart of\b/i, /\bgroundbreaking\b/i, /\bbreathtaking\b/i, /\bstunning\b/i, /\brenowned\b/i),
  // stop-slop: adverbs and intensifiers that do no work
  ...P('intensifier or filler adverb',
    /\b(really|truly|genuinely|honestly|literally|deeply|fundamentally|inherently|inevitably|interestingly|importantly|essentially|notably|ultimately|arguably|simply|quite|incredibly|extremely|highly)\b/i,
    /\bactually\b/i, /\bjust (a|an|the|one|use|add|run|click|press|pick)\b/i),
  // stop-slop / humanizer: throat-clearing and staged openers
  ...P('staged opener or throat-clearing',
    /\bhere'?s (what|why|how|this|that)\b/i, /\bhere is (what|why|how|the)\b/i, /\blet'?s (see|look|dive|explore|break|walk|take|start|go)\b/i,
    /\bthe (real|actual|honest|uncomfortable) (question|problem|point|story|truth|issue|win)\b/i, /\bwhat really matters\b/i,
    /\bthe truth is\b/i, /\bto be clear\b/i, /\bmake no mistake\b/i, /\bfull stop\b/i, /\blet that sink in\b/i,
    /\bthis matters because\b/i, /\bthe point is\b/i, /\bwithout further ado\b/i, /\bthink about it\b/i,
    /\bin other words\b/i, /\bneedless to say\b/i, /\bat the end of the day\b/i, /\bwhen it comes to\b/i,
    /\bmoving forward\b/i, /\bcircle back\b/i, /\bon the same page\b/i, /\btake a step back\b/i, /\bunder the hood\b/i),
  // stop-slop / humanizer: sentences that comment on the page or cheer the reader on
  ...P('comments on the page or cheers the reader',
    /\btry it\b/i, /\bgive it a (try|go)\b/i, /\bcheck (it|this|them) out\b/i, /\bhave a (play|go|look)\b/i, /\bsee for yourself\b/i,
    /\btake a look\b/i, /\bscroll (down|to)\b/i, /\bthis (page|section|site) (shows|explains|covers|walks)\b/i,
    /\b(below|above) (you|is|are) /i, /\bthe rest of this\b/i, /\bin this (section|page)\b/i, /\bas we'?ll see\b/i,
    /\bplay with\b/i, /\bdon'?t miss\b/i, /\bkeep going\b/i, /\bthat is all\b/i, /\bwrite to me about\b/i),
  // humanizer §1: not X but Y and its relatives
  ...P('contrast frame (not X, but Y)',
    /\bnot (just|only|merely|simply)\b/i, /\bnot [^.;:!?]{1,70}, but\b/i, /\bnot [^.;:!?]{1,70}; (it|this|that|they|but|rather)\b/i,
    /\b(isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|don'?t|is not|are not|was not|does not|do not) [^.;:!?]{1,60}, (it|this|that|they|but|rather|instead)\b/i,
    /\b(isn'?t|is not|aren'?t|are not|wasn'?t|was not)\b[^.!?]{0,80}[.!?] (It|This|That|They|The real)( is|'s| are| was)\b/i,
    /\brather than\b/i, /\binstead of\b/i, /\bno guessing\b/i, /\bno magic\b/i, /\bno fluff\b/i, /\bno hype\b/i),
  // stop-slop / humanizer: hedge stacks
  ...P('hedge stack', /\b(could|might|may|can) (potentially|possibly|perhaps|arguably)\b/i, /\b(potentially|possibly) (could|might|may)\b/i, /\bseems? to (be )?(suggest|indicate)\b/i),
  // stop-slop: false agency and borrowed authority
  ...P('false agency or borrowed authority',
    /\bthe data (tells|shows|says|suggests)\b/i, /\bexperts (say|believe|argue)\b/i, /\bstudies show\b/i, /\bindustry reports\b/i, /\bobservers (have )?(noted|cited)\b/i),
  // humanizer §22: chatbot residue
  ...P('chatbot residue', /\bi hope this helps\b/i, /\bgreat question\b/i, /\bcertainly!/i, /\blet me know\b/i, /\bas an ai\b/i),
];
// Exact titles of real published works, and the literal name of a test type (not our prose).
const ALLOW = [
  'regression and end-to-end tests',
  'Comprehensive Analysis of Serum Metabolites and Whole Blood Cell Transcriptome Reveals the Dysregulated Metabolic Pathways in Metabolically Healthy Obesity',
  'Serum Metabolites and Whole Blood Transcriptome in Metabolically Healthy Obesity',
  // verbatim quotes from the source documents under review
  'Prototype journey', 'keeps underscores', 'Comprehensive Analysis of Serum Metabolites',
];
const SKIP_KEYS = new Set(['source', 'source_path', 'how_counted', 'href', 'src', 'doi', 'doiUrl', 'altHref', 'poster', 'domain', 'email', 'generated', 'provenance', 'coords', 'lines', 'id', 'pdf', 'video', 'file', 'slug', 'order']);

const hits = [];
const check = (text, where) => {
  let t = text;
  for (const a of ALLOW) t = t.split(a).join('');
  for (const [label, re] of BANNED) { const m = t.match(re); if (m) hits.push(`${where}: [${label}] "${m[0]}"  in  ${text.slice(0, 100)}`); }
};
const walk = (v, where, key) => {
  if (key && (key.startsWith('_') || SKIP_KEYS.has(key))) return;
  if (typeof v === 'string') { if (!/^(\/|https?:|mailto:|#)/.test(v)) check(v, where); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`, null));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`, k);
};

// 1. Content JSON and the document annotation JSON.
const jsonFiles = fs.readdirSync(here).filter((f) => f.endsWith('.json')).map((f) => path.join(here, f));
const docsDir = path.join(here, 'docs');
if (fs.existsSync(docsDir)) for (const f of fs.readdirSync(docsDir)) if (f.endsWith('.json')) jsonFiles.push(path.join(docsDir, f));
for (const f of jsonFiles) walk(JSON.parse(fs.readFileSync(f, 'utf8')), path.relative(src, f), null);

// 2. Word-count rules for copy.json
try {
  const c = JSON.parse(fs.readFileSync(path.join(here, 'copy.json'), 'utf8'));
  const wc = (s) => s.trim().split(/\s+/).length;
  const need = (s, max, w) => { if (typeof s === 'string' && wc(s) > max) hits.push(`${w}: [length] ${wc(s)} words (max ${max})`); };
  need(c.about, 70, 'copy.about');
  for (const [k, p] of Object.entries(c.projects || {})) need(p.line, 14, `copy.projects.${k}.line`);
  for (const [k, n] of Object.entries(c.notes || {})) [].concat(n).forEach((x, i) => need(x, 12, `copy.notes.${k}[${i}]`));
} catch (e) { hits.push('copy.json unreadable: ' + e.message); }

// 3. Content-only mode stops here.
const finish = (summary) => {
  if (hits.length) { console.error(`voice-lint: ${hits.length} hit(s)\n` + hits.join('\n')); process.exit(1); }
  console.log(summary);
  process.exit(0);
};
if (process.argv.includes('--content-only')) finish(`voice-lint: content clean (${jsonFiles.length} JSON files)`);

// 4. Site source: pages, components, layouts, worlds. Text between tags and attribute strings, plus emphasis markup.
const textFiles = [];
const scriptFiles = [];
const scan = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (e.name !== 'content' && e.name !== '_extracted') scan(p); }
  else if (/\.(astro|md|mdx|html)$/.test(e.name)) textFiles.push(p);
  else if (/\.ts$/.test(e.name)) scriptFiles.push(p);
} };
scan(src);

// Emphasis decoration in markup: inline bold, italics, highlight and underline tags inside prose.
const EMPHASIS = [
  ['highlight tag', /<mark\b/], ['underline tag', /<u\b[^>]*>/], ['emphasis tag in prose', /<p\b[^>]*>[^<]*<(b|strong|em)\b[^>]*>[A-Za-z]/],
  ['highlight class', /class="[^"]*\b(highlight|hl-mark|lib-key)\b/],
];

for (const p of textFiles) {
  const rel = path.relative(src, p);
  const raw = fs.readFileSync(p, 'utf8');
  const noScript = raw.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const body = noScript.replace(/^---[\s\S]*?---/m, '').replace(/<!--[\s\S]*?-->/g, '');
  // Exclamation: ignore JS operators in expressions.
  const visible = body.replace(/\{[^{}]*\}/g, '');
  visible.split('\n').forEach((line, i) => {
    const text = line.replace(/<[^>]+>/g, ' ');
    if (/\w!(\s|$)/.test(text)) hits.push(`${rel}:~${i + 1}: [exclamation mark] in ${text.trim().slice(0, 90)}`);
    for (const [label, re] of BANNED) { if (re.source === '!') continue; const m = text.match(re); if (m) hits.push(`${rel}:~${i + 1}: [${label}] "${m[0]}"  in  ${text.trim().slice(0, 90)}`); }
    for (const [label, re] of EMPHASIS) if (re.test(line)) hits.push(`${rel}:~${i + 1}: [${label}] ${line.trim().slice(0, 90)}`);
  });
  // Frontmatter strings (props such as lede, title, description) and attribute text.
  const fm = raw.match(/^---([\s\S]*?)---/m)?.[1] ?? '';
  for (const m of [...fm.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.){24,})\1/g)]) {
    const s = m[2];
    if (!/\s/.test(s) || /^(\/|\.|https?:|import|@)/.test(s) || /[{};=]/.test(s.slice(0, 3))) continue;
    for (const [label, re] of BANNED) { if (re.source === '!') continue; const mm = s.match(re); if (mm) hits.push(`${rel}: [${label}] "${mm[0]}"  in  ${s.slice(0, 90)}`); }
  }
}

// 5. String literals in scripts and data modules (live regions, hints, captions). Code comments are skipped.
for (const p of scriptFiles) {
  const rel = path.relative(src, p);
  const raw = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of raw.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.){24,})\1/g)) {
    let s = m[2]; for (const a of ALLOW) s = s.split(a).join('');
    if (!/ [a-z]/i.test(s) || /^(\/|\.|https?:)/.test(s) || /[;{}]|=>|\$\{.*\}.*\$\{/.test(s) || /^(M|L|H|V|C)[\d -]/.test(s)) continue;
    for (const [label, re] of BANNED) { if (re.source === '!') continue; const mm = s.match(re); if (mm) hits.push(`${rel}: [${label}] "${mm[0]}"  in  ${s.slice(0, 90)}`); }
  }
}

// 6. Rendered text of the built site. Code listings are the author's own source files and are skipped.
let distNote = '';
if (process.argv.includes('--dist')) {
  const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkDir(path.join(d, e.name)) : [path.join(d, e.name)]));
  if (!fs.existsSync(dist)) { console.error('voice-lint --dist: dist/ not found; run npm run build first'); process.exit(1); }
  const pages = walkDir(dist).filter((f) => f.endsWith('.html'));
  for (const f of pages) {
    const rel = 'dist/' + path.relative(dist, f);
    let h = fs.readFileSync(f, 'utf8');
    h = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
    h = h.replace(/<\/?(p|div|li|h\d|section|tr|br|figcaption|header|footer|nav|article|button|td|th|dt|dd|aside|summary|details|ol|ul|table|figure)\b[^>]*>/g, '\n');
    const attrs = [...h.matchAll(/\s(?:alt|aria-label|title|data-note|content)="([^"]{24,})"/g)].map((m) => m[1]);
    const text = h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&ldquo;|&rdquo;/g, '"').replace(/&[a-z]+;/g, ' ');
    const lines = [...text.split('\n'), ...attrs].map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 3);
    for (const l of lines) {
      let t = l; for (const a of ALLOW) t = t.split(a).join('');
      for (const [label, re] of BANNED) { const m = t.match(re); if (m) hits.push(`${rel}: [${label}] "${m[0]}"  in  ${l.slice(0, 100)}`); }
    }
    // Emphasis markup left in the rendered page.
    const html = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    for (const m of html.matchAll(/<(mark|u)\b[^>]*>/g)) hits.push(`${rel}: [highlight or underline tag] ${m[0]}`);
    for (const m of html.matchAll(/<p\b[^>]*>[^<]*<(b|strong|em)\b[^>]*>[A-Za-z][^<]*<\/\1>/g)) hits.push(`${rel}: [emphasis tag in prose] ${m[0].slice(0, 100)}`);
  }
  distNote = `, ${pages.length} built pages`;
}

finish(`voice-lint: clean (${jsonFiles.length} JSON files, ${textFiles.length} site text files, ${scriptFiles.length} script files${distNote}, ${BANNED.length} patterns)`);
