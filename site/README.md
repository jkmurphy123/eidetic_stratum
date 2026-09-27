# The Alderwick Correspondent — local prototype

Phases 1–4 of the approved Eidetic Stratum design. This is a static fictional newspaper with **local, editor-gated assisted drafting**, not a public release. It has no account system, server database, installed daily scheduler, CI or deployment.

## Run locally

Node.js 22.19+ and npm are recommended. From `site/`:

```sh
npm ci
npm run validate
npm test
npm run build
npm run check:dist
npm run preview
```

Visit the printed preview URL (normally http://127.0.0.1:4321/). `npm run dev` validates and prepares before starting Astro; after editing article JSON, restart dev or rerun `npm run content:prepare`. The masthead date is fixed at build time: rebuild on a new UTC day. `npm run validate` checks source structure, stored manifests and actual PNG decoding. `npm run build` regenerates disposable `src/generated/`, `public/indexes/` and `public/images/generated/` data. `npm run check:dist` checks local HTML links and referenced assets in the built output.

## Editorial ingest (Phase 3)

1. Prepare a batch **outside `content/` and `public/`** in a separate directory:

```text
/path/to/reviewed-batch/
  manifest.json
  articles/<slug>.json      # one per story; may omit directory on a skipped day
  images/<slug>.png         # only for stories with approved artwork; optional
```

Start from `content/article.schema.json`, `content/batch.schema.json` and the examples under `content/articles/`. Each article ID is `<real-UTC-YYYY-MM-DD>-<slug>`, its `published_at` date matches the edition date, and its image is normally `null`. If an approved PNG is used, declare `/images/articles/YYYY/MM/DD/<slug>.png` with alt, caption and credit, and include exactly `images/<slug>.png` in the batch. Do **not** submit unapproved artwork; `--accept-reviewed` is a human editorial attestation, not an automated approval system. Future-dated articles are rejected.

Example manifest (replace the date, run ID, ID and assets to match the actual batch):

```json
{
  "edition_date": "2026-09-25",
  "run_id": "2026-09-25-manual-01",
  "article_ids": ["2026-09-25-example-story"],
  "assets": [],
  "validation": {"status": "passed", "article_count": 1}
}
```

The manifest lists **every** story and image in that batch; `validation.status` must be `passed`, but the CLI independently revalidates the files. A skipped day uses empty `article_ids` and `assets` and count 0. Only one dated manifest is accepted per edition date; collect that day's stories in one batch. Reusing an identical batch reports `unchanged`; changing an existing article, asset or manifest reports a conflict instead of overwriting it. Keep the batch directory after a failure for correction or quarantine.

2. Review prose, continuity, dates, related IDs and artwork yourself. Add a section, if needed, by adding `{ "slug": "my-section", "label": "My Section" }` to `content/categories.json`, then reference that slug in the new article; no route code changes are needed.
3. Explicitly accept and ingest the reviewed batch:

```sh
npm run ingest:batch -- /absolute/path/to/reviewed-batch --accept-reviewed
npm run validate && npm test && npm run build && npm run check:dist
npm run preview
```

The ingest CLI locks out concurrent ingests, checks destination conflicts before writing, validates the candidate archive in an isolated workspace, and restores old directories if an ordinary filesystem operation fails during the local swap. It never publishes publicly. **This project is not a Git repository yet**; set up version control or make a backup before using real editorial content. This local mechanism is not a crash-proof transaction or an atomic deployment. If a process or machine crashes mid-swap, inspect `.ingest-stage-*` before cleaning it up; preserve any backup directories for manual recovery. The user must still review the preview before considering publication.

## Images

Only supplied, previously approved master PNGs belong under `public/images/articles/YYYY/MM/DD/`. Build validation rejects missing, symlinked, mislabeled, truncated and oversized images. From valid masters, the build derives 640×427 WebP card/lead crops under ignored `public/images/generated/`; article pages show the source master. Width/height are reserved in markup. The 12 included samples are image-free because no artwork was provided; synthetic image test fixtures exist only in temporary directories and are not publication assets.

## Archive and discovery

Home, category and tag feeds are pre-rendered in newest-first order, up to 25 stories per page (one slot is the lead on home page one). Ordinary next/previous links reach older stories. Article tags and related links are usable without JavaScript. `/search/` searches text with section/subject filters and shareable `q`, `category` and `tag` URL parameters; without JS it offers static browsing links. The isolated 26-story pagination fixture does not add filler content to the 12 real samples.

Reader-facing dates subtract 144 years from canonical UTC timestamps. The sample timestamps are for layout and tone review, not an automatic daily publishing schedule. Full articles normally have 4–6 paragraphs; brief notices and near-duplicate headlines produce editorial warnings. Text is rendered escaped, and markup in authored fields is rejected. Public hosting and unattended publication remain separate decisions.

## Assisted daily drafts (Phase 4)

`content/prompts/daily-edition.v1.txt`, `content/world/continuity.v1.json` and `content/world/emerging-terms.v1.json` are versioned **editor-reviewed** inputs. The model receives these, the section slugs, and up to 20 recent headlines/tags available as of the requested UTC edition day. It proposes 0–3 stories and optional provisional terms in strict JSON; the application derives safe IDs, slugs and UTC timestamps. A model cannot provide an image path or choose unpublished related IDs. No draft is added to the published archive by this command.

Configure a compatible chat-completions endpoint via environment variables (never in a source file or command argument containing a secret):

```sh
export EIDETIC_MODEL_API_URL='http://127.0.0.1:PORT/v1/chat/completions'  # replace PORT; remote endpoints must use HTTPS
export EIDETIC_MODEL_ID='your-model-id'
# EIDETIC_MODEL_API_KEY is optional for an unauthenticated local endpoint; set it in a secure environment if required.
npm run draft:daily                       # today, UTC
npm run draft:daily -- --date 2026-09-25  # a specific past/today UTC edition date
npm run draft:daily -- --skip              # intentional zero-story day; no model request
```

A successful run prints `site/drafts/<run-id>/batch` and a separate `REVIEW.md` plus `proposed-terms.json`. These directories are gitignored, unique per run, and do not touch `content/`. Invalid responses, model errors, conflicts with an ingested date, or failed validation create `site/quarantine/<run-id>/ERROR.txt` and exit nonzero; the source archive stays unchanged. The error log intentionally omits prompts, raw responses, provider bodies and secrets. Repeated attempts before acceptance make separate drafts; after an edition is ingested, another draft for that date is refused. The local draft lock prevents concurrent runs. If a process dies, inspect a stale `.daily-draft.lock` before clearing it manually.

**Editor checklist:** Read all paragraphs against the newspaper voice, reviewed continuity and earlier stories. Inspect near-duplicate-title warnings and `proposed-terms.json`; only after approval manually update the versioned emerging-terms JSON. Edit article files and manifest together if changes are needed. An illustration may be attached only if an approved master PNG already exists; add that PNG under `batch/images/` and update the article's image metadata and manifest `assets` list. Otherwise keep `image: null`. Then explicitly run:

```sh
npm run ingest:batch -- /absolute/path/to/drafts/<run-id>/batch --accept-reviewed
npm run validate && npm test && npm run build && npm run check:dist
npm run preview
```

The CLI can be invoked by an external *draft-only* scheduler in a single concurrency lane, but this project installs no timer or cron job. It never ingests, commits, publishes, deploys or sends a notification by itself. The local HTTP-stub tests exercise the model protocol and two successive staged/accepted editions; no live model credentials are configured here. **This checkout has no Git repository**, so the design's reviewable local commit exit check cannot yet be met. Human tone/continuity review and live-provider acceptance must be performed before real use; no sample draft has been published.
