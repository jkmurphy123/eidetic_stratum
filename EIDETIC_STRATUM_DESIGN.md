# The Alderwick Correspondent — Website Design

Status: APPROVED DESIGN — implementation phases require separate authorization  
Publication: **The Alderwick Correspondent**, the biggest paper in the city of Alderwick  
Masthead tagline: **News for the Serious Eidetician**  
Setting: a Victorian-era gazette for Eideticians, circa 1880s

## 1. Purpose and editorial premise

Build a fast, readable fictional site for The Alderwick Correspondent: the biggest newspaper in Alderwick, reporting on ordinary city life and the scientific exploration of a deeper reality. Readers encounter ordinary civic reporting alongside anomalous measurements, expedition dispatches, classified notices, missing objects, and rare books. The world should feel internally consistent: its reporters regard the Eidetic Stratum as a difficult and sometimes disputed field of study, rather than treating every story as a revelation. The front-page masthead carries “News for the Serious Eidetician.”

The ordinary world has the quality of Plato's cave; Eideticians investigate the Eidetic Stratum beneath familiar appearances. The first explorer's successful portal and probe established the **Prime Referent**. Subsequent expeditions describe named strata and chart positions using a circular grid. **Eidetic Interstices** are of particular interest. Writers may coin new terms for recovered objects, transmissions, and the discipline in sample stories. Record each term and its meaning in an emerging terminology list so it can be reviewed, made consistent across issues, and later promoted into a formal world glossary; do not imply that a first-use term is already canonical.

This is fiction. A discreet masthead note and an About page should make that clear without interrupting the in-world presentation.

## 2. Goals and first local milestone

- A responsive, accessible reading experience with a faded paper palette, dense but legible typography, monochrome lithograph-style images, and restrained steampunk details.
- Home feed and category feeds, newest first, with access to the entire archive.
- Individual full-article pages with 4–6 paragraphs initially, optional image and caption, tags, and zero or more related article links.
- Search over titles, summaries, article text, and tags; category and tag filtering.
- In a later phase, a simple, reproducible daily job drafts 1–3 stories total, appends reviewed article JSON files and only the approved images actually used, validates them, and prepares a new static build. Published records are never silently overwritten by ingest; explicit, reviewed corrections remain possible. Public deployment remains undecided during local testing.
- Start with a small set of deliberately written sample stories to settle layout and tone before scaling generation.

Out of scope initially: accounts, comments, personalization, real-time updates, infinite auto-loading, server database, paywalls, and animation-heavy interactions.

## 3. Recommended implementation

Use **Astro with static output**, plain HTML/CSS, and small JavaScript modules for search/filter controls; a “Load more” enhancement is optional after static pagination works. Astro is a build tool here, not a requirement for a client-side application: the deployed result consists of pre-rendered HTML, a search JSON index, images, CSS, and a small amount of JS. This gives article pages readable content and stable links without requiring React or a continuously running server. If the prototype later needs complex client state, add a small React island only for that feature.

The content source is version-controlled JSON, with **one file per article** and PNG assets stored alongside the project. A build-time script validates the files and prepares build-time feed data and a compact search index. Feed/archive pages and article pages are generated at build time. The browser loads the search index only when searching; feed navigation uses ordinary HTML links, optionally enhanced with small JavaScript.

Suggested structure:

```text
site/
  package.json                 # validate, prepare, dev, test, build commands
  astro.config.mjs             # static output, canonical site URL when known
  src/
    pages/                   # Home, category, article, tag, archive, search, About
    layouts/                 # Shared document shell, metadata, skip link
    components/              # Masthead, tabs, card, byline, archive controls
    lib/                     # Validated content reader, route/feed helpers
    styles/
    generated/               # Gitignored build-time feed data
  content/
    categories.json          # Tab labels and display order
    articles/2026/09/25/     # Real UTC storage date; one JSON file per article
    batches/                 # One daily batch manifest per publishing date
    world/                   # Emerging terms and continuity notes; formal glossary later
  public/
    images/articles/2026/09/25/
    indexes/                 # Gitignored browser search index
  scripts/
    validate-content.mjs
    prepare-content.mjs
    ingest-batch.mjs
  tests/                     # Fixtures, unit, build and browser smoke checks
  .github/workflows/         # Optional future CI, not needed for local prototype
```

Storage paths and `published_at` use the real UTC publication date. The visible date is derived by subtracting **144 from the UTC year**, retaining month and day: 2026-01-01 displays as 1882-01-01. Article/card dates derive from their `published_at`; the masthead edition date derives from the real UTC build date and remains fixed in a static build until rebuilt. Refresh the build on each publishing day (and on a skipped day if the masthead must stay current). No fictional date is entered in article JSON. If the target year lacks February 29, display February 28 in that target year; this presentation fallback does not alter the real timestamp or ordering. The article's optional `dateline` is a place name, not this edition date. Keep modern storage dates off the newspaper masthead; editorial previews may show both dates for clarity.

## 4. Information architecture

| View | Main contents | Behavior |
| --- | --- | --- |
| Front page | Lead story, newest mixed feed, category tabs | Newest first; lead placement is editorial, not an exception to feed ordering |
| Category | Category heading and its story feed | Same card design and pagination as home |
| Article | Headline, deck, dateline, byline, image, body, tags, related stories | Stable, shareable URL |
| Tag | Stories sharing a tag | Newest first |
| Search | Matching stories with category and optional tag filters | Lightweight client search from a compact index |
| About / Field Guide | Fictional premise, site explanation, emerging glossary | Keeps world terminology discoverable |

Initial categories, in order: **World News**, **Field Reports**, **Unusual Discoveries**, **Agony Column**, **Common Enquiries**, **Rare Books & Items**, and **Who's Who**. Define labels and slugs in `categories.json`, so adding a tab takes one config edit. All articles use the same schema; categories govern display and navigation rather than different data models. An article has one primary category in v1. Cross-cutting subjects use tags. The former Local News sample stories now belong under **World News**; **Field Reports** is reserved for future field-dispatch articles. **Common Enquiries** is reserved as a frequently asked questions / common questions section; the former Lost & Found sample notices now belong under **Agony Column** until dedicated enquiry content is authored. **Who's Who** is a rightmost section for articles about famous people, notable Eideticians, civic figures and other names of consequence.

Mobile: tabs may scroll horizontally with visible overflow cues; the masthead compresses and the card layout becomes a single column. Category names stay readable without hiding content behind a menu.

## 5. Visual system

- **Paper:** warm off-white background (`#eee5cf`), slightly darker panels (`#e2d6ba`), ink (`#26221c`), muted secondary ink (`#62594c`), and a restrained burgundy accent (`#713f39`). Treat these as starting tokens to tune in a browser.
- **Typography:** a period-flavored display serif for masthead and headings; a highly legible serif for articles and cards. Prefer self-hosted WOFF2 fonts with solid system serif fallbacks. Avoid distressed body text and excessive letter spacing.
- **Layout:** The Alderwick Correspondent masthead and “News for the Serious Eidetician” tagline, transformed edition date, slim category rule, then a two-column desktop news grid with one clearly larger lead story. Use generous line height in long-form text and cap article measure near 65–75 characters.
- **Imagery:** Only major stories carry an already approved, locally hosted illustration; most articles and notices have no image. Illustrations are PNGs rendered with `width`/`height` to reserve space; use responsive derivatives for the imaged stories, lazy loading below the fold, and descriptive alt text. Source art should resemble engraved or lithographed illustrations, with no implied photographic provenance. Use small manually sized assets in the initial visual prototype; automate thumbnails from approved master images by Phase 3. Preserve the original PNG link in the content record.
- **Texture:** subtle CSS paper and fine rules only. Avoid large background bitmaps, spinning gears, parallax, and faux stains over text.
- **Accessibility:** semantic headings and landmarks, visible keyboard focus, sufficient contrast, descriptive link labels, meaningful alt text, and controls with screen-reader names. Do not convey category or urgency by color alone.

Article cards show category, title, short deck, transformed date, optional thumbnail, and optional tags. Full articles show image credit or fictional provenance when illustrated. The no-image state is normal and must remain visually balanced on both cards and full article pages; do not add placeholder engravings.

## 6. Article JSON contract

One JSON object per article; all categories use these exact fields. Required fields are `id`, `slug`, `title`, `summary`, `category`, `published_at`, `author`, `paragraphs`, `tags`, `image`, and `related_ids`. Optional fields are explicitly nullable within `image` or may be omitted when documented. Keep prose as plain text; render it as text nodes, never injected HTML. Full-story paragraphs are an array of 4–6 strings initially. Short classified notices may have fewer paragraphs, with a validator warning and editorial review; do not reject them solely for brevity.

```json
{
  "id": "2026-09-25-prime-referent-drift",
  "slug": "prime-referent-drift",
  "title": "Surveyors Report a Drift at the Prime Referent",
  "summary": "A second reading places the original probe's echo beyond the charted arc.",
  "category": "unusual-discoveries",
  "published_at": "2026-09-25T12:00:00Z",
  "author": "The Observatory Correspondent",
  "dateline": "North Quay Observatory",
  "paragraphs": [
    "An unexpected discrepancy was recorded during the morning survey of the Prime Referent.",
    "The first instrument was dismantled and tested against a sealed local standard.",
    "Its replacement reproduced the same displacement within the accepted margin of error.",
    "The observatory has asked neighboring stations to preserve their original plates.",
    "One Eidetician cautioned that the apparent movement may belong to the measuring frame.",
    "The institute will issue its next reading after the evening transit."
  ],
  "tags": ["prime-referent", "surveying", "interstices"],
  "image": {
    "src": "/images/articles/2026/09/25/prime-referent-drift.png",
    "alt": "Engraved view of a circular surveying instrument beside a sealed probe chamber",
    "caption": "The morning survey apparatus, as rendered for the Correspondent.",
    "credit": "Correspondent engraving desk"
  },
  "related_ids": ["2026-09-22-interstice-plates"]
}
```

`id` is permanent and unique; `slug` is unique among articles, and the permanent route is `/articles/<id>/` so a later headline correction does not break a link. `published_at` is the true ordering key. Define ties by descending `id` for deterministic results. `category` must match a configured slug, tags must be normalized lowercase slugs, and `related_ids` reference IDs rather than URLs. Display titles can be revised, but published IDs, routes, timestamps, and old article files should not be silently replaced by a daily append. Corrections should be deliberate edits in version control, with an optional visible correction note added in a future schema version. The example's related ID is illustrative; replace it with an existing fixture ID (or `[]`) before using the example in a build.

For any story without artwork, set `image` to `null` (the usual case); otherwise `src`, `alt`, `caption`, and `credit` are present and point to an already approved asset. The renderer derives category routes and related article links from the validated indexes. A lightweight JSON Schema should formalize these checks before any automated publishing begins. The displayed 144-year-offset date is computed from `published_at`, not stored in the record.

## 7. Feed, archive, and search behavior

Every article is retained. Build sorted, 25-card HTML pages for the front page, each category and each tag. The first page lives at `/`, `/category/<slug>/`, or `/tag/<slug>/`; later pages live at `/page/2/`, `/category/<slug>/page/2/`, or `/tag/<slug>/page/2/`. Render an ordinary next-page link. A JS “Load more” enhancement is deferred beyond the initial release; do not ship a second JSON feed format or duplicate card templates for it. No empty page routes are generated.

The default sort is descending `published_at` everywhere, including tag and search views; feed order is never changed by a featured image. Search uses a separate compact index containing `id`, `title`, `summary`, `category`, `tags`, `published_at`, and searchable normalized article text. Load it on search interaction, debounce input, and show result counts and an empty state. Search runs on the client, so `/search/` with JavaScript disabled explains that search requires JavaScript and offers category/archive links. For an early prototype with a handful of stories, a small full-text index is fine; shard or replace it when measured download size becomes too large. Related links are resolved during build and display only valid targets.

## 8. Daily article production and publishing

For the local prototype and manual-content release, author and review articles locally, validate, build, and view with Astro's local server. In Phase 4, a local scheduled job may draft 1–3 stories on a publishing day, or zero on a skipped day, never in the visitor's browser. It creates files in staging for review; public publishing and its host are later decisions. The scheduler and model provider are interchangeable; the content contract is the stable boundary.

1. **Plan the edition.** Read the category config, recent titles/tags, emerging terminology list, and a small continuity digest. Choose 1–3 stories total across categories; zero is allowed for a skipped day, not 1–3 per category. Generate unique pitches that fit Alderwick's newspaper voice and do not contradict established events.
2. **Draft records.** Ask the model for strict JSON matching the schema, one article at a time or in bounded batches. Include 4–6 coherent paragraphs for full articles, a concise summary, tags, category, and optional related article IDs chosen from known IDs. New terminology is permitted but must be added to the emerging terms list for editorial review. Avoid real-world claims presented as nonfiction.
3. **Attach approved illustrations selectively.** Only major stories selected by the editor receive artwork, from an already approved local image set; for all others set `image` to `null`. Store the approved master PNG at the article's declared path and produce smaller responsive variants during build. Use consistent aspect ratios for card crops, such as 3:2. If no suitable approved image exists, publish without one rather than generating or inventing a replacement.
4. **Validate before ingest.** Parse JSON; enforce schema, unique IDs/slugs, known categories, timestamp format, expected paragraph count, safe plain text, valid related IDs, image path existence, and no duplicate article already in the archive. Review continuity and near-duplicate titles with programmatic checks. Put invalid batches in quarantine and alert the operator rather than publishing partial broken records.
5. **Commit the edition.** Write a dated batch manifest with the new IDs, expected image paths, generation run identifier, and validation summary. Ingest only a wholly validated batch into `content/articles/YYYY/MM/DD/` and the matching public image path. Preflight every destination before writing; if any destination conflicts, write nothing. Rerunning the same batch skips identical files and fails on conflicting content. Stage changes in a temporary branch/worktree (or equivalent isolated workspace); if copying or final validation fails, discard that workspace rather than leaving a half-ingested source tree.
6. **Build and inspect locally.** Regenerate indexes and static pages, run link and asset checks, then inspect the built `dist/` through a local preview server. Keep source files and manifests in version control for rollback and audit. Once a public host is selected, add atomic deployment of the complete artifact; a failed build must leave the previous public version live, and a filesystem copy directly into a live web root will not meet that requirement.

Example manifest:

```json
{
  "edition_date": "2026-09-25",
  "run_id": "2026-09-25-daily-01",
  "article_ids": ["2026-09-25-prime-referent-drift"],
  "assets": ["/images/articles/2026/09/25/prime-referent-drift.png"],
  "validation": {"status": "passed", "article_count": 1}
}
```

The daily process appends files; it does not modify a central array or delete old posts. Category membership is an article property, so placing a story under a tab means setting `category` to its slug. Manual editorial review is required for scheduled runs; unattended publishing would require a separate explicit decision after quality has been demonstrated. Keep prompts, emerging terminology, and continuity notes version-controlled so the fictional history remains coherent as the archive grows.

## 9. Proposed architecture and implementation contract

The following architecture is the approved design direction; implementation remains phase-gated. Keep the first implementation framework-simple: Astro's static `getStaticPaths()` routes and reusable `.astro` components, Node scripts for preparation/ingest, CSS for layout, and browser JS only for search. No server runtime, React, CMS, or database in v1.

### 9.1 Source, build, and route boundaries

| Owner | Responsibility and contract |
| --- | --- |
| `content/categories.json` | Ordered `{slug, label}` entries; slugs unique and safe for URLs. Navigation derives entirely from this file. |
| `content/articles/YYYY/MM/DD/<slug>.json` | One source record per article; directory date matches the real UTC date in `published_at`, and the ID is `<YYYY-MM-DD>-<slug>`. Sort by real UTC time; display date uses the shared minus-144-year formatter. `dateline` remains a place name. |
| `src/lib/content.*` | Read prepared validated records once, sort by `published_at` descending then `id` descending, and provide shared selectors for home, category, tag, related stories, and page slices. Never independently parse raw content in page components. |
| `src/pages/index.astro`, `page/[number].astro`, `category/[slug]/index.astro`, `category/[slug]/page/[number].astro`, `tag/[slug]/index.astro`, `tag/[slug]/page/[number].astro` | Render the same `FeedPage`/`ArticleCard` components; generate only extant slugs and valid page numbers. Unknown routes use the static host's 404 page. |
| `src/pages/articles/[id].astro`, `search/index.astro`, `about/index.astro`, `404.astro` | Immutable article route; browser-only search page; explicit fiction disclosure/Field Guide; useful not-found navigation. |
| `scripts/validate-content.mjs`, `scripts/prepare-content.mjs` | Shared validation rules; preparation emits gitignored `src/generated/articles.json` for Astro and `public/indexes/search.json` for search. The generated files are disposable; a clean checkout rebuilds them. |
| `src/layouts/BaseLayout.astro` | Shared Alderwick Correspondent masthead/tagline, semantic landmarks, SEO title/description, canonical links (once host URL is known), responsive viewport, and fiction disclosure link. |

Build order: install pinned dependencies from a committed lockfile → validate all source records/assets (and manifests once Phase 3 exists) → prepare generated data (and image derivatives from Phase 3) → run unit checks → `astro build` → check generated internal links and referenced assets → preview `dist/` locally. Public publishing/CI are later, separately approved steps. The same preparation step runs before local development and any future CI. Do not place mutable source articles under `public/` or hand-edit generated outputs. Use relative or base-aware asset URLs if deployment below a domain root is later required; default to local preview at `/`.

### 9.2 Validation rules and editorial safeguards

- Use a checked-in JSON Schema for record shape and additional semantic checks in Node (cross-record uniqueness, category membership, paths, related IDs, paragraph lengths, dates, image files). Reject extra fields in v1 so misspelled metadata cannot silently disappear. Required nullable `image` and required arrays `tags`/`related_ids` avoid template branching on missing keys; `dateline` is an optional plain-text string.
- Enforce safe slug/ID characters and a single UTC `Z` timestamp representation; reject future-dated records at release unless deliberately authorized for a scheduled edition. Reject duplicate IDs, slugs, repeated tags/related IDs, self-links, traversal paths, missing image assets and unknown categories. Restrict image paths to `/images/articles/` and check actual image format/dimensions, not just filename extensions. Keep captions/credits as text, not HTML.
- Validate manifest completeness against the batch (IDs and assets), edition dates and run IDs; a zero-article day is valid but must not produce duplicate empty editions on retry. Warn on short notices and near-duplicate headlines; block structural errors. Human review, not a similarity algorithm, decides world continuity and prose quality.
- Treat authored/generated text and supplied image files as untrusted input. Render as escaped text; never let model output supply HTML, links, file destinations, shell commands, or deployment credentials. Store provider keys only in the scheduler's secret store, never in article JSON, prompts, or committed manifests.
- Keep the selectively used, pre-approved master PNGs as source assets; make card-width WebP/AVIF or optimized PNG derivatives in `public/images/generated/` with deterministic names, and reserve explicit dimensions. Link the master from the full image only if needed. A failed derivative build fails the local build rather than silently breaking thumbnails. Start with a small, measured dependency (for example `sharp`) instead of a custom image codec. Do not build an image-generation or approval subsystem.

### 9.3 Search, scaling, and accessibility

`search.json` is a versioned array of compact records with title, summary, normalized body text, category, tags, timestamp, and canonical article URL. Use case-insensitive normalized term matching across these fields, AND between query terms, stable newest-first order, and filters by category plus optional tag. Parse/filter on the client; URL query parameters (`q`, `category`, `tag`) make results shareable and preserve state on reload. A blank query may show an instructional state instead of loading the index. Never inject matched text as HTML. Search has no server rendering or no-JS results in v1; browsing feeds and tags remains fully usable without JS.

Measure compressed search-index transfer size and search response time with representative 100/1,000-article fixtures before choosing shards. Proposed review threshold: if compressed index exceeds ~1 MB or a midrange mobile browser takes >200 ms after load to produce results, investigate a static inverted index or build-time shards. These are triggers for measurement, not guarantees or launch blockers for 12–18 stories. Avoid index-in-every-page payloads. Test keyboard-only navigation, reduced motion, zoom to 200%, and screen-reader labels; verify headline and body contrast with the final font/colors.

### 9.4 Edition pipeline and operational boundary

Separate **drafting** from **publication**. In Phase 4 a local scheduler produces a staged edition with a manifest and logs; editor review accepts or rejects it and selects any already approved illustration. A reviewed ingest runs preflight (including file-content comparisons for repeat runs), writes in an isolated workspace, revalidates the entire archive, and makes a reviewable local commit; a PR is optional once a remote workflow is adopted. For now, build and preview locally—there is no deploy job. Defer unattended auto-merge/publish until explicitly approved. Give each run a stable edition/run ID and log validation failures without leaking prompt/provider secrets. Configure a single concurrency lane to prevent two runs targeting the same edition; resolve reruns by identical-content no-op or explicit conflict, never by overwrite. Choose a public host and its secrets, preview, atomic release and rollback process later.

## 10. Phased implementation plan and verification

Each phase needs separate approval; the approved design does not itself authorize implementation. Phase 1 can use a smaller fixture set while the full sample edition is written. Use a Node LTS version and Astro version pinned at kickoff, with `npm` and a committed lockfile; avoid declaring specific version numbers before setup. Test runner: Node's built-in test runner for scripts, plus a lightweight browser E2E runner if visual flows merit it.

| Phase | Deliverables (in dependency order) | Exit checks |
| --- | --- | --- |
| 1 — Foundation and visual prototype | `site/` Astro scaffold, category config, schema/validator, representative hand-authored 4–6-paragraph articles, shared date formatter, masthead/tagline, layout/cards, front/category/article/About/404 pages and first-pass CSS. Begin with a few articles in distinct categories; grow to 12–18 across all six before visual sign-off. Record coined terms for later glossary review. No scheduler or ingest yet. | Clean local build from checkout; invalid schema/image path fails; offset-date cases including 2026-01-01 → 1882-01-01 and leap day pass; real-length and ordinary image-free stories render; imaged major story is checked when approved assets are supplied (do not invent them); desktop/mobile screenshots reviewed; fiction note visible and focus states usable. |
| 2 — Archive and discovery | Shared sorted selectors, paginated home/category/tag routes, working related links, search index and client search/filters/URL state. Next-page links only; no “Load more” JS. | At least 26 fixture stories exercise page 2 and oldest-story access; unknown/empty tag/category routes 404; equal timestamps deterministic; search title/body/tag, zero results, filters, no-JS fallback and keyboard use verified. |
| 3 — Local editorial ingest | Manifest validator, isolated idempotent batch ingest, approved-image derivative generation, static link/asset checker and local build/preview commands. Add a new category using only config and content. Public CI/deployment is explicitly deferred. | Simulated batch succeeds twice with second run no-op; conflict/malformed batch writes nothing; old URLs survive; missing asset fails the local build; preview serves the complete site. No claim of public release or rollback test yet. |
| 4 — Assisted daily editions (later authorization) | Versioned emerging-terms list/prompts/continuity digest, model drafting of 1–3 daily stories, attachment of approved existing artwork only to major stories, staging/quarantine, editor review and optional local scheduled run. | Test against stubbed model responses; rejected/failed editions never ingest; approved edition produces a reviewable local commit and a working local preview; successive editions reviewed for tone/continuity. No unattended publication or public deployment. |

Suggested local commands once implemented: `cd site && npm ci && npm run validate && npm test && npm run build && npm run check:dist && npm run preview`. Any future CI should run the same validation/build/check commands from a clean checkout. Include test fixtures for empty archive, one article, 25/26 cards, same-timestamp ties, image-null stories, duplicate IDs/slugs, missing related target, conflicting rerun, malformed JSON and unsafe paths. For later browser testing, verify routes and screenshots at narrow and wide viewport sizes. Never declare a phase complete based only on files existing.

The first *local manual-content milestone* is ready after Phase 3: a new reviewed batch needs no page-code change, all six categories share one renderer, permanent links work, and the oldest article is reachable through ordinary pagination. Phase 4 changes how editions are authored, not how readers access them. Public hosting, CI, atomic deployment, rollback verification and any “Load more” enhancement are separate later decisions.

## 11. Decision log and deferred questions

| ID | Locked decision | Answer | Recorded (UTC) |
| --- | --- | --- | --- |
| D1 | Publication identity | The Alderwick Correspondent, biggest newspaper in Alderwick; tagline “News for the Serious Eidetician.” | 2026-09-25 |
| D2 | Reader-facing date | Subtract 144 from the real UTC publication year, retaining month and day; derive the date at render time. | 2026-09-25 |
| D3 | Terminology | New in-world terms may be coined now; compile an emerging list and formalize the glossary later. | 2026-09-25 |
| D4 | Editorial volume and length | 1–3 stories total on publishing days; full stories start at 4–6 paragraphs. Short notices may be briefer. | 2026-09-25 |
| D5 | Delivery scope | Test and review locally first; decide public hosting/deployment later. Keep publication under editorial control. | 2026-09-25 |
| D6 | Artwork | Only major stories have images. Assume images are already approved; do not create an image-generation/approval pipeline. | 2026-09-25 |
| D7 | Pagination | Ordinary static next-page links now; “Load more” button deferred. | 2026-09-25 |

Open questions for the current design: **none**. Public host, unattended publishing, a finalized world glossary and optional pagination enhancement are consciously deferred. Phases 1–4 were separately authorized for local implementation. Phase 3 uses an isolated filesystem candidate and reversible directory swap because this checkout has no Git repository; it does not claim to create a commit, provide power-loss transaction guarantees, or atomically deploy a public site. Phase 4 now implements local, editor-gated assisted-draft staging, quarantine, versioned editorial context and an interchangeable OpenAI-compatible HTTP boundary. Its local HTTP-stub tests exercise successive editions and preview builds, but the design's **reviewable local commit**, real-provider acceptance and human tone/continuity review remain pending Git initialization, model configuration and editorial sign-off. No daily schedule, unattended ingest or deployment is active. The implementation and operator workflow are described in `site/README.md`.
