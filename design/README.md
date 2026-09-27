# Preview the sample pages

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
New pages will appear in their section and the catalog; homepage counts and previews update automatically.
