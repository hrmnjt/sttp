# Screenshot feedback loop

Playwright is development tooling, not a dependency of the published site.
The runner captures real Chromium pages so the images can be reviewed by a
human or shared with the coding session. It does not judge visual quality or
maintain pixel-diff baselines.

## Setup on your Mac

Use Node 20+ and Hugo Extended (0.166.0 is pinned in CI):

```sh
npm ci
npx playwright install chromium
npm run screenshots
```

On supported Ubuntu, `npx playwright install --with-deps chromium` also installs
system libraries. Playwright's bundled browsers do **not** support Alpine,
including the current coding VM. Run captures on the Mac or a supported Linux
host; don't expect installing the npm package alone to provide a browser.

An already-installed compatible Chromium can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium`. The runner
still launches its own disposable profile; it never attaches to your everyday
browser or uses its cookies.

## Commands and outputs

```sh
npm run screenshots                         # normal content, no drafts
npm run screenshots -- --drafts            # include design samples
npm run screenshots -- --port 1320         # if the default 1314 is occupied
npm run screenshots -- --out /tmp/captures  # alternate output root
npm run screenshots -- --help
npm run test:screenshots                    # no browser required
```

Normal and draft captures are separate:

```text
.artifacts/screenshots/normal/
  home-desktop.png
  home-phone.png
  build-dev-phone.png
  shard-rfd-desktop-code.png
  ...
  report.md
  report.json
  server.log
.artifacts/screenshots/drafts/
  ...
```

Every run replaces only the runner's named files for that mode. Unrelated
files and the other mode are untouched. Reports list only successfully
captured images, so a failed run cannot quietly show stale screenshots.
Artifacts and `node_modules/` are gitignored. PNGs are not added to `public/`.

Read `report.md` in a Markdown viewer and inspect the relevant PNGs. Share
captures with the coding session (or put them in the checkout accessible to
that session), make a small design change, and re-run. A JSON report provides
machine-readable issues and measurements; it isn't evidence of visual approval.

## What gets captured

Two Chromium viewports, with device scale 1:

- Desktop: 1440 × 1000.
- Phone: 390 × 844, with touch/mobile emulation. This is not a Safari/iOS test.

Each run produces 24 images when successful:

| Route | Captures per viewport |
| --- | --- |
| `/` | Full page |
| `/catalog/` | Full page |
| `/shards/` | Full page |
| `/builds/` | Full page |
| `/builds/dev/` | Full page |
| `/wal/` | Full page |
| `/readme/` | Full page |
| `/2026/02/08/rfd/` | Top, first highlighted code block and caption, end/source links |
| `/2024/12/02/readdatawithharlequin/` | Top, first image |

Article regions are **viewport captures at the selected region**, keeping
surrounding context rather than producing enormous full-page article images.
Adjust `ROUTES` and `VIEWPORTS` in `scripts/screenshots.mjs` as content evolves.
Missing expected regions are reported rather than silently skipped.

## Image modal checks and captures

The optional viewer checks use their own loopback Hugo server on port 1321 and
exercise the **actual CSP** from `static/_headers` (Hugo doesn't serve those
headers automatically). They cover 320/390/768/1440px layouts, keyboard and touch
opening, fit/actual-size viewing, forward/reverse focus cycling, scroll restoration,
Escape/button/backdrop dismissal, load errors, modified clicks, and no-JS/no-dialog
fallbacks. No framework or browser tooling ships with the published site.

```sh
npm run test:images
npx playwright install webkit
IMAGE_TEST_BROWSER=webkit npm run test:images
IMAGE_VIEWER_SCREENSHOTS=.artifacts/screenshots/image-viewer npm run test:images
```

`IMAGE_TEST_PORT` selects another unused port. Chromium honors the same
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override as the capture runner. Optional
captures are `image-modal-{chromium,webkit}-{390,1440}.png`; without the output
variable, tests don't write captures. WebKit checks aren't a substitute for
Safari/VoiceOver or a physical phone review.

For project-local browser installs (without writing a global browser cache):

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/playwright-browsers" npx playwright install chromium webkit
PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/playwright-browsers" npm run test:images
```

## Stability and diagnostics

- Fixed locale (`en-US`), timezone (`UTC`), dark color scheme, and reduced motion.
- Fresh browser context per viewport and a new page per route.
- Wait for network idle, fonts, and decoded images; load lazy images for captures.
- Disable animations and hide the caret in screenshots.
- Record Chromium version, Node version, host platform, and capture settings.
- Report console errors, uncaught page errors, failed requests, HTTP errors,
  undecodable images, and horizontal **page** overflow. Scrolling code/tables
  within their own containers is not page overflow.

The runner exits nonzero on issues, but keeps successful screenshots for
inspection. Browser/Hugo startup failures produce failure reports, not fake
captures. Both JSON and Markdown reports include the error; Hugo output is
saved in `server.log`.

System fonts and rendering vary across operating systems. Keep the same host
and pinned Playwright version for useful comparisons; these settings don't
promise pixel-identical output between macOS and Linux.

## Server lifecycle and isolation

The runner starts a loopback-only Hugo server on a dedicated port and refuses
to reuse an occupied port. It disables live reload and file watching, uses
temporary build/cache/resource directories, and doesn't overwrite `public/`.
It stops its own browser/server and removes temporary Hugo outputs after a
run, including failed or interrupted runs. `HUGO_BIN` can select a Hugo binary.
Hard kills or host crashes cannot be handled by an application cleanup hook.

CI runs runner logic tests and a Hugo startup/shutdown smoke test, **not browser
captures**. Browser screenshots, keyboard navigation, zoom, accessibility,
and deployed headers remain separate checks. No screenshots or npm tooling
are shipped to Cloudflare Pages.
