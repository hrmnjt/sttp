# Preview the sample pages

## Homepage edits

Write your own introduction in `content/_index.md`; `layouts/index.html` controls
its placement, previews, and labels. The current copy is a starting point, not
a verified biography. The portrait in `assets/images/profile-dither.png` was
made from the public GitHub avatar at
`https://avatars.githubusercontent.com/u/10371494?v=4` using
`design/dither-avatar.py`. Only the derivative is stored here. Confirm that
you have permission to republish the original photo before merging, or supply
a different portrait. Do not rely on GitHub profile visibility as a photo
license.

The homepage lists WAL dates and titles only; `/wal/` shows a short excerpt
from the beginning of each entry. Replace the draft examples with real dated
updates; no WAL status is repeated in the intro.


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
