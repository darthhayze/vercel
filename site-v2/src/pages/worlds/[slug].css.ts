import type { APIRoute } from 'astro';
import { worlds, paletteCss } from '../../worlds';
export function getStaticPaths() { return Object.keys(worlds).map((slug) => ({ params: { slug } })); }
export const GET: APIRoute = ({ params }) =>
  new Response(paletteCss(worlds[params.slug!]), { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
