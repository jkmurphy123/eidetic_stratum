# Alderwick Correspondent Phase 1 Implementation Plan

> For Hermes: implement locally with test-first cycles; do not start Phase 2 without approval.

**Goal:** A working, responsive local newspaper prototype with validated article JSON and accessible article/category/front/About pages.

**Architecture:** Astro static output reads only prepared, validated data. Node scripts validate records and emit disposable build data. A shared layout/cards/date helper serves all routes; image paths remain null unless an approved real asset exists.

**Tech Stack:** Node 22, pinned Astro 7, Ajv JSON Schema, Node built-in tests, CSS. No server/database/React.

---

### Task 1: Scaffold and date helper
**Files:** `site/package.json`, `site/astro.config.mjs`, `site/src/lib/dates.mjs`, `site/tests/dates.test.mjs`.
1. Write tests for `editionDate('2026-01-01T12:00:00Z') === '1882-01-01'`, invalid input rejection, and leap-date fallback.
2. Run `node --test tests/dates.test.mjs`; verify missing helper fails.
3. Implement UTC extraction and year replacement; run test again, then full tests.
4. Install pinned Astro and Ajv; commit lockfile. Verify `npm ci`.

### Task 2: Content validator and preparation
**Files:** `site/content/article.schema.json`, `site/content/categories.json`, `site/scripts/content.mjs`, `site/scripts/validate-content.mjs`, `site/scripts/prepare-content.mjs`, `site/tests/content.test.mjs`.
1. Test valid record and errors for duplicate ID/slug, unknown category, malformed date/path, missing related ID/image, unsafe path, short notices warning. Verify RED.
2. Implement schema and semantic checks in `validateArchive(root)`; no article rendering from unvalidated data. Verify GREEN.
3. `prepare-content.mjs` writes `src/generated/articles.json` from validated records; test clean regeneration from fixtures. Verify GREEN.

### Task 3: Representative articles and layout
**Files:** `site/content/articles/2026/09/25/*.json`, `site/src/styles/site.css`, `site/src/layouts/BaseLayout.astro`, `site/src/components/ArticleCard.astro`, `site/src/pages/index.astro`, `site/src/pages/category/[slug]/index.astro`, `site/src/pages/articles/[id].astro`, `site/src/pages/about/index.astro`, `site/src/pages/404.astro`.
1. Add an integration test that builds and checks masthead, transformed dates, routes, text escaping, and no-image rendering; verify RED before pages.
2. Create 6 substantial (4–6 paragraph) original sample articles, one per category, then reusable layout, components, route generation, styles. No fabricated approved artwork; article image null until supplied.
3. Run `npm run validate`, `npm test`, `npm run build`; inspect `dist` links, run local preview and HTTP checks. Iterate on mobile/desktop layout.

### Task 4: Final verification and handoff
**Files:** `site/README.md`, `EIDETIC_STRATUM_DESIGN.md` only if implementation reveals an approved-design discrepancy.
1. Document setup and local run commands; call out absent approved image assets and deferred phases.
2. Run `npm ci && npm run validate && npm test && npm run build && npm run check:dist`; serve `npm run preview` and fetch home, article, category, About and 404.
3. Report actual pass/fail outputs, limitations, and stop for phase approval. This folder has no Git repository; do not imply a commit was made.
