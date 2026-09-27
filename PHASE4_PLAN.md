# Alderwick Correspondent Phase 4 Implementation Plan

> For Hermes: implement this authorized local assisted-drafting milestone test-first. Do not publish unattended, configure a cron job without request, deploy, or invent approved artwork.

**Goal:** Produce 0–3 reviewable local daily drafts from an optional OpenAI-compatible model endpoint, never ingesting or publishing them automatically.

**Architecture:** A versioned prompt and reviewed continuity/term files feed a Node drafting service. One bounded model request returns strict JSON story drafts. The service derives safe slugs/IDs/timestamps, validates against the full archive and writes an isolated Phase-3-compatible batch plus separate review notes. Errors go to a private, gitignored quarantine; no invalid output enters `content/`. Human acceptance continues through `ingest:batch --accept-reviewed` and local build/preview. A manual CLI can be run by an external scheduler, but no recurring job is installed here.

**Stack:** Node 22, built-in fetch/test/crypto/fs, existing Ajv schema and Phase 3 batch/validator. No new dependency, database, Git initialization, hosting, secret in source, or image generation.

## Work items (RED → GREEN → full tests)

1. `site/tests/daily-context.test.mjs`, `site/scripts/daily-context.mjs`, `site/content/world/emerging-terms.v1.json`, `site/content/world/continuity.v1.json`, `site/content/prompts/daily-edition.v1.txt`: versioned context loading, known categories, bounded recent titles/tags, terminology and continuity, strict date/count input. Tests fail for unknown version/missing files.
2. `site/tests/daily-model.test.mjs`, `site/scripts/daily-model.mjs`: OpenAI-compatible HTTP adapter using explicit endpoint/model and optional key from environment, local HTTP/HTTPS only, timeout/size limit, no body/prompt/key in errors. Test via local HTTP server (never a live provider) for success, malformed response, non-2xx and unsafe URL.
3. `site/tests/daily-draft.test.mjs`, `site/scripts/daily-draft.mjs`: strict one-shot 0–3 story response, stable safe app-derived IDs/timestamps, only existing related IDs, no model-supplied paths/assets, full-archive validation and review warnings, skipped day, stage manifest and review pack. Test duplicate titles, invalid shape, unsafe fields, and zero/no-asset state before writing real source.
4. `site/scripts/draft-daily.mjs`, `site/tests/daily-cli.test.mjs`: CLI defaults to today UTC, accepts only today or past day, optional skip day flag, atomic unique local draft/quarantine folders, lock against concurrent daily drafts. CLI has no publish or accept flag. Verify fixture HTTP success, quarantine on failure, source unchanged, and a reviewed draft can flow through Phase 3 ingest in an isolated site copy, build, and preview.
5. Update `.gitignore`, `site/README.md`, design phase status. Run `npm ci && npm run validate && npm test && npm run build && npm run check:dist`; probe preview. Document that local Git commits and actual provider/tone review remain unavailable until repository and provider are supplied; no scheduler registered.

**Editorial review gate:** Check tone, continuity and coined terms; if needed edit draft article/manifest and review notes, attach only approved local PNGs with matching manifest assets; then explicitly call Phase 3 ingest and rebuild. Recording proposed new terms in a sidecar does not make them canonical. Do not auto-ingest or auto-edit the versioned continuity/glossary sources.
