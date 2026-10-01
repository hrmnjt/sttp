# sttp design preview

## Direction

One column, monospace-led interface, proportional long-form prose, Gruvbox,
and a few purposeful sketches. No font downloads, JavaScript controls, or
animated decoration. Keep the software/database vocabulary without building
a fake terminal.

- Home previews recent shards, compact builds, and populated WAL entries.
- Section indexes are the full lists. `/wal/` shows short entries in full,
  with individual permalinks retained; inline heading/footnote IDs are namespaced.
- `/readme/` is one document, linked in the footer, not another homepage lane.
- `/catalog/` is one interleaved newest-first timeline, not a grouped directory.
  Visible `[shard]`, `[build]`, `[wal]`, and `[readme]` labels identify the type.

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

All four WAL samples are `draft = true`. A normal build excludes them from the
homepage, catalog, RSS, and individual routes. Never deploy with `--buildDrafts`.
Replace samples with real entries before publishing. The homepage hides WAL
entirely until it has content; `/wal/` still has an honest empty state.

Licensing/privacy review checklists live in `design/publishing-review.md`.
They are not site content or policies. About/AI placeholders have been removed;
write reviewed personal text or practices into the readme when ready.

## Connections

On a shard, `related_build = "/builds/dev"` links to a build and
`related = "/shards/2026-02-01-dev"` links to another shard. The destination
shows a “linked from” backlink. Builds have their own `source` URL and optional
`writeup`/`related` page references. Unresolved references fail the build.
Heading permalinks, Markdown source, and Git history remain available without
JavaScript. The latter two point to `main`, so new source pages need to be
merged before those links are live.

## Checks

```sh
hugo --panicOnWarning --printPathWarnings
python3 -m unittest discover -s tests
```

Tests exercise catalog ordering/type labels, feed parity, dates, draft
exclusion, WAL anchor namespacing, metadata, and local links. Browser checks
at phone/desktop widths, keyboard/zoom checks, and actual deployment headers
still need to be checked against the release preview.

## Browser captures

Run `npm run screenshots` for normal content or
`npm run screenshots -- --drafts` for design samples. Setup and exact capture
routes are documented in [screenshots.md](screenshots.md). The report identifies
page overflow and failed browser requests; screenshots still need human/agent
visual review. This does not replace keyboard, zoom, or deployment checks.
