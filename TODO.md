# TODO — sttp review

Backlog from a review of this repository, [hrmnjt.dev](https://hrmnjt.dev/), and the [public GitHub repository](https://github.com/hrmnjt/sttp). These are suggestions, not commitments; keep the site small and personal. The build-in-public ideas can be scoped separately later.

Keep only outstanding ideas here; remove completed work. The redesign can take a better route than the original suggestions.

## Before merging the redesign

- [ ] **Decide and publish licensing terms.** Review the existing MIT `LICENSE` scope against code, site writing, original doodles/photos, and third-party media. Use the checklist in `design/publishing-review.md` to write reviewed terms in `content/readme/_index.md`, document the same scope in the repository, and make the footer consistent. The review checklist is not a license.
- [ ] **Verify privacy practices.** Check actual hosting/CDN logs, analytics, cookies/storage, embedded resources, and contact paths; decide whether a privacy notice is needed. Use `design/publishing-review.md` to write an accurate statement in `content/readme/_index.md` if one is needed. The review checklist is not a privacy policy.
- [ ] **Confirm new content publication dates.** Catalog and RSS use each page's explicit original date. The build/readme dates currently record when their pages were first written on this unpublished branch; confirm their actual first-publication dates before release, without borrowing project/write-up dates or moving historical shards.
- [ ] **Review homepage identity copy.** Rewrite `content/_index.md` in your own voice before merging; its current text is a starting point, not a verified biography.

- [ ] **Review the dev build’s content and context.** Rewrite `content/builds/dev.md` in your own voice; its current setup-focused account needs a deeper editorial pass.

## Make the site and repository easier to understand

- [ ] **Review old public details before promoting the site more broadly.** The phone number and old email address are redacted. Older posts still reference `hrmn.in`. Decide what is intentionally still public, update/remove stale contact paths as appropriate, and leave historical context where it matters.

## Polish after the essentials

- [ ] **Finish post sharing metadata.** HTML, Open Graph, and Twitter metadata already prefer explicit descriptions. JSON-LD now uses the same description. Add useful descriptions to newer posts that lack them and verify representative previews.
- [ ] **Check real-device media and layout.** Normal/draft Chromium captures and 320–1440px layout checks pass. Verify system-font rendering, long titles, links, code, and media in Safari and on a real phone.

### Visual direction: readable, accessible, still nerdy

- [ ] **Complete accessibility QA on Mac/phone.** Chromium skip-link focus and keyboard code scrolling pass, along with narrow-width and 200%-equivalent reflow checks. Still verify full keyboard order, actual browser zoom, touch targets, link states, and screen-reader announcements on Safari/real hardware.
- [ ] **Try Gruvbox dark hard as a small visual experiment, not a wholesale redesign.** Compare `#1d2021` against the current `#282828` background on real posts in daylight and at night; if adopted, change the code-block/blockquote surfaces so they remain distinguishable and sync `theme-color`. Check contrast and reading comfort at normal text sizes.
- [ ] **Prototype sidenotes / marginalia for longer posts.** Use [Tufte CSS](https://edwardtufte.github.io/tufte-css/) as a design reference, not a wholesale dependency: put short annotations or footnotes in the outer margin on wide screens (left or right); keep them inline or as linked endnotes on narrow screens and in a logical reading order for screen readers. Use comfortably sized system text (e.g. ~0.875rem, not tiny), keyboard-friendly reference/back links, and avoid collisions with images and code.
- [ ] **Offer a site-hosted Markdown view for each post.** Shards already link to their Markdown source and history on GitHub; a standalone export remains optional. Inspired by [Armin's post](https://lucumr.pocoo.org/2026/9/12/pdoom/): serve usable Markdown at a stable URL and link `View Markdown` in HTML; optionally add `Copy as Markdown` with a small progressive-enhancement script. Check how Hugo shortcodes and internal links appear in the exported text, and reconcile any script with the site's CSP (`script-src 'none'` is currently declared in `static/_headers`).

## Chosen site experiments

- [ ] **Publish a personal AI-and-writing note.** Inspired by [Derek Sivers' AI use note](https://sive.rs/ai) and [Niklas Gruhn's “Don't be a meat proxy”](https://gruhn.me/blog/2026-08-03/): state in your own words what AI may help with (e.g. research, critique, proofreading, coding), what it should not write as you, and your commitment to read, verify, and take responsibility for anything published. Review the existing “Using LLMs as editors” section in `content/shards/2026-02-08-rfd.md` for consistency. Date the policy and update it if your practice changes; avoid claiming to know the provenance of older posts you cannot verify.
- [ ] **Audit old writing by provenance, not an AI-detector verdict.** If curious about which posts used AI, first check drafts, Git history, and your own recollection; optionally try a detector such as Pangram on public prose as an experiment, but do not use a score to label posts definitively. Check privacy terms before submitting any unpublished writing to a third party.
- [ ] **Support dated updates on old posts.** Add an explicit `Updated YYYY-MM-DD` note when an opinion, instruction, or project changes; preserve the original publication date and distinguish substantive editorial updates from Git commit timestamps or typo fixes. Show the updated date when useful in post metadata and RSS; keep a short change note when the meaning has shifted.
- [ ] **Try a small evergreen-notes lane without a content quota.** Take inspiration from [Maggie Appleton's digital garden](https://maggieappleton.com/garden) but start by improving one existing technical post into a living reference (e.g. Git workflow or `dev`). Keep time-bound accounts such as dated goals and historical events as shards; give living pages stable URLs, `first published`/`last substantively updated` dates, and links back to related shards or projects. Avoid inventing a taxonomy or publishing schedule before the content calls for it.
- [ ] **Add a random shard link.** Make discovering an older post playful; decide whether a tiny client-side pick from a generated list is worthwhile, and keep the archive usable without JavaScript.
- [ ] **Publish a site changes log.** Occasionally explain meaningful changes to the site's design, tooling, and publishing workflow, including experiments that didn't stick. No obligation to document every CSS edit.
- [ ] **Explore a personal profile and `Work with me` page.** Inspired by [Ally Piechowski's homepage](https://piechowski.io/) and [work-with-me page](https://piechowski.io/work-with-me/): describe in your own voice what problems you help with, who you work well with, how you work, evidence from real projects, and a clear contact route. First decide if this is an actual paid-service offer or an invitation to collaborate; keep the site's writing front and center rather than copying a consulting landing page.

## Site extensions — sub-sites on hrmnjt.dev

These are starting ideas from the personal backlog, not commitments to a framework or hosting setup. Decide URL structure when each project has a working prototype: a path such as `/learn/` is enough for static content; a subdomain is useful when an app needs its own deployment. Link both from the main site.

- [ ] **Principles for learn-at-work sessions.** Write down the teaching approach and prototype a navigable, connected learning map: a roadmap.sh-like sequence of topics with [Up's feature tree](https://up.com.au/tree/) as an interaction reference. Each node should open a real lesson and point to sensible next steps; ship a keyboard-accessible, mobile-friendly linear outline alongside any canvas.
  - [ ] **First course: Git.** Build one small learn-at-work Git course to test the format; use [ThePrimeagen's Git course](https://theprimeagen.github.io/fem-git/lessons/intro/intro) for inspiration, not as content to copy. Define the audience, lesson sequence, and hands-on exercises before building a general course platform.
- [ ] **Principles for building in open.** Write down what can be shared, how work-in-progress and decisions are published, and how projects link back to experiments and shards.
  - [ ] **Excel ingestion tool.** Consider a public, generic prototype and write-up only after checking employer IP/confidentiality boundaries; use synthetic data and keep work-specific code, datasets, and details private.
  - [ ] **Fizzy-like Kanban tool for Databricks.** Scope a tiny personal prototype around the actual Databricks workflow you want to improve; document the pain point and build the smallest useful board before expanding it. Avoid reproducing private workplace workflows or data.

## Build in public — leave scope open

- [ ] **Choose a lightweight public workflow for experiments.** Decide what belongs here versus in a project repo such as `dev` (work-in-progress notes, decisions/RFDs, lessons learned, or finished shards); make it easy to link an experiment to its write-up without turning writing into an obligation. Add specific ideas to this backlog when ready.
- [ ] **Revisit Astro when interactive demos and UI components become a substantial part of the site.** Prototype one real demo first; compare the authoring and deployment experience with Hugo plus small, standalone JavaScript components before committing to a migration. Do not migrate just to prepare for hypothetical interactivity.
- [ ] **Revisit self-hosting when there is a concrete subdomain or service to run.** Try a small deployment with Caddy before moving the main site; decide separately whether to keep Cloudflare for DNS/proxying or replace it entirely. Account for TLS, updates, monitoring, backups, and recovery.
- [ ] **Experiment with a layered personal introduction.** Inspired by [Derek Sivers' home](https://sive.rs/) and [About](https://sive.rs/about): try a short `me in 10 seconds` homepage blurb, a more candid long-form About, and optionally a dated `/now` page. Say what is yours to share; don't let it become a mandatory update schedule.
- [ ] **Decide what the `hrmnjt` persona communicates and keeps private.** [Sivers' piece on personas](https://sive.rs/anon) is a prompt to make a public identity understandable without publishing everything. Write a plain-language boundary for work/family/location/contact, review older posts for unintended disclosure, and avoid invented biographical details or a false claim of anonymity.
