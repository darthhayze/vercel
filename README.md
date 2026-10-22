# Hamza Al Halabi — portfolio

Production site: https://hamza-bme.tech

The Astro source is in [site-v2](site-v2/README.md). Run `npm ci`, `npm run check:release` and `npm run dev` from that directory.

GitHub Actions checks types, the production build, links, metadata, copy, data calculations, browser interactions and responsive layouts. Vercel builds `site-v2` on Node24, with `dist` as the output directory. The `main` branch publishes production; other branches create protected previews.

Local experiments, screenshots, planning material, environment files and build output are excluded from Git. The hero comparison lab remains local.
