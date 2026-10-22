import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hamza-bme.tech',
  output: 'static',
  // WP4: keep every stylesheet and script external so the CSP can stay `style-src 'self'; script-src 'self'`.
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
});
