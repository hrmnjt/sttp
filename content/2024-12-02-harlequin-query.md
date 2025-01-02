+++
title = "reading files in style with duckdb and harlequin"
slug = "readdatawithharlequin"
date = 2024-12-02
description = "(extended) swiss army knife to read data"
+++

Earlier, I wrote a small utility to read files with duckdb [^1] and I'm finding
amazing mileage for this small utility. I recently found Harlequin [^2] which
natively works with duckdb on the terminal. Its even better than the CLI in some
cases because it does SQL IDE stuff but in the terminal.

So, I extended earlier utility function [^3] to add a harlequin edit mode.

Now, when I do `just npq DATASET` I get the default duckdb CLI

![duckdb cli](/img/duckdb-query.png)

and when I do `just hqp DATASET` I get Harlequin TUI

![harlequin tui](/img/harlequin-duckdb-query.png)

EOF

---

footnotes

[^1]: [Here](@/2024-10-05-duckdb-query.md) is a shard for that

[^2]: Harlequin is "An easy, fast, and beautiful database client for the
terminal.". [Github](https://github.com/tconbeer/harlequin) repository.

[^3]: Added a commit [48c9b44](https://github.com/hrmnjt/x/commit/48c9b443d374efb096521d926caafd622fe073fb)
to add an `--ui [cli, harlequin]` flag and added 2 more commands to `justfile`
