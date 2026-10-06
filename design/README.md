# sttp design preview

## Direction

One main content flow, system monospace throughout, Gruvbox, and a few purposeful
sketches. Every page shares a 1100px outer frame (988px inside desktop
padding), keeping the header and footer stationary between routes. The homepage,
shards/builds/WAL indexes, and catalog use that full layout area. Individual shards,
builds, and WAL entries share the homepage's left rail: paragraphs, lists, and blockquotes
stay at 70ch, while titles, code, images, tables, and the dev diagram can use the
full frame. WAL's listing header and timeline share that full frame, with entry
prose capped at 70ch. Only readme retains a centred 70ch column.
Individual shards, builds, and WAL entries include a consistent back-to-section link.
Their page titles echo the listing underline with a single 1px muted rule across
that frame. No extra sketch or repeated subheading rules: the article stays quiet.
Phones use tighter spacing between
lists and archive links, while retaining breathing room between sections.
Footer navigation keeps 44px targets; inline legal links keep 24px targets
without the oversized line gaps. No font downloads, client-side framework, or
animated decoration. Keep the software/database vocabulary without building
a fake terminal.

- Home previews the three most recent shards, compact builds, and populated WAL entries.
  The intro keeps a 70ch reading measure. Subtle 120px section sketches share
  a right-hand alignment rail and sit behind content in an isolated stacking
  context; list marks hang slightly below their headings. The build mark is
  centred on its heading band so cards retain a regular grid. Text is kept
  clear of the marks, and card surfaces remain opaque. Phones retain compact
  64px marks. A desktop-only 96px notch in the top card border below the builds
  sketch is a reversible visual experiment; cards retain their full borders on
  phones. Heading links extend their underline toward the sketch, leaving
  a 16px gap; hover and focus affordances remain on the real link. The introduction
  title scales from 24–28px; section headings from about 21–24px, without increasing
  article subheadings or the site brand.
- Builds use repo-style cards on home and their section index: a linked name,
  independent `[code]` link when available, and description. Cards are capped at two columns
  on desktop, one at widths up to 640px. Home and the section index share the
  regular grid and let a lone card fill the width. No fake repository stats.
  Shards and WAL keep their row/log layouts.
- Shards/builds/WAL/catalog indexes use 136px sketches alongside grouped titles and
  introductions, kept in normal flow with clearance before the lists/cards.
  Their title underline extends toward the sketch with the same 16px gap as home.
  On phones, 72px marks sit beside titles and introductions span the full width.
  Catalog uses a hand-drawn stack of index cards. Homepage sketch placement is unchanged.
- Section indexes are the full lists. `/wal/` shows short entries in full,
  with individual permalinks retained; inline heading/footnote IDs are namespaced.
- `/readme/` is one document, linked in the footer, not another homepage lane.
- `/catalog/` is one interleaved newest-first timeline, not a grouped directory.
  Visible `[shard]`, `[build]`, `[wal]`, and `[readme]` labels identify the type;
  green, muted blue, amber, and neutral text help scanning without relying on color.
  Shard/build/WAL rows include 24px versions of the section sketches beside their
  labels, decorative and non-interactive. Readme keeps its neutral text label.
  The type column reserves icon space; phone titles still span the full row.
  Rows share shards' unruled spacing, not notebook separators. Icons are positioned
  independently of label text so dates, tags, and first title lines share a baseline.
- Article images reserve their original dimensions to avoid layout jumps and
  link to full-resolution originals with accessible labels and keyboard focus.
  A small self-hosted script enhances these links with a native `<dialog>` viewer,
  loaded only on pages containing optimized images (including inline WAL entries).
  Escape, close, or backdrop clicks return to the same article position and image
  link focus. `[1:1]` toggles scrollable original pixels for small screenshots.
  Links still open originals without JavaScript or native dialog support; modified
  clicks retain normal browser behavior. CSP permits same-origin scripts only,
  with no inline executable script, library, analytics, or external dependency.

## Dates and publication

Every content page needs its own explicit `date` and `title`. Builds use the
date their page was written, **not** a repository commit, project launch date,
or linked shard's publication date. Current build/readme dates are their
known first-authored dates on this unpublished branch; review them against
actual publication before release. `lastmod` records substantive edits but
never moves an entry up the catalog. Readme participates once, using its own
original date. Home and directory scaffolding do not appear as timeline entries.

The main and catalog RSS feeds use the same content order as the catalog;
section feeds remain section-specific. Feed links use the production base URL.

## Preview

```sh
hugo server
hugo server --buildDrafts
```

The four WAL samples and two lorem-ipsum builds (`/builds/lorem-ipsum/` and
`/builds/dolor-sit-amet/`) are `draft = true`. The builds offer short and longer
copy for comparing the homepage, section index, and individual layouts.
A normal build excludes these samples from the
homepage, catalog, RSS, and individual routes. Never deploy with `--buildDrafts`.
Replace samples with real entries before publishing. The homepage hides WAL
entirely until it has content; `/wal/` still has an honest empty state.

Licensing/privacy review checklists live in `design/publishing-review.md`.
They are not site content or policies. About/AI placeholders have been removed;
write reviewed personal text or practices into the readme when ready.

## Connections

Shards and builds use optional lists of internal content paths:

```toml
related_shards = ["/shards/2026-02-01-dev", "/shards/2026-03-06-ivanti-osascript"]
related_builds = ["/builds/dev"]
```

Connections combine declared references and incoming backlinks. A build collects
all shards that name it in `related_builds`; it needs no primary write-up or
manually maintained list. Shard↔shard and build↔build references also appear on
both ends. Canonical URLs deduplicate repeated/reciprocal references. Two groups,
“related shards” and “related builds”, show original publication dates newest
first, independent of `lastmod`; empty groups and sections stay hidden. Drafts
only contribute in draft previews. All fields are lists, even for one reference.
Missing targets, wrong content types, self-links, scalar values, and the old
`writeup`/`related`/`related_build` fields fail the build. Authored inline links
remain independent of this metadata graph.

Heading permalinks, Markdown source, and Git history remain available without
JavaScript. The latter two point to `main`, so new source pages need to be
merged before those links are live.

## Checks

```sh
hugo --panicOnWarning --printPathWarnings
python3 -m unittest discover -s tests
```

Tests exercise catalog ordering/type labels, feed parity, dates, draft
exclusion, WAL anchor namespacing, metadata, presentation markup, and local links.
Code fences have language/scroll captions, keyboard focus, and class-based Gruvbox
highlighting so their background follows the site CSS. Browser checks
at phone/desktop widths, keyboard/zoom checks, and actual deployment headers
still need to be checked against the release preview.

## Browser captures

Run `npm run screenshots` for normal content or
`npm run screenshots -- --drafts` for design samples. Setup and exact capture
routes are documented in [screenshots.md](screenshots.md). The report identifies
page overflow and failed browser requests; screenshots still need human/agent
visual review. This does not replace keyboard, zoom, or deployment checks.
