# Portfolio

Astro static site for hamza-bme.tech. Run commands from this directory.

- `src/pages/`: routes, sitemap, legal pages and the dynamic project router.
- `src/worlds/<slug>/`: each project's artwork, styles and interactions.
- `src/components/`: shared site chrome, story controls, document readers and the Flex stage kit.
- `src/content/`: project copy, story beats, evidence ledger and document annotations.
- `public/`: downloadable documents, fonts and image assets.
- `resume-src/`: résumé HTML sources. `scripts/` contains checks and document/ECG tools.
- `qa/` and `ref/`: local review evidence and source material; excluded from deployment.

## Commands

`npm ci` (Node24 or newer), then `npm run dev` for local development or `npm run build` for `dist/`. `npm run preview` serves the build.

Before release, run:

```sh
npm run check
npm run build
node scripts/check-links.mjs
node scripts/seo-check.mjs
node src/content/voice-lint.mjs --dist
node scripts/layout-lint.mjs
node src/worlds/mass-spec/data.test.mjs
```

Install browsers with `npx playwright install firefox chromium`. `npm run test:browser` exercises the built site under production headers; set `BASE_URL` to smoke-test a deployment, or `BROWSER=chromium` to use Chromium. It stubs analytics requests so tests do not send visits to GA. `npm run check:release` groups type, build, link, SEO, voice and data checks.

Layout lint needs Playwright with Firefox installed; it checks all built pages and both story modes at 320, 390, 768, 1100 and 1440 pixels, plus reduced motion. Inspect screenshots at 1440 and 390 after visual changes. Preserve keyboard access, no-JS content and reduced-motion states.

## Add a project world

Add its facts and sources to `src/content/cases.json` and `ledger.json`, its home description, quick-read beats and navigation order to `story.json`. Shared page copy lives in `copy.json`. Register the palette in `src/worlds/index.ts`. Create `src/worlds/<slug>/World.astro` with `slug` and `c` props and wrap it in `WorldShell`; the router discovers it automatically. Give the first interactive section `id="demo"`. Keep the world's own visual shell and supply readable static content. Store public assets under `public/worlds-assets/<slug>/`. Rerun the checks above and inspect both story modes.

To regenerate résumés, convert the HTML files in `resume-src/` with LibreOffice's `HTML (StarWriter)` input and `writer_pdf_Export` output. Replace the matching PDFs in `public/resume/` only after checking text, layout and the required one- and three-page counts.

## Deployment

Vercel project `hamza-bme` uses root directory `site-v2`, framework Astro, Node24, install `npm ci`, build `npm run build`, output `dist`. `main` is production; branches get protected previews. Keep environment variables in Vercel or ignored local files. Local QA/reference/resume source files are excluded from Vercel uploads. Original public PDFs remain available as documents.

Before promotion, require passing GitHub checks and inspect desktop/mobile screenshots. After deploy, run `BASE_URL=https://hamza-bme.tech npm run test:browser` and verify redirects,404,PDF downloads and security headers. Retain the previous deployment as a protected rollback rather than deleting it.
