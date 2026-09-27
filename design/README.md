# Preview the sample pages

## Homepage edits

Write your own introduction in `content/_index.md`; `layouts/index.html` controls
its placement, previews, and labels. The current copy is a starting point, not
a verified biography. The introduction is intentionally text-only.

The homepage lists three WAL dates and titles, followed by a dotted
`+N older updates` link when more exist; `/wal/` shows a short excerpt from
each entry. The fourth draft WAL sample exists only to preview that link.
Replace all draft examples with real dated updates; no WAL status is repeated
in the intro.

Readme pages use a curated `label` and `weight` for their manual-like order.
Set an explicit `lastmod` date whenever a readme page changes; the date appears
on the homepage preview, `/readme/`, and the page itself. The draft dates mark
edits to placeholder pages, not approval of their contents.


`/wal/` and `/readme/` are published sections with honest empty states. The
sample entries under `content/wal/` and `content/readme/` are design-only and
all have `draft = true`, so a normal `hugo` build does not publish them. The
licensing and privacy drafts are review checklists, not published policies.

To see the section pages populated locally, run from the repository root:

```sh
hugo server --buildDrafts
```

Do not deploy with `--buildDrafts`. Replace the sample text with reviewed,
real content and remove `draft = true` from each page you want to publish.
New pages will appear in their section and the catalog; homepage counts and previews update automatically. The homepage's dated “latest wal” line stays absent until a WAL entry is published; the sample line appears only with `--buildDrafts`.

## Connections and direct links

On a shard, `related_build = "/builds/dev"` links to a build and
`related = "/shards/2026-02-01-dev"` links to another shard. The shard it
points to then shows a “linked from” backlink. These are curated connections,
not a scan of every link in post text. Markdown headings also get a visible `#`
permalink automatically, so a build's decision trail can link directly to the
relevant explanation.
