import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {
  assertPortFree, captureRoute, findings, groupFindings, measureOverflow, measurePage, measureRoute,
  optionsFromArgs, remarks, ROUTES, runScreenshots, screenshotName, sitemapPaths, startPreview, treeName, VIEWPORTS,
} from '../scripts/screenshots.mjs';

async function temporary(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sttp-runner-tests-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function listeningServer(t) {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server;
}

// What measurePage() returns for a page with nothing wrong.
function measurement(overrides = {}) {
  return {
    title: 'fixture', lang: 'en', height: 1200,
    headings: [{ level: 1, text: 'fixture' }, { level: 2, text: 'part' }],
    landmarks: [{ kind: 'main', label: '' }],
    tabStops: ['Skip to main content', 'hrmnjt.dev'],
    duplicateIds: [], deadFragments: [], smallTargets: [], withoutAlt: [],
    contrast: [{ ratio: 7.14, required: 4.5, colour: '#b8bb26', background: '#282828', size: 16, bold: false, sample: 'a link', where: 'a' }],
    margin: { items: [], overlaps: [], pushed: [] },
    notes: { margin: 0, end: 0, sidenotes: 0 },
    ...overrides,
  };
}

function fakeBrowser({ overflow = 0, errors = false, missingRegion = false, measured = measurement(), tree = '- main' } = {}) {
  const state = { contexts: [], screenshots: [], closedPages: 0, closedContexts: 0, closedBrowser: 0 };
  const browser = {
    version: () => 'unit-test-browser',
    close: async () => { state.closedBrowser++; },
    newContext: async settings => {
      state.contexts.push(settings);
      return {
        close: async () => { state.closedContexts++; },
        newPage: async () => {
          const handlers = new Map();
          return {
            setDefaultTimeout() {},
            on: (event, handler) => handlers.set(event, handler),
            goto: async url => {
              if (errors) {
                handlers.get('console')({ type: () => 'error', text: () => 'Console fixture error' });
                handlers.get('pageerror')(new Error('Script fixture error'));
                handlers.get('requestfailed')({ url: () => url + 'missing.png', failure: () => ({ errorText: 'failed' }) });
                handlers.get('response')({ status: () => 404, url: () => url + 'missing.png' });
              }
              return { status: () => 200 };
            },
            evaluate: async fn => fn === measureOverflow
              ? { pixels: overflow, viewportWidth: 390, documentWidth: 390 + overflow, offenders: [] }
              : fn === measurePage ? measured : [],
            locator: () => ({
              ariaSnapshot: async () => { if (tree === null) throw new Error('No tree fixture'); return tree; },
              first: () => ({ count: async () => missingRegion ? 0 : 1, evaluate: async () => {} }),
            }),
            screenshot: async options => {
              state.screenshots.push(options);
              // No fake screenshots in the checkout: these placeholders exist only in a test temp dir.
              await writeFile(options.path, 'unit-test-placeholder');
            },
            close: async () => { state.closedPages++; },
          };
        },
      };
    },
  };
  return { browser, state };
}

const routes = [{ name: 'fixture', route: '/', shots: [{ name: '', fullPage: true }, { name: 'code', selector: '.highlight' }] }];
const listPages = async () => ['/', '/catalog/'];

function fakeServer(state) {
  return async options => {
    state.started = options;
    return { baseURL: 'http://127.0.0.1:1314/', log: 'Unit test Hugo log', stop: async () => { state.stopped = true; } };
  };
}

test('CLI defaults, draft opt-in, and strict option validation', () => {
  const defaults = optionsFromArgs([]);
  assert.equal(defaults.drafts, false);
  assert.equal(defaults.port, 1314);
  assert.equal(defaults.textOnly, false);
  assert.equal(optionsFromArgs(['--text-only']).textOnly, true);
  assert.equal(optionsFromArgs(['--drafts', '--port=1320']).drafts, true);
  assert.equal(optionsFromArgs(['--port', '1320']).port, 1320);
  assert.equal(optionsFromArgs(['--help']).help, true);
  for (const port of ['0', '-1', '65536', '1314.5', 'bad']) {
    assert.throws(() => optionsFromArgs([`--port=${port}`]), /--port must/);
  }
  assert.throws(() => optionsFromArgs(['--out=']), /directory/);
  assert.throws(() => optionsFromArgs(['--unknown']));
});

test('capture filenames are unique and article captures stay viewport-sized', () => {
  const names = ROUTES.flatMap(route => VIEWPORTS.flatMap(viewport =>
    route.shots.map(shot => screenshotName(route, viewport, shot))));
  assert.equal(names.length, 24);
  assert.equal(names.length, new Set(names).size);
  assert.ok(names.includes('home-desktop.png'));
  assert.ok(names.includes('build-dev-phone.png'));
  const trees = ROUTES.flatMap(route => VIEWPORTS.map(viewport => treeName(route, viewport)));
  assert.equal(trees.length, 18);
  assert.ok(trees.includes('home-desktop.aria.yml'));
  assert.equal(new Set([...names, ...trees]).size, 42);
  for (const route of ROUTES.filter(route => route.name.startsWith('shard-'))) {
    assert.ok(route.shots.every(shot => !shot.fullPage));
  }
});

test('occupied ports are rejected without reusing or stopping the existing server', async t => {
  const server = await listeningServer(t);
  await assert.rejects(assertPortFree(server.address().port), /existing servers are never reused/);
  assert.equal(server.listening, true);
});

test('normal and draft runs isolate outputs, keep unrelated files, and clean up resources', async t => {
  const out = await temporary(t);
  const first = fakeBrowser();
  const server = {};
  const report = await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: fakeServer(server), launchBrowser: async () => first.browser, routes, listPages, log() {},
  });
  assert.equal(report.passed, true);
  assert.equal(server.started.drafts, false);
  assert.equal(server.stopped, true);
  // One captured route and two measured pages, at each of two sizes.
  assert.equal(first.state.closedPages, 6);
  assert.deepEqual(report.pages.map(page => `${page.route} ${page.viewport}`),
    ['/ desktop', '/catalog/ desktop', '/ phone', '/catalog/ phone']);
  assert.ok(report.pages.every(page => page.status === 200 && page.measured.tabStops.length === 2));
  assert.deepEqual([report.findings, report.remarks, report.notes], [[], [], []]);
  assert.equal(await readFile(path.join(out, 'normal/fixture-desktop.aria.yml'), 'utf8'), '- main\n');
  const text = await readFile(path.join(out, 'normal/report.md'), 'utf8');
  assert.match(text, /## Findings\n\nNone on 2 page\(s\) at 2 size\(s\)\./);
  assert.match(text, /\| \/catalog\/ \| phone \| 0px \| 7\.14:1 \| 2 \| 2 \| 0 \/ 0 \|  \|/);
  assert.match(text, /- outline: h1 fixture > h2 part\n- tab order: Skip to main content > hrmnjt\.dev\n- accessibility tree: \[fixture-phone\.aria\.yml\]/);
  assert.equal(first.state.closedContexts, 2);
  assert.equal(first.state.closedBrowser, 1);
  assert.deepEqual(first.state.contexts.map(context => context.viewport), [
    { width: 1440, height: 1000 }, { width: 390, height: 844 },
  ]);
  assert.ok(first.state.contexts.every(context => context.deviceScaleFactor === 1 &&
    context.reducedMotion === 'reduce' && context.timezoneId === 'UTC'));
  assert.ok(first.state.screenshots.every(shot => shot.animations === 'disabled' && shot.caret === 'hide'));
  await writeFile(path.join(out, 'normal', 'unrelated.txt'), 'keep');
  const second = fakeBrowser();
  await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: fakeServer({}), launchBrowser: async () => second.browser, routes, listPages, log() {},
  });
  assert.equal(await readFile(path.join(out, 'normal', 'unrelated.txt'), 'utf8'), 'keep');
  const draftServer = {};
  await runScreenshots({ out, port: 1314, drafts: true }, {
    startServer: fakeServer(draftServer), launchBrowser: async () => fakeBrowser().browser, routes, listPages, log() {},
  });
  assert.equal(draftServer.started.drafts, true);
  assert.ok((await readdir(out)).includes('drafts'));
  assert.equal(JSON.parse(await readFile(path.join(out, 'normal/report.json'), 'utf8')).mode, 'normal');
  assert.equal(JSON.parse(await readFile(path.join(out, 'drafts/report.json'), 'utf8')).mode, 'drafts');
});

test('overflow and browser/request failures are reported but screenshots still get captured', async t => {
  const output = await temporary(t);
  const { browser } = fakeBrowser({ overflow: 40, errors: true });
  const context = await browser.newContext({});
  const capture = await captureRoute(context, routes[0], VIEWPORTS[0], 'http://127.0.0.1:1314/', output);
  assert.equal(capture.screenshots.length, 2);
  for (const kind of ['overflow', 'console', 'pageerror', 'requestfailed', 'http']) {
    assert.ok(capture.issues.some(issue => issue.type === kind), kind);
  }
});

test('missing regions fail explicitly, rather than silently omitting expected screenshots', async t => {
  const output = await temporary(t);
  const { browser, state } = fakeBrowser({ missingRegion: true });
  const context = await browser.newContext({});
  const capture = await captureRoute(context, routes[0], VIEWPORTS[0], 'http://127.0.0.1:1314/', output);
  assert.equal(capture.screenshots.length, 1);
  assert.ok(capture.issues.some(issue => issue.message.includes('Missing capture region')));
  assert.equal(state.closedPages, 1);
});

test('browser-launch failures produce an honest failure report and stop Hugo', async t => {
  const out = await temporary(t);
  const server = {};
  const report = await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: fakeServer(server), launchBrowser: async () => { throw new Error('No browser installed'); },
    routes, log() {},
  });
  assert.equal(report.passed, false);
  assert.equal(report.fatal, 'No browser installed');
  assert.equal(server.stopped, true);
  assert.deepEqual([report.captures, report.pages], [[], []]);
  const text = await readFile(path.join(out, 'normal/report.md'), 'utf8');
  assert.match(text, /No browser installed/);
  assert.doesNotMatch(text, /## Findings/); // Nothing was measured, so nothing is claimed.
  assert.ok(!(await readdir(path.join(out, 'normal'))).some(name => name.endsWith('.png')));
});

test('an interrupted run does not start new processes', async t => {
  const out = await temporary(t);
  const controller = new AbortController();
  controller.abort(new Error('Interrupted fixture'));
  let started = false;
  const report = await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: async () => { started = true; }, routes, signal: controller.signal, log() {},
  });
  assert.equal(started, false);
  assert.equal(report.passed, false);
  assert.match(report.fatal, /Interrupted fixture/);
});

test('fixed rules turn measurements into findings', () => {
  assert.deepEqual(findings(measurement()), []);
  const types = measured => findings(measured).map(finding => finding.type);
  const low = { ratio: 4.47, required: 4.5, colour: '#928374', background: '#1d2021', size: 14, bold: false, sample: '<!-- note -->', where: 'span.cm' };
  assert.deepEqual(findings(measurement({ contrast: [low, measurement().contrast[0]] })), [{ type: 'contrast',
    message: '4.47:1 for #928374 on #1d2021 at 14px; needs 4.5:1 ("<!-- note -->" in span.cm)' }]);
  // Large text has a lower bar, and the bar is the measurement's own.
  assert.deepEqual(types(measurement({ contrast: [{ ...low, ratio: 3.2, required: 3, size: 28 }] })), []);
  assert.deepEqual(findings(measurement({ headings: [{ level: 2, text: 'part' }] })), [{ type: 'heading', message: 'expected one h1, found 0' }]);
  assert.deepEqual(types(measurement({ headings: [{ level: 1, text: 'a' }, { level: 1, text: 'b' }] })), ['heading']);
  assert.deepEqual(findings(measurement({ headings: [{ level: 1, text: 'title' }, { level: 3, text: 'deep' }, { level: 2, text: 'back up' }] })),
    [{ type: 'heading', message: '"deep" (h3) follows "title" (h1), skipping a level' }]);
  assert.deepEqual(types(measurement({
    duplicateIds: ['summary'], deadFragments: ['#fn:1'], withoutAlt: ['/images/x.png'],
    smallTargets: [{ name: 'x', where: 'a.close', width: 16, height: 16 }],
    margin: { items: [], overlaps: [['on this page', 'footnote 1']], pushed: [] },
  })), ['duplicate-id', 'dead-link', 'target', 'alt', 'margin']);
  assert.match(findings(measurement({ smallTargets: [{ name: 'x', where: 'a.close', width: 16, height: 16 }] }))[0].message, /"x" \(a\.close\) is 16x16px/);
});

test('remarks describe what the margin moved without failing the run', () => {
  const measured = measurement({ margin: { overlaps: [], pushed: [{ block: 'figure.code-block', by: 32 }],
    items: [{ name: 'footnote 1', top: 400, height: 90, below: 124 }, { name: 'footnote 2', top: 900, height: 45, below: 0 }] } });
  assert.deepEqual(remarks(measured), ['footnote 1 sits 124px below its marker', 'figure.code-block starts 32px lower to clear the margin']);
  assert.deepEqual(findings(measured), []);
  assert.deepEqual(remarks(measurement()), []);
});

test('the same finding on many pages is reported once, with where', () => {
  const issue = { type: 'contrast', message: 'too faint' };
  const pages = [
    { route: '/', viewport: 'desktop', issues: [issue], remarks: ['moved'] },
    { route: '/', viewport: 'phone', issues: [issue], remarks: [] },
    { route: '/catalog/', viewport: 'phone', issues: [issue, { type: 'heading', message: 'expected one h1, found 0' }], remarks: [] },
  ];
  assert.deepEqual(groupFindings(pages), [
    { type: 'contrast', message: 'too faint', pages: [{ route: '/', viewports: ['desktop', 'phone'] }, { route: '/catalog/', viewports: ['phone'] }] },
    { type: 'heading', message: 'expected one h1, found 0', pages: [{ route: '/catalog/', viewports: ['phone'] }] },
  ]);
  assert.deepEqual(groupFindings(pages, 'remarks'), [{ type: 'remark', message: 'moved', pages: [{ route: '/', viewports: ['desktop'] }] }]);
});

test('the sitemap decides which pages are measured', async () => {
  const sitemap = '<urlset><url><loc>http://127.0.0.1:1314/shards/</loc></url><url><loc>http://127.0.0.1:1314/</loc></url>' +
    '<url><loc>http://127.0.0.1:1314/2026/02/08/rfd/</loc></url><url><loc>http://127.0.0.1:1314/</loc></url></urlset>';
  let asked;
  const fetcher = async url => { asked = url.href; return { ok: true, status: 200, text: async () => sitemap }; };
  assert.deepEqual(await sitemapPaths('http://127.0.0.1:1314/', fetcher), ['/', '/2026/02/08/rfd/', '/404.html', '/shards/']);
  assert.equal(asked, 'http://127.0.0.1:1314/sitemap.xml');
  await assert.rejects(sitemapPaths('http://127.0.0.1:1314/', async () => ({ ok: false, status: 404 })), /answered 404/);
  await assert.rejects(sitemapPaths('http://127.0.0.1:1314/', async () => ({ ok: true, text: async () => '<urlset/>' })), /lists no pages/);
});

test('a finding on a measured page fails the run and names every page it is on', async t => {
  const out = await temporary(t);
  const { browser } = fakeBrowser({ measured: measurement({ duplicateIds: ['summary'],
    margin: { overlaps: [], pushed: [], items: [{ name: 'footnote 1', top: 400, height: 90, below: 124 }] } }) });
  const lines = [];
  const report = await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: fakeServer({}), launchBrowser: async () => browser, routes, listPages, log: line => lines.push(line),
  });
  assert.equal(report.passed, false);
  assert.ok(report.captures.every(capture => capture.issues.length === 0)); // The pictures themselves were fine.
  assert.deepEqual(report.findings, [{ type: 'duplicate-id', message: 'id "summary" is used more than once',
    pages: [{ route: '/', viewports: ['desktop', 'phone'] }, { route: '/catalog/', viewports: ['desktop', 'phone'] }] }]);
  assert.ok(lines.includes('FAIL /catalog/ phone: duplicate-id'));
  assert.ok(lines.includes('FAIL measured 2 page(s) at desktop: 2 with findings'));
  const text = await readFile(path.join(out, 'normal/report.md'), 'utf8');
  assert.match(text, /Mode: \*\*normal\*\* · FAIL/);
  assert.match(text, /- \*\*duplicate-id:\*\* id "summary" is used more than once\n  - \/ \(desktop, phone\); \/catalog\/ \(desktop, phone\)/);
  assert.match(text, /## Worth knowing\n\n- footnote 1 sits 124px below its marker/);
});

test('--text-only measures and writes the report and trees, but no pictures', async t => {
  const out = await temporary(t);
  const { browser, state } = fakeBrowser();
  const report = await runScreenshots({ out, port: 1314, drafts: false, textOnly: true }, {
    startServer: fakeServer({}), launchBrowser: async () => browser, routes, listPages, log() {},
  });
  assert.equal(report.passed, true);
  assert.equal(state.screenshots.length, 0);
  assert.equal(report.pages.length, 4);
  assert.deepEqual((await readdir(path.join(out, 'normal'))).sort(),
    ['fixture-desktop.aria.yml', 'fixture-phone.aria.yml', 'report.json', 'report.md', 'server.log']);
});

test('without a readable sitemap the captured routes are measured, and the report says so', async t => {
  const out = await temporary(t);
  const { browser } = fakeBrowser();
  const report = await runScreenshots({ out, port: 1314, drafts: false }, {
    startServer: fakeServer({}), launchBrowser: async () => browser, routes,
    listPages: async () => { throw new Error('sitemap.xml answered 404'); }, log() {},
  });
  assert.equal(report.passed, true);
  assert.deepEqual(report.pages.map(page => page.route), ['/', '/']);
  assert.match(report.notes[0], /Only the captured routes were measured.*answered 404/);
  assert.match(await readFile(path.join(out, 'normal/report.md'), 'utf8'), /> Only the captured routes were measured/);
});

test('a page that cannot be measured or described is a failure, not a silent gap', async t => {
  const output = await temporary(t);
  const broken = fakeBrowser({ overflow: 40, errors: true, tree: null });
  const context = await broken.browser.newContext({});
  const measured = await measureRoute(context, '/', VIEWPORTS[0], 'http://127.0.0.1:1314/');
  for (const kind of ['overflow', 'console', 'pageerror', 'requestfailed', 'http']) {
    assert.ok(measured.issues.some(issue => issue.type === kind), kind);
  }
  const capture = await captureRoute(context, routes[0], VIEWPORTS[0], 'http://127.0.0.1:1314/', output);
  assert.ok(capture.issues.some(issue => issue.type === 'tree' && issue.message === 'No tree fixture'));
  assert.equal(capture.tree, undefined);
  assert.equal(broken.state.closedPages, 2);
});

test('measurePage runs on its own in a page and returns every field the rules read', () => {
  // It is serialised into the browser, so it may use nothing from this module. An empty
  // document is enough to prove that, and to pin the shape findings() depends on.
  const style = { visibility: 'visible', display: 'block', backgroundColor: 'rgb(40, 40, 40)', clipPath: 'none', position: 'static' };
  const page = vm.runInNewContext(`(${measurePage.toString()})()`, {
    document: {
      title: 'empty', documentElement: { lang: 'en', scrollHeight: 0 }, body: {}, head: { append() {} },
      querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ remove() {} }),
    },
    getComputedStyle: () => style, scrollY: 0,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(page)), {
    title: 'empty', lang: 'en', height: 0, headings: [], landmarks: [], tabStops: [], duplicateIds: [],
    deadFragments: [], smallTargets: [], withoutAlt: [], contrast: [],
    margin: { items: [], overlaps: [], pushed: [] }, notes: { margin: 0, end: 0, sidenotes: 0 },
  });
  assert.deepEqual(findings(page), [{ type: 'heading', message: 'expected one h1, found 0' }]);
});

const hasHugo = spawnSync(process.env.HUGO_BIN || 'hugo', ['version']).status === 0;
test('real Hugo preview serves a normal build and releases its port on shutdown', { skip: !hasHugo }, async t => {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const preview = await startPreview({ port, drafts: false });
  t.after(() => preview.stop());
  const home = await fetch(preview.baseURL).then(response => response.text());
  assert.match(home, /secure thought transfer protocol/);
  assert.doesNotMatch(home, /sample: next step|livereload\.js/);
  const missing = await fetch(new URL('/wal/2026-01-03-next-step/', preview.baseURL));
  assert.equal(missing.status, 404);
  await preview.stop();
  await assertPortFree(port);
});
