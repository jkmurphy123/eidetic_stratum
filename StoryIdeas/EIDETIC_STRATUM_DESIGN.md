# The Eidetic Stratum — Website Design

Status: design draft for a sample-content prototype  
Working concept: a daily gazette for Eideticians, circa 1880

## 1. Purpose and editorial premise

Build a fast, readable fictional news site that feels like a Victorian newspaper reporting on the scientific exploration of a deeper reality. Readers encounter ordinary civic reporting alongside anomalous measurements, expedition dispatches, classified notices, missing objects, and rare books. The world should feel internally consistent: its reporters regard the Eidetic Stratum as a difficult and sometimes disputed field of study, rather than treating every story as a revelation.

The ordinary world has the quality of Plato's cave; Eideticians investigate the Eidetic Stratum beneath familiar appearances. The first explorer's successful portal and probe established the **Prime Referent**. Subsequent expeditions describe named strata and chart positions using a circular grid. **Eidetic Interstices** are of particular interest. Terms for recovered objects, transmissions, and the discipline itself can be finalized in a separate world glossary; sample articles should not hard-code unapproved terminology.

This is fiction. A discreet masthead note and an About page should make that clear without interrupting the in-world presentation.

## 2. Goals and first release

- A responsive, accessible reading experience with a faded paper palette, dense but legible typography, monochrome lithograph-style images, and restrained steampunk details.
- Home feed and category feeds, newest first, with access to the entire archive.
- Individual article pages with 6–8 paragraphs, optional image caption, tags, and zero or more related article links.
- Search over titles, summaries, article text, and tags; category and tag filtering.
- A simple, reproducible daily job that adds immutable article JSON files and image assets, validates them, and publishes a new static site build.
- Start with a small set of deliberately written sample stories to settle layout and tone before scaling generation.

Out of scope initially: accounts, comments, personalization, real-time updates, infinite auto-loading, server database, paywalls, and animation-heavy interactions.

## 3. Recommended implementation

Use **Astro with static output**, plain HTML/CSS, and small JavaScript modules for search, filter controls, and a “Load more” archive button. Astro is a build tool here, not a requirement for a client-side application: the deployed result consists of pre-rendered HTML, JSON indexes, images, CSS, and a small amount of JS. This gives article pages readable content and stable links without requiring React or a continuously running server. If the prototype later needs complex client state, add a small React island only for that feature.

The content source is version-controlled JSON, with **one file per article** and PNG assets stored alongside the project. A build-time script validates the files and creates compact feed/search indexes. The browser fetches only the index pages needed for the current view; it never downloads every full article to show a feed. All article pages are generated at build time.

Suggested structure:

```text
site/
  src/
    pages/                   # Home, category, article, tag, search, About
    components/              # Masthead, tabs, card, byline, archive controls
    styles/
  content/
    categories.json          # Tab labels and display order
    articles/2026/09/25/     # One immutable JSON file per article
    batches/                 # One daily batch manifest per publishing date
  public/
    images/articles/2026/09/25/
  scripts/
    validate-content.mjs
    build-indexes.mjs
    ingest-batch.mjs
  generated/                 # Build output only; never the source of truth
```

The example dates above show the storage format, not the fictional year. The visible newspaper date may be an in-world date, while `published_at` is a real ISO 8601 timestamp used for ordering. Decide on an in-world calendar later; a consistent fictional dateline can be displayed alongside the real publication date if useful.

## 4. Information architecture

| View | Main contents | Behavior |
| --- | --- | --- |
| Front page | Lead story, newest mixed feed, category tabs | Newest first; lead placement is editorial, not an exception to feed ordering |
| Category | Category heading and its story feed | Same card design and pagination as home |
| Article | Headline, deck, dateline, byline, image, body, tags, related stories | Stable, shareable URL |
| Tag | Stories sharing a tag | Newest first |
| Search | Matching stories with category and optional tag filters | Lightweight client search from a compact index |
| About / Field Guide | Fictional premise, site explanation, emerging glossary | Keeps world terminology discoverable |

Initial categories, in order: **World News**, **Local News**, **Unusual Discoveries**, **Agony Column**, **Lost & Found**, and **Rare Books & Items**. Define labels and slugs in `categories.json`, so adding a tab takes one config edit. All articles use the same schema; categories govern display and navigation rather than different data models. An article has one primary category in v1. Cross-cutting subjects use tags.

Mobile: tabs may scroll horizontally with visible overflow cues; the masthead compresses and the card layout becomes a single column. Category names stay readable without hiding content behind a menu.

## 5. Visual system

- **Paper:** warm off-white background (`#eee5cf`), slightly darker panels (`#e2d6ba`), ink (`#26221c`), muted secondary ink (`#62594c`), and a restrained burgundy accent (`#713f39`). Treat these as starting tokens to tune in a browser.
- **Typography:** a period-flavored display serif for masthead and headings; a highly legible serif for articles and cards. Prefer self-hosted WOFF2 fonts with solid system serif fallbacks. Avoid distressed body text and excessive letter spacing.
- **Layout:** masthead, date/edition line, slim category rule, then a two-column desktop news grid with one clearly larger lead story. Use generous line height in long-form text and cap article measure near 65–75 characters.
- **Imagery:** one locally hosted PNG per typical story, rendered with `width`/`height` to reserve space; use responsive derivatives, lazy loading for below-the-fold images, and descriptive alt text. Source art should resemble engraved or lithographed illustrations, with no implied photographic provenance. Generate thumbnails from the master image during build; preserve the original PNG link in the content record.
- **Texture:** subtle CSS paper and fine rules only. Avoid large background bitmaps, spinning gears, parallax, and faux stains over text.
- **Accessibility:** semantic headings and landmarks, visible keyboard focus, sufficient contrast, descriptive link labels, meaningful alt text, and controls with screen-reader names. Do not convey category or urgency by color alone.

Article cards show category, title, short deck, thumbnail, date, and optional tags. Full articles show image credit or fictional provenance where appropriate. An empty image is supported for terse notices; most stories should have one.

## 6. Article JSON contract

One JSON object per article; all categories use these exact fields. Required fields are `id`, `slug`, `title`, `summary`, `category`, `published_at`, `author`, `paragraphs`, `tags`, `image`, and `related_ids`. Optional fields are explicitly nullable within `image` or may be omitted when documented. Keep prose as plain text; render it as text nodes, never injected HTML. Paragraphs are an array of strings, normally 6–8; allow a shorter classified notice with a validator warning or a documented editorial exception.

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
    "caption": "The morning survey apparatus, as rendered for the Gazette.",
    "credit": "Gazette engraving desk"
  },
  "related_ids": ["2026-09-22-interstice-plates"]
}
```

`id` is permanent and unique; `slug` is unique among articles, and the permanent route is `/articles/<id>/` so a later headline correction does not break a link. `published_at` is the true ordering key. Define ties by descending `id` for deterministic results. `category` must match a configured slug, tags must be normalized lowercase slugs, and `related_ids` reference IDs rather than URLs. Display titles can be revised, but published IDs, routes, timestamps, and old article files should not be silently replaced by a daily append. Corrections should be deliberate edits in version control, with an optional visible correction note added in a future schema version.

For notices without artwork, set `image` to `null`; otherwise `src`, `alt`, `caption`, and `credit` are present. The renderer derives category routes and related article links from the validated indexes. A lightweight JSON Schema should formalize these checks before any automated publishing begins.

## 7. Feed, archive, and search behavior

Every article is retained. Generate sorted index shards for all stories and each category, for example 25 cards per shard. Page one is pre-rendered; “Load more” fetches the next shard and appends cards without losing scroll position. Also provide crawlable archive routes such as `/page/2/` and `/category/world-news/page/2/` so older stories remain reachable without JavaScript. Do not fetch a single ever-growing all-articles JSON file.

The default sort is descending `published_at` everywhere, including tag and search views; feed order is never changed by a featured image. Search uses a separate compact index containing `id`, `title`, `summary`, `category`, `tags`, and searchable normalized article text or a build-generated excerpt/token index. Load it on search interaction, debounce input, and show result counts and an empty state. For an early prototype with a handful of stories, a small full-text index is fine; shard or replace it when measured download size becomes too large. Related links are resolved during build and display only valid targets.

## 8. Daily article production and publishing

Use an external daily scheduled job (CI workflow or a local scheduled script), not the visitor's browser. The job creates new files in a staging directory, validates them, and only then publishes a build. The scheduler and model provider are interchangeable; the content contract is the stable boundary.

1. **Plan the edition.** Read the category config, recent titles/tags, world glossary, and a small continuity digest. Choose a configurable count per category; zero is allowed. Generate unique pitches that fit the newspaper's tone and do not contradict established events.
2. **Draft records.** Ask the model for strict JSON matching the schema, one article at a time or in bounded batches. Include 6–8 coherent paragraphs for full articles, a concise summary, tags, category, optional related article IDs chosen from known IDs, and an image brief stored separately during staging. Avoid real-world claims presented as nonfiction.
3. **Create illustrations.** Generate one monochrome engraved/lithographed image for each selected article, save it as PNG at the article's declared path, and produce smaller responsive variants during build. Use consistent aspect ratios for card crops, such as 3:2, and allow an article to omit an image if generation fails.
4. **Validate before ingest.** Parse JSON; enforce schema, unique IDs/slugs, known categories, timestamp format, expected paragraph count, safe plain text, valid related IDs, image path existence, and no duplicate article already in the archive. Review continuity and near-duplicate titles with programmatic checks. Put invalid batches in quarantine and alert the operator rather than publishing partial broken records.
5. **Commit the edition.** Write a dated batch manifest with the new IDs, expected image paths, generation run identifier, and validation summary. Copy only validated files into `content/articles/YYYY/MM/DD/` and images into the matching public path. The ingest command is idempotent: rerunning the same batch skips identical files and fails on conflicting content.
6. **Build and deploy.** Regenerate indexes and static pages, run link and asset checks, build, then deploy atomically. A failed build leaves the previous published version live. Keep source files and manifests in version control for rollback and audit.

Example manifest:

```json
{
  "edition_date": "2026-09-25",
  "run_id": "2026-09-25-daily-01",
  "article_ids": ["2026-09-25-prime-referent-drift"],
  "assets": ["/images/articles/2026/09/25/prime-referent-drift.png"]
}
```

The daily process appends files; it does not modify a central array or delete old posts. Category membership is an article property, so placing a story under a tab means setting `category` to its slug. A manual editorial review step can be enabled during early runs, then relaxed once output quality is stable. Keep prompts, glossary, and continuity notes version-controlled so the fictional history remains coherent as the archive grows.

## 9. Prototype sequence and acceptance checks

1. Create the masthead, navigation, front page, category page, article page, tag page, and archive controls with 12–18 hand-reviewed sample articles across all initial categories.
2. Compare desktop and portrait/mobile layouts, tune type, paper color, spacing, illustrations, and newspaper density using actual 6–8 paragraph stories.
3. Implement JSON validation, index generation, stable routes, search, and dated batch ingest. Test adding an article to an existing category and to a newly configured category.
4. Run one simulated daily batch twice. Confirm the second run makes no duplicate posts, newest items appear first, old articles still resolve, related links work, and a malformed record blocks publishing.
5. Add the scheduled generation and illustration job after the look and feel and editorial voice are approved. Measure page weight and index size as the archive grows.

The first release is ready when a new daily batch can be added without touching page code; all six categories share the same renderer; article pages have working permanent links; and a reader can reach the oldest post through archive pagination.

## 10. Decisions to settle during the visual prototype

- Final masthead/site title and whether the publication presents itself as a single city newspaper or a federation-wide gazette.
- Whether dates shown to readers use the real posting date, a fictional calendar, or both.
- Final naming for the formal discipline, recovered artifacts, and measurable emissions; these belong in the Field Guide and generation glossary.
- Desired daily story count per category and whether classified notices may routinely have fewer than six paragraphs.
- Hosting target and where the scheduler runs; neither choice needs to change the article format.
