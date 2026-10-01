+++
title = "readme"
description = "Documentation for this corner of the web."
# Date the original readme page was written, not the redesign's release date.
date = 2026-09-26
lastmod = 2026-09-29
outputs = ["HTML"]
+++

Documentation for this corner of the web. The human remains a work in progress.

## sttp

**Secure thought transfer protocol.** A name for a personal site, not an actual
network protocol. Opinions may be eventually consistent.

- [shards](/shards/) are dated pieces of thinking, useful without the whole dataset.
- [builds](/builds/) are things made or tried, with links to code and the thinking behind it.
- [wal](/wal/) is the write-ahead log: short notes before a longer account takes shape.
- [catalog](/catalog/) interleaves them in one timeline, including this page.

Dates belong to the content, not to the latest Git commit. Build dates record
when their pages were written, not when the projects started. Readme revisions
are dated separately; editing a page doesn't republish it in the catalog.

## how this is made

Hugo turns Markdown into static HTML. Gruvbox supplies the colors; system
monospace supplies the headings, navigation, and lists. Long-form prose uses a
proportional system font. No font downloads or client-side framework.

Small SVG sketches mark the sections; arrows explain the `dev` setup rather
than dress it up. Dashed rules, heading links, and `[return]` footnote links
keep a little of the original site's furniture. The pages remain readable
without JavaScript, with visible keyboard focus and scrollable code and tables.

[Site source](https://github.com/hrmnjt/sttp) · [RSS](/index.xml)

## reuse

The repository contains an [MIT license](https://github.com/hrmnjt/sttp/blob/main/LICENSE).
Its scope across code, writing, and media is still under review. This note does
not replace the existing license or grant new permissions.
