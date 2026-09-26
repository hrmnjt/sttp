+++
title = "dev"
description = "My Mac setup, dotfiles, and bootstrap workflow."
doodle = "laptop"
aliases = ["/work/dev/"]
writeup = "/shards/2026-02-01-dev"
related = "/shards/2026-03-06-ivanti-osascript"
+++

A personal setup built around `brew bundle` for packages, `just` for tasks, and
`stow` for dotfiles. The write-up explains those choices; the
[repository](https://github.com/hrmnjt/dev) holds the configuration.

## selected changes

This is a short, manually selected timeline, not a live mirror of the repo.
Dates and details come from its [changelog](https://github.com/hrmnjt/dev/#changelog);
see that page or Git history for the complete record.

- **2025-04** — First recorded commit and the start of the bootstrap work,
  according to the repository changelog. This is not necessarily the date it
  became public.
- **2026-02-02** — [1.0.0](https://github.com/hrmnjt/dev/tree/1.0.0) marked
  the baseline Mac setup: Brewfile, shell, editor, terminal, window management,
  and early Pi experiments. The write-up was published the day before.
- **2026-05-01** — Added the minimal Pi coding-agent setup with a Gondolin
  backend, then iterated on it over the following weeks.
- **2026-07-21–22** — Built a Herdr worktree workflow and reorganized the
  repository's setup documentation.
- **2026-09-21** — Added non-mutating repository and host diagnostics with a
  check-only mode and regression tests for Git identity selection.
