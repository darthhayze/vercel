import type { APIRoute } from 'astro';
import { cases } from '../lib/data';
export const prerender = true;
export const GET: APIRoute = () => {
  const pages = Object.keys(import.meta.glob('./**/*.astro')).filter((file) => !file.includes('[') && file !== './404.astro').map((file) => {
    const route = file.slice(2).replace(/\.astro$/, '').replace(/(^|\/)index$/, '');
    return '/' + route + (route ? '/' : '');
  });
  const routes = [...new Set([...pages, ...cases.map((entry) => `/work/${entry.id}/`)])].sort();
  const urls = routes.map((route) => `<url><loc>https://hamza-bme.tech${route}</loc><changefreq>${['/privacy/', '/terms/'].includes(route) ? 'yearly' : 'monthly'}</changefreq><priority>${route === '/' ? '1.0' : route.startsWith('/work/') || route === '/research/' ? '0.8' : '0.5'}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
