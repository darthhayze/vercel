#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const origin = 'https://hamza-bme.tech';
const failures = [];
function check(ok, message) { if (!ok) failures.push(message); }
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1], match[2] ?? match[3]]));
const decode = (text) => text.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const files = fs.readdirSync(dist, { recursive: true }).filter((file) => file.endsWith('.html') && file !== 'googled6b4807d220e1734.html');
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decode(match[1]));
const titles = new Set();
const descriptions = new Set();
const routes = [];
for (const file of files) {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
  const route = file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, '').split(path.sep).join('/');
  const prefix = `${route}: `;
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const meta = (name) => metas.find((m) => m.name === name || m.property === name)?.content;
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attrs(match[0])).filter((link) => link.rel === 'canonical');
  check(canonical.length === 1 && canonical[0].href === origin + route, prefix + 'one correct canonical');
  const headHtml = html.split(/<\/head>/i)[0];
  const pageTitles = [...headHtml.matchAll(/<title>(.*?)<\/title>/gs)];
  const title = decode(pageTitles[0]?.[1] ?? '');
  check(pageTitles.length === 1 && title.length > 0 && title.length <= 60 && !titles.has(title), prefix + 'unique title, 1–60 characters');
  titles.add(title);
  const description = decode(meta('description') ?? '');
  check(description.length > 0 && description.length <= 160 && !descriptions.has(description), prefix + 'unique description, 1–160 characters');
  descriptions.add(description);
  for (const key of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) check(!!meta(key), prefix + key);
  const schemas = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const a = attrs(match[1]);
    if (a.type === 'application/ld+json') {
      try { schemas.push(JSON.parse(match[2])); } catch { check(false, prefix + 'invalid JSON-LD'); }
    } else check(!!a.src && !match[2].trim(), prefix + 'inline executable script');
  }
  if (route !== '/') {
    const breadcrumb = schemas.find((schema) => schema['@type'] === 'BreadcrumbList');
    check(!!breadcrumb && breadcrumb.itemListElement?.length >= 2 && breadcrumb.itemListElement.every((item, i) => item.position === i + 1 && item.name && item.item?.startsWith(origin)), prefix + 'valid BreadcrumbList');
    check(/<nav\b[^>]*aria-label="Breadcrumb"/.test(html) && /aria-current="page"/.test(html), prefix + 'visible breadcrumb markup');
  } else {
    const graph = schemas.flatMap((schema) => schema['@graph'] ?? [schema]);
    for (const type of ['Person', 'WebSite']) check(graph.some((schema) => schema['@type'] === type), prefix + type + ' JSON-LD');
  }
  check(html.includes('data-analytics-settings') && html.includes('id="analytics-consent"'), prefix + 'analytics settings and consent control');
  check(!/<style\b|\sstyle\s*=|\son\w+\s*=/i.test(html), prefix + 'inline styles/event handlers');
  if (file === '404.html') check(meta('robots')?.includes('noindex'), prefix + '404 noindex');
  else { routes.push(origin + route); check(locations.includes(origin + route), prefix + 'missing from sitemap'); }
}
check(locations.length === new Set(locations).size && locations.every((url) => routes.includes(url)), 'sitemap contains duplicate or non-page URLs');
const today = new Date().toISOString().slice(0, 10);
// Omit lastmod when no content revision date is available.
check([...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m[1]) && m[1] <= today && new Date(m[1]).toISOString().slice(0, 10) === m[1]), 'sitemap lastmod must be a valid content revision date, not a future date');
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
check(robots.includes(`Sitemap: ${origin}/sitemap.xml`) && !/^Disallow:\s*\S/m.test(robots), 'robots sitemap / unrestricted crawling');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const csp = vercel.headers.find((rule) => rule.source === '/(.*)')?.headers.find((h) => h.key.toLowerCase() === 'content-security-policy')?.value;
check(!!csp && csp.includes("style-src 'self';") && !/unsafe-inline|unsafe-eval/.test(csp), 'strict CSP header');
// Self-check the tag parser used by this audit.
assert.equal(attrs('<meta name="description" content="A > B">').content, 'A > B');
assert.equal(decode('A &amp; B &#39;'), "A & B '");
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`seo-check: ${files.length} pages passed; ${routes.length} sitemap URLs; canonical, metadata, JSON-LD and strict CSP passed.`);
