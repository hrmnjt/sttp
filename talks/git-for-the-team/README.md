# Git for the Team

A 90-minute session on Git, Git with Azure DevOps, and Git from Databricks.

- `outline.md`: the session content, timings and sources.
- `slides/`: the same content as a [Slidev](https://sli.dev) deck, with speaker notes.

## Slides

Needs Node 20+.

    cd slides
    npm ci
    npm run dev       # present at http://localhost:3030, presenter view at /presenter
    npm run build     # static HTML in slides/dist/
    npm run export    # PDF; needs playwright-chromium

`slides/dist/` and `node_modules/` are not committed.
