#!/usr/bin/env node
// Layout lint: serves dist (with vercel.json headers) and, for every built page (+ #quick / #explore story modes) at
// 320/390/768/1100/1440, scrolls through the page and reports collisions.
//
//   node scripts/layout-lint.mjs [--pages work/ecg,/] [--exclude arch-support] [--widths 320,390] [--rm-widths 390,1440]
//                                [--out ../qa/layout-lint] [--shots 10] [--conc 4] [--dist dist]
//
// Categories
//   a  overlap          two text-bearing / interactive elements that are neither ancestor nor descendant overlap (verified by elementsFromPoint)
//   b  clip             text clipped by an overflow:hidden|clip ancestor, or text outside the viewport
//   c  hoverflow        document wider than the viewport, or elements extending past it
//   d  media-bg         text over an <img>/<video>/<canvas>/svg/background-image (review), or computed contrast below WCAG on a solid ground
//   e  target           interactive element below 44x44 (inline links inside running text are exempt) or interactive boxes overlapping
//   f  fixed            fixed/sticky element covering >30% of the viewport, two fixed layers colliding, content hidden under one at rest,
//                       an in-page anchor target landing under a fixed bar
//   g  svg-text         text vs text (or text outside the svg box) inside one <svg>
// Intentional decorative layers: mark aria-hidden="true" or data-decor (ignored by a-f; g only honours data-decor).
// Pinned stages (src/components/stage): the sticky .stg-stage carries data-stage-pin and is not counted as a fixed layer.
// A small dismissible notice (the analytics consent card) carries data-transient and is not counted as a fixed layer; it never covers controls (see Consent.astro).
// Exit code 1 when any finding is reported. Needs playwright (firefox); resolved from NODE_PATH / known locations.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const WIDTHS = arg('widths', '320,390,768,1100,1440').split(',').map(Number);
const RM_WIDTHS = arg('rm-widths', '390,1440').split(',').filter(Boolean).map(Number);
const OUT = path.resolve(root, arg('out', '../qa/layout-lint'));
const DIST = path.resolve(root, arg('dist', 'dist'));
const ONLY = arg('pages', '').split(',').filter(Boolean);
const EXCLUDE = arg('exclude', '').split(',').filter(Boolean);
const SHOTS = Number(arg('shots', 10));
const CONC = Number(arg('conc', 4));

function loadPlaywright() {
  const tries = [root, path.resolve(root, '..'), '/home/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules', ...(process.env.NODE_PATH || '').split(':').filter(Boolean)];
  for (const t of tries) {
    try { return createRequire(path.join(t, 'x.js'))('playwright'); } catch {}
    try { return createRequire(path.join(t, 'x.js'))(path.join(t, 'playwright')); } catch {}
  }
  throw new Error('playwright not found; set NODE_PATH');
}
const { firefox } = loadPlaywright();

// ---------- static server with vercel.json headers ----------
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon', '.map': 'application/json' };
function startServer() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    for (const r of vercel.redirects || []) if (p === r.source) { res.writeHead(r.permanent ? 308 : 307, { Location: r.destination }); return res.end(); }
    if (!path.extname(p) && !p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); return res.end(); }
    let f = path.join(DIST, p);
    if (!f.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) f = path.join(f, 'index.html');
    const headers = {};
    for (const rule of vercel.headers || []) if (new RegExp('^' + rule.source + '$').test(p)) for (const h of rule.headers) headers[h.key] = h.value;
    fs.readFile(f, (e, buf) => {
      if (e) { const nf = path.join(DIST, '404.html'); res.writeHead(404, { ...headers, 'Content-Type': MIME['.html'] }); return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found'); }
      res.writeHead(200, { ...headers, 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

function listRoutes() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') out.push('/' + path.relative(DIST, d).split(path.sep).join('/') + (d === DIST ? '' : '/'));
      else if (e.name === '404.html' && d === DIST) out.push('/404.html');
    }
  })(DIST);
  return out.sort().filter((r) => (!ONLY.length || ONLY.some((o) => r === o || r.includes(o.replace(/^\/|\/$/g, '')) && o !== '/')) && !EXCLUDE.some((x) => r.includes(x)));
}

// ---------- in-page analysis (runs in the browser) ----------
function installAnalyzer() {
  const W = () => innerWidth, H = () => innerHeight;
  const L = (window.__ll = { findings: [], seen: new Set(), anchors: new Set(), anchorTest: async () => {} });
  const R = (r) => ({ x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  const inter = (a, b) => { const l = Math.max(a.left, b.left), t = Math.max(a.top, b.top), r = Math.min(a.right, b.right), bt = Math.min(a.bottom, b.bottom); return r > l && bt > t ? { left: l, top: t, right: r, bottom: bt, width: r - l, height: bt - t } : null; };
  const cs = (el) => getComputedStyle(el);
  const isDecor = (el) => !!el.closest('[aria-hidden="true"],[data-decor],[hidden],[inert],script,style,noscript,template');
  const sel = (el) => {
    const one = (e) => {
      let s = e.localName; if (e.id) return s + '#' + CSS.escape(e.id);
      const cls = [...(e.classList || [])].filter((c) => !/^(astro-|svelte-)/.test(c)).slice(0, 2); if (cls.length) s += '.' + cls.join('.');
      return s;
    };
    const parts = []; let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 3 && e !== document.body; i++, e = e.parentElement) { parts.unshift(one(e)); if (e.id) break; }
    return parts.join(' > ');
  };
  const snippet = (el) => (el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  const visible = (el) => {
    for (let e = el, n = 0; e && e.nodeType === 1; e = e.parentElement, n++) {
      const s = cs(e);
      if (e.localName === 'details' && !e.open && !(el.closest('summary') && el.closest('summary').parentElement === e)) return false;
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || +s.opacity < 0.05 || s.contentVisibility === 'hidden') return false;
    }
    return true;
  };
  const textRect = (el) => {
    if (el instanceof SVGElement) { if (el.localName !== 'text') return null; const r = el.getBoundingClientRect(); return r.width && r.height ? r : null; }
    let u = null;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { if (r.width < 1 || r.height < 1) continue; u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }
    }
    if (!u) return null; u.width = u.right - u.left; u.height = u.bottom - u.top; return u;
  };
  const INTER = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"])';
  const isUI = (el) => el.matches(INTER) && !el.disabled;
  // rect after intersecting with every overflow-clipping ancestor
  const clipChain = (el) => {
    const out = []; const pos = cs(el).position;
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const s = cs(p);
      if ((s.overflowX !== 'visible' || s.overflowY !== 'visible') && p.localName !== 'svg') out.push({ p, s });
      if (pos === 'fixed' && s.transform === 'none') { /* fixed escapes clipping unless transformed ancestor; keep walking cheaply */ }
    }
    return out;
  };
  const effRect = (el, r) => {
    let cur = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    if (cs(el).position === 'fixed') return cur;
    for (const { p, s } of clipChain(el)) {
      const pr = p.getBoundingClientRect();
      const c = { left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom, width: pr.width, height: pr.height };
      if (s.overflowX === 'visible') { c.left = -1e6; c.right = 1e6; }
      if (s.overflowY === 'visible') { c.top = -1e6; c.bottom = 1e6; }
      const i = inter(cur, c); if (!i) return null; cur = i;
    }
    return cur;
  };
  const stuck = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const p = cs(e).position; if (p === 'fixed' || p === 'sticky') return e; } return null; };
  const parse = (c) => { let m = c.match(/rgba?\(([^)]+)\)/); if (!m) { m = c.match(/color\(srgb ([^)]+)\)/); if (m) { const v = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; } return [NaN, NaN, NaN, 1]; } const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const solidBg = (el) => {
    const stack = []; let busy = false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = cs(e);
      if (s.backgroundImage !== 'none') { busy = true; break; }
      const c = parse(s.backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; }
    }
    if (busy) return null;
    let base = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) { const [r, g, b, a] = stack[i]; base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)]; }
    return base;
  };
  const add = (cat, sub, a, b, rect, extra = {}) => {
    const key = [cat, sub, a.sel, b ? b.sel : ''].join('|');
    if (L.seen.has(key)) return; L.seen.add(key);
    L.findings.push({ cat, sub, a: { sel: a.sel, text: a.text, rect: a.rect }, b: b ? { sel: b.sel, text: b.text, rect: b.rect } : null, doc: rect, sy: Math.round(scrollY), ...extra });
  };
  const desc = (el, r) => ({ sel: sel(el), text: snippet(el), rect: R(r) });
  const hit = (el, stack) => stack.some((s) => el.contains(s));
  const unionDoc = (...rs) => { const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), rr = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom)); return { x: Math.round(l + scrollX), y: Math.round(t + scrollY), w: Math.round(rr - l), h: Math.round(b - t) }; };

  L.stop = (atRest) => {
    const w = W(), h = H();
    const style = document.createElement('style'); style.textContent = '*{pointer-events:auto!important}'; document.head.append(style);
    try {
      const items = []; const fixed = []; const svgs = new Set(); const media = [];
      for (const el of document.body.querySelectorAll('*')) {
        const lt = el.localName;
        if (lt === 'script' || lt === 'style' || lt === 'noscript' || lt === 'template') continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) continue;
        if (r.bottom < -50 || r.top > h + 50) { continue; }
        const s = cs(el);
        if ((s.position === 'fixed' || s.position === 'sticky') && !(el instanceof SVGElement) && !el.hasAttribute('data-stage-pin') && !el.closest('[data-transient]') && visible(el)) fixed.push({ el, r, s });
        if (el instanceof SVGElement) { if (lt === 'svg' && !el.closest('svg:not(:scope)')) svgs.add(el); if (lt !== 'text') continue; }
        if (lt === 'img' || lt === 'video' || lt === 'canvas' || lt === 'picture') { if (!isDecor(el) && visible(el)) media.push({ el, r }); }
        const ui = !(el instanceof SVGElement) && isUI(el);
        const tr = textRect(el);
        if (!ui && !tr) continue;
        if (isDecor(el)) continue;
        if (!visible(el)) continue;
        { const z = cs(el); if (z.position === 'absolute' && (parseFloat(z.width) <= 1.5 || parseFloat(z.height) <= 1.5) && z.overflow !== 'visible') continue; }
        if (r.width <= 1 || r.height <= 1) { if (!tr) continue; }
        const box = ui ? r : tr;
        const e = effRect(el, box); if (!e || e.width < 1 || e.height < 1) continue;
        items.push({ el, ui, tr, r, box, e, svg: el instanceof SVGElement ? el.ownerSVGElement : null });
      }
      // a / e : pairwise overlap
      const cand = items.filter((i) => i.e.bottom > 0 && i.e.top < h);
      cand.sort((p, q) => p.e.left - q.e.left);
      for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
        const A = cand[i], B = cand[j];
        if (B.e.left >= A.e.right - 1) break;
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        if (A.svg && A.svg === B.svg) continue;
        { const sa = stuck(A.el), sb = stuck(B.el); if (sa !== sb) continue; }
        const ar = { left: A.box.left + 1, top: A.box.top + 1, right: A.box.right - 1, bottom: A.box.bottom - 1 };
        const br = { left: B.box.left + 1, top: B.box.top + 1, right: B.box.right - 1, bottom: B.box.bottom - 1 };
        const x = inter(ar, br); if (!x || x.width < 2 || x.height < 2) continue;
        const ex = inter(x, A.e) && inter(x, B.e); if (!ex) continue;
        let ok = false;
        for (const fx of [0.5, 0.2, 0.8]) for (const fy of [0.5, 0.2, 0.8]) {
          const px = x.left + x.width * fx, py = x.top + x.height * fy; if (px < 0 || py < 0 || px > w || py > h) continue;
          const st = document.elementsFromPoint(px, py); if (hit(A.el, st) && hit(B.el, st)) { ok = true; break; }
        }
        if (!ok) continue;
        const both = A.ui && B.ui;
        add(both ? 'e' : 'a', both ? 'interactive-overlap' : 'overlap', desc(A.el, A.box), desc(B.el, B.box), unionDoc(A.box, B.box));
      }
      // b : clipped text / outside viewport ; c : beyond viewport ; e : size ; d : media/contrast
      for (const it of items) {
        const { el, ui, tr, r, box } = it;
        const d = desc(el, box);
        if (tr && !it.svg) {
          for (const { p, s } of clipChain(el)) {
            if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
            if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowY === 'auto' || s.overflowY === 'scroll') break;
            if (p.closest('[data-marquee],[role=marquee]') || s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' && s.display.includes('box')) continue;
            if (['auto', 'scroll'].includes(s.overflowX) && ['auto', 'scroll'].includes(s.overflowY)) continue;
            const pr = p.getBoundingClientRect();
            if (pr.width === 0 || pr.height === 0) continue;
            const clipX = s.overflowX === 'hidden' || s.overflowX === 'clip', clipY = s.overflowY === 'hidden' || s.overflowY === 'clip';
            const out = (clipX && (tr.left < pr.left - 1.5 || tr.right > pr.right + 1.5)) || (clipY && (tr.top < pr.top - 1.5 || tr.bottom > pr.bottom + 1.5));
            if (out) { add('b', 'clipped-by-overflow', d, desc(p, pr), unionDoc(tr, pr)); break; }
          }
          if (cs(el).position !== 'fixed' && (tr.left < -1.5 || tr.right > w + 1.5) && it.e.left === tr.left && it.e.right === tr.right) add('b', 'text-outside-viewport', d, null, unionDoc(tr));
        }
        if (it.e.right > w + 1.5 || it.e.left < -1.5) { if (cs(el).position !== 'fixed' || true) add('c', 'beyond-viewport', desc(el, box), null, unionDoc(box), { overBy: +(Math.max(it.e.right - w, -it.e.left)).toFixed(1) }); }
        if (ui) {
          const inline = cs(el).display === 'inline' && el.parentElement && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length + 12;
          let small = (r.width < 43.5 || r.height < 43.5) && r.width > 1 && r.height > 1;
          if (small && el.matches('input[type=checkbox],input[type=radio]')) { const lb = el.labels && el.labels[0]; if (lb) { const lr = lb.getBoundingClientRect(); if (lr.width >= 44 && lr.height >= 44) small = false; } }
          if (small && !inline && !el.closest('.skip-link,[class*=skip]') ) add('e', 'target-too-small', desc(el, r), null, unionDoc(r), { size: `${Math.round(r.width)}x${Math.round(r.height)}` });
        }
        if (tr) {
          // d: media beneath text
          const pts = [[0.5, 0.5], [0.1, 0.5], [0.9, 0.5], [0.5, 0.15], [0.5, 0.85]];
          let beneath = null;
          for (const [fx, fy] of pts) {
            const px = tr.left + tr.width * fx, py = tr.top + tr.height * fy; if (px < 0 || py < 0 || px > w || py > h) continue;
            const st = document.elementsFromPoint(px, py); const i0 = st.findIndex((s) => el.contains(s)); if (i0 < 0) continue;
            for (const s of st.slice(i0 + 1)) {
              if (s.contains(el)) { const bs = cs(s); if (/url\(/.test(bs.backgroundImage)) { beneath = { s, decor: false, why: 'background-image' }; break; } continue; }
              const t = s.localName;
              if (t === 'img' || t === 'video' || t === 'canvas' || t === 'picture' || t === 'svg' || s.ownerSVGElement) {
                const root = s.ownerSVGElement ? s.ownerSVGElement : s; if (root.contains(el)) continue;
                const rr = root.getBoundingClientRect(); if (rr.width < 24 && rr.height < 24) continue;
                beneath = { s: root, decor: !!root.closest('[aria-hidden="true"],[data-decor]'), why: root.localName }; break;
              }
              const bs = cs(s); if (/url\(/.test(bs.backgroundImage) && !s.contains(el)) { beneath = { s, decor: !!s.closest('[aria-hidden="true"],[data-decor]'), why: 'background-image' }; break; }
            }
            if (beneath) break;
          }
          const fs = parseFloat(cs(el).fontSize), fw = +cs(el).fontWeight; const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
          const bg = solidBg(el); const fg = parse(cs(el).color);
          let ratio = null;
          if (bg && !(el instanceof SVGElement) && [...bg, ...fg].every(Number.isFinite)) { const op = fg[3]; const f = [fg[0] * op + bg[0] * (1 - op), fg[1] * op + bg[1] * (1 - op), fg[2] * op + bg[2] * (1 - op)]; const l1 = lum(f), l2 = lum(bg); ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
          if (beneath) { for (let q = el, k = 0; q && k < 3 && q !== document.body; q = q.parentElement, k++) { if (q.contains(beneath.s)) break; if (parse(cs(q).backgroundColor)[3] >= 0.6) { beneath = null; break; } } }
          if (beneath && !beneath.decor) add('d', 'text-over-media', d, { sel: sel(beneath.s), text: beneath.why, rect: R(beneath.s.getBoundingClientRect()) }, unionDoc(tr));
          else if (beneath && beneath.decor && ratio !== null && ratio < (large ? 3 : 4.5)) add('d', 'low-contrast-over-decor', d, { sel: sel(beneath.s), text: beneath.why, rect: R(beneath.s.getBoundingClientRect()) }, unionDoc(tr), { ratio: +ratio.toFixed(2) });
          else if (!beneath && ratio !== null && ratio < (large ? 3 : 4.5)) add('d', 'low-contrast', d, null, unionDoc(tr), { ratio: +ratio.toFixed(2) });
        }
      }
      // f : fixed / sticky
      const vp = w * h;
      for (const f of fixed) {
        const i = inter(f.r, { left: 0, top: 0, right: w, bottom: h });
        const bgc = parse(f.s.backgroundColor);
        if (i && (i.width * i.height) / vp > 0.3 && f.el.textContent.trim().length && !f.el.matches('dialog,[role=dialog],[aria-modal=true]')) add('f', 'fixed-covers-viewport', desc(f.el, f.r), null, unionDoc(f.r), { pct: Math.round((i.width * i.height) / vp * 100) });
        if (atRest && (atRest === 'top' || f.s.position === 'fixed') && i && bgc[3] > 0.6) for (const it of cand) {
          if (f.el.contains(it.el) || it.el.contains(f.el)) continue;
          const x = inter(it.box, f.r); if (!x) continue;
          if ((x.width * x.height) / Math.max(1, it.box.width * it.box.height) < 0.5) continue;
          const px = x.left + x.width / 2, py = x.top + x.height / 2; const st = document.elementsFromPoint(px, py);
          const fi = st.findIndex((s) => f.el.contains(s)), ti = st.findIndex((s) => it.el.contains(s));
          if (fi > -1 && ti > fi) add('f', 'fixed-covers-content', desc(it.el, it.box), desc(f.el, f.r), unionDoc(it.box, f.r));
        }
      }
      for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
        const A = fixed[i], B = fixed[j]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue; if (A.r.bottom <= 0 || B.r.bottom <= 0 || A.r.top >= h || B.r.top >= h) continue;
        const x = inter(A.r, B.r); if (x && x.width > 4 && x.height > 4 && A.el.textContent.trim() && B.el.textContent.trim()) add('f', 'fixed-collide', desc(A.el, A.r), desc(B.el, B.r), unionDoc(A.r, B.r));
      }
      // g : svg text
      for (const svg of svgs) {
        if (svg.closest('[data-decor]') || !visible(svg)) continue;
        const sr = svg.getBoundingClientRect(); if (sr.width < 20) continue;
        const texts = [...svg.querySelectorAll('text')].filter((t) => visible(t) && !t.closest('[data-decor]') && t.textContent.trim()).map((t) => ({ t, r: t.getBoundingClientRect() })).filter((o) => o.r.width > 0 && o.r.height > 0);
        for (const o of texts) { if (o.r.left < sr.left - 1.5 || o.r.right > sr.right + 1.5 || o.r.top < sr.top - 1.5 || o.r.bottom > sr.bottom + 1.5) add('g', 'svg-text-outside-svg', desc(o.t, o.r), desc(svg, sr), unionDoc(o.r, sr)); }
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const A = texts[i], B = texts[j]; if (A.t.contains(B.t) || B.t.contains(A.t)) continue;
          const ar = { left: A.r.left + 1, top: A.r.top + 1.5, right: A.r.right - 1, bottom: A.r.bottom - 1.5 }, br = { left: B.r.left + 1, top: B.r.top + 1.5, right: B.r.right - 1, bottom: B.r.bottom - 1.5 };
          const x = inter(ar, br); if (x && x.width > 2 && x.height > 2) add('g', 'svg-text-overlap', desc(A.t, A.r), desc(B.t, B.r), unionDoc(A.r, B.r));
        }
      }
    } finally { style.remove(); }
  };
  L.docOverflow = () => {
    const de = document.documentElement; const sw = Math.max(de.scrollWidth, document.body.scrollWidth);
    if (sw > innerWidth + 1) L.findings.push({ cat: 'c', sub: 'document-scrolls-horizontally', a: { sel: 'html', text: '', rect: { x: 0, y: 0, w: sw, h: 0 } }, b: null, doc: { x: 0, y: 0, w: sw, h: 40 }, overBy: sw - innerWidth });
  };
  L.anchorTest = async () => {
    const links = [...document.querySelectorAll('a[href^="#"]')].filter((a) => a.getAttribute('href').length > 1 && !isDecor(a));
    const done = new Set();
    for (const a of links) {
      const id = decodeURIComponent(a.getAttribute('href').slice(1)); if (done.has(id)) continue; done.add(id);
      const t = document.getElementById(id); if (!t || !visible(t)) continue;
      t.scrollIntoView({ behavior: 'instant', block: 'start' }); await new Promise((r) => setTimeout(r, 120));
      const tr = t.getBoundingClientRect(); const px = Math.min(innerWidth - 2, Math.max(2, tr.left + Math.min(tr.width / 2, 200))), py = tr.top + 3;
      if (py < 0 || py > innerHeight) continue;
      const st = document.elementsFromPoint(px, py); const top = st[0];
      if (top && !t.contains(top) && !top.contains(t)) {
        const fx = st.find((s) => ['fixed', 'sticky'].includes(cs(s).position) || s.closest('header,nav'));
        if (fx && !t.contains(fx)) add('f', 'anchor-target-under-fixed', { sel: sel(t), text: '#' + id, rect: R(tr) }, desc(fx, fx.getBoundingClientRect()), unionDoc(tr));
      }
    }
  };
}

// ---------- jobs ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function runJob(browser, base, job, shotDir) {
  const ctx = await browser.newContext({ viewport: { width: job.width, height: 900 }, reducedMotion: job.rm ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + job.route + (job.hash ? '#' + job.hash : ''), { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await sleep(500);
    if (job.hash) await page.evaluate((h) => { if (location.hash !== '#' + h) location.hash = h; }, job.hash);
    await sleep(400);
    await page.evaluate(installAnalyzer);
    const hasStory = await page.evaluate(() => !!document.querySelector('[data-story-set]'));
    const H = 900, step = Math.round(H * 0.7);
    let y = 0, guard = 0;
    while (guard++ < 140) {
      await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y);
      await sleep(job.rm ? 120 : 380);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const maxY = Math.max(0, total - H);
      const rest = y === 0 ? 'top' : y >= maxY ? 'bottom' : false;
      await page.evaluate((r) => window.__ll.stop(r), rest);
      if (y >= maxY) break;
      y = Math.min(maxY, y + step);
    }
    await sleep(500);
    await page.evaluate(() => window.__ll.stop('bottom'));
    await page.evaluate(() => window.__ll.docOverflow());
    await page.evaluate(() => window.__ll.anchorTest());
    let findings = await page.evaluate(() => window.__ll.findings);
    // screenshots
    let n = 0;
    for (const f of findings) {
      if (n >= SHOTS) break;
      const d = f.doc; const pad = 40;
      try {
        await page.evaluate((t) => scrollTo({ top: t, behavior: 'instant' }), f.sy);
        await sleep(150);
        const sy = await page.evaluate(() => scrollY);
        const vy = d.y - sy;
        const x0 = Math.max(0, Math.min(d.x - pad, job.width - 40)), y0 = Math.max(0, Math.min(vy - pad, 860));
        const ww = Math.min(job.width - x0, Math.max(d.w + pad * 2, 260)), hh = Math.min(900 - y0, Math.min(520, Math.max(d.h + pad * 2, 120)));
        const file = path.join(shotDir, `${job.id}-${f.cat}-${n}.png`);
        await page.screenshot({ path: file, clip: { x: x0, y: y0, width: ww, height: hh } });
        f.shot = path.relative(OUT, file);
        n++;
      } catch {}
    }
    return { ...job, hasStory, errors, findings };
  } catch (e) {
    return { ...job, error: String(e.message || e), findings: [] };
  } finally { await ctx.close(); }
}

const CAT = { a: 'overlap', b: 'clip', c: 'hoverflow', d: 'media-bg/contrast', e: 'targets', f: 'fixed', g: 'svg-text' };
const rs = (r) => r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)}` : '';
const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

async function main() {
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const srv = await startServer(); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await firefox.launch({ headless: true });
  const routes = listRoutes();
  // probe story pages
  const jobs = [];
  const probeCtx = await browser.newContext(); const pp = await probeCtx.newPage();
  const variants = [];
  for (const r of routes) {
    variants.push({ route: r, hash: '' });
    try { await pp.goto(base + r, { waitUntil: 'load' }); if (await pp.evaluate(() => !!document.querySelector('[data-story-set]'))) { variants.push({ route: r, hash: 'quick' }, { route: r, hash: 'explore' }); } } catch {}
  }
  await probeCtx.close();
  for (const v of variants) {
    for (const width of WIDTHS) jobs.push({ ...v, width, rm: false });
    for (const width of RM_WIDTHS) if (WIDTHS.includes(width)) jobs.push({ ...v, width, rm: true });
  }
  jobs.forEach((j) => { j.id = `${(j.route.replace(/^\/|\/$|\.html$/g, '').replace(/\//g, '_') || 'home')}${j.hash ? '-' + j.hash : ''}-${j.width}${j.rm ? '-rm' : ''}`; });
  console.log(`layout-lint: ${routes.length} pages, ${variants.length} variants, ${jobs.length} runs, concurrency ${CONC}`);
  const results = []; let next = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const r = await runJob(browser, base, job, path.join(OUT, 'shots'));
      results.push(r);
      console.log(`  ${r.id}: ${r.error ? 'ERROR ' + r.error : r.findings.length + ' findings'}`);
    }
  }));
  await browser.close(); srv.close();
  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  // ----- outputs -----
  const flat = [];
  for (const r of results) for (const f of r.findings) flat.push({ page: r.route + (r.hash ? '#' + r.hash : ''), width: r.width, reducedMotion: r.rm, ...f });
  fs.writeFileSync(path.join(OUT, 'layout-lint.json'), JSON.stringify({ generated: new Date().toISOString(), runs: results.map(({ findings, ...x }) => ({ ...x, count: findings.length })), findings: flat }, null, 1));
  const groups = new Map();
  for (const f of flat) {
    const k = [f.cat, f.sub, f.page, f.a.sel, f.b ? f.b.sel : ''].join('|');
    const g = groups.get(k) || { ...f, widths: new Set(), rm: false }; g.widths.add(f.width + (f.reducedMotion ? 'rm' : '')); if (!g.shot && f.shot) g.shot = f.shot; groups.set(k, g);
  }
  const rows = [...groups.values()].sort((x, y) => x.cat.localeCompare(y.cat) || x.page.localeCompare(y.page) || x.sub.localeCompare(y.sub));
  const byCat = {}; for (const g of rows) byCat[g.cat] = (byCat[g.cat] || 0) + 1;
  const byPage = {}; for (const g of rows) byPage[g.page] = (byPage[g.page] || 0) + 1;
  let md = `# Layout lint report\n\nGenerated ${new Date().toISOString()} by \`site-v2/scripts/layout-lint.mjs\`. ${results.length} runs (${routes.length} pages incl. story modes, widths ${WIDTHS.join('/')}, reduced-motion at ${RM_WIDTHS.join('/')}).\n\n`;
  md += `**Findings: ${flat.length} raw, ${rows.length} unique (grouped across widths).**\n\n| category | unique |\n|---|---|\n` + Object.keys(CAT).map((c) => `| ${c} ${CAT[c]} | ${byCat[c] || 0} |`).join('\n') + '\n\n';
  md += `| page | unique |\n|---|---|\n` + Object.entries(byPage).sort().map(([p, n]) => `| ${p} | ${n} |`).join('\n') + '\n\n';
  const errs = results.filter((r) => r.error); if (errs.length) md += `Runs that errored: ${errs.map((e) => e.id + ' (' + e.error + ')').join('; ')}\n\n`;
  md += `## Findings\n\n| cat | kind | page | widths | element A (rect) | element B (rect) | note | crop |\n|---|---|---|---|---|---|---|---|\n`;
  for (const g of rows.slice(0, 1500)) {
    md += `| ${g.cat} | ${g.sub} | ${esc(g.page)} | ${[...g.widths].join(' ')} | \`${esc(g.a.sel)}\` "${esc(g.a.text)}" [${rs(g.a.rect)}] | ${g.b ? '`' + esc(g.b.sel) + '` "' + esc(g.b.text) + '" [' + rs(g.b.rect) + ']' : ''} | ${esc([g.ratio ? 'contrast ' + g.ratio : '', g.size || '', g.overBy ? 'over ' + g.overBy + 'px' : '', g.pct ? g.pct + '%' : ''].filter(Boolean).join(' '))} | ${g.shot ? `[img](${g.shot})` : ''} |\n`;
  }
  if (rows.length > 1500) md += `\n(+${rows.length - 1500} more in layout-lint.json)\n`;
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), md);
  console.log(`layout-lint: ${flat.length} raw / ${rows.length} unique findings -> ${path.relative(process.cwd(), OUT)}/REPORT.md`);
  console.log(Object.keys(CAT).map((c) => `${c}:${byCat[c] || 0}`).join(' '));
  process.exit(rows.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
