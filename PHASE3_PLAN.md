# Alderwick Correspondent Phase 3 Implementation Plan

> For Hermes: implement this authorized local editorial-ingest phase test-first. Do not start drafting/scheduling or deploy.

**Goal:** Safely add reviewed local article batches, validate their manifests/assets, build responsive derivatives from already-approved master PNGs, and verify the resulting static site.

**Architecture:** A batch directory holds a manifest, article JSON and optional master PNGs. Ingest validates the entire candidate archive in an isolated temporary copy, preflights all final destinations, then swaps staged source directories into place under a single-process lock with rollback on failure. Build preparation verifies PNGs, creates disposable derivatives and enriches only generated render data; source article JSON remains untouched.

**Tech Stack:** Node 22, Astro 7, Ajv, sharp (pinned), Node built-in tests. No Git repo exists; no commit/PR/deploy claims.

---

### Task 1: Batch contract and validation
**Files:** `site/content/batch.schema.json`, `site/scripts/batch.mjs`, `site/tests/batch.test.mjs`.
1. Write a temp-dir test for a valid batch, malformed JSON, manifest ID/date/asset mismatch, duplicate/unsafe paths, and zero-story day. Run `node --test tests/batch.test.mjs` and observe RED.
2. Implement `readBatch(batchDir)` and manifest validation using the article/schema rules; require exact file lists and safe names, no symlinks. Re-run test, observe GREEN.

### Task 2: Idempotent isolated ingest
**Files:** `site/scripts/batch.mjs`, `site/scripts/ingest-batch.mjs`, `site/tests/batch.test.mjs`, `site/package.json`.
1. Add failing tests for successful ingest/retry no-op; conflicting destination/malformed batch no changes; related links to the existing archive; zero-day retry; and source validation after ingest.
2. Implement lock, preflight, isolated copy and validate, reversible directory swap. CLI requires explicit `--accept-reviewed` before side effects. Re-run test and full suite.

### Task 3: PNG verification and card derivatives
**Files:** `site/scripts/images.mjs`, `site/scripts/content.mjs`, `site/scripts/prepare-content.mjs`, `site/scripts/validate-content.mjs`, `site/src/components/ArticleCard.astro`, `site/src/pages/articles/[id].astro`, `site/tests/images.test.mjs`, `site/package-lock.json`.
1. Write failing tests with real test-only PNGs for metadata/format rejection, missing asset, derivative dimensions, normal image-null build, and stable source master; run RED.
2. Pin sharp, verify image bytes and decode; generate 640×427 card WebP from approved master only, reference it from generated content, reserve dimensions on card/article. Run GREEN, rebuild and link check. No synthetic asset enters actual publication.

### Task 4: Category, integration and handoff
**Files:** `site/tests/ingest-build.test.mjs`, `site/README.md`, `EIDETIC_STRATUM_DESIGN.md`.
1. In isolated test site, add a category via config, ingest reviewed test batch into it, build, verify new category/article routes and all preexisting routes; assert missing image fails validation/build. Run full suite.
2. Verify clean `npm ci`, `npm run validate`, `npm test`, `npm run build`, `npm run check:dist`, preview and representative HTTP routes. Document operator commands, warnings, approval boundaries and that there is no Git repository or public host. Stop for Phase 4 authorization.
