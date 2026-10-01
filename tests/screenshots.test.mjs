import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assertPortFree, captureRoute, measureOverflow, optionsFromArgs,
  ROUTES, runScreenshots, screenshotName, startPreview, VIEWPORTS,
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

function fakeBrowser({ overflow = 0, errors = false, missingRegion = false } = {}) {
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
              ? { pixels: overflow, viewportWidth: 390, documentWidth: 390 + overflow, offenders: [] } : [],
            locator: () => ({ first: () => ({ count: async () => missingRegion ? 0 : 1, evaluate: async () => {} }) }),
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
    startServer: fakeServer(server), launchBrowser: async () => first.browser, routes, log() {},
  });
  assert.equal(report.passed, true);
  assert.equal(server.started.drafts, false);
  assert.equal(server.stopped, true);
  assert.equal(first.state.closedPages, 2);
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
    startServer: fakeServer({}), launchBrowser: async () => second.browser, routes, log() {},
  });
  assert.equal(await readFile(path.join(out, 'normal', 'unrelated.txt'), 'utf8'), 'keep');
  const draftServer = {};
  await runScreenshots({ out, port: 1314, drafts: true }, {
    startServer: fakeServer(draftServer), launchBrowser: async () => fakeBrowser().browser, routes, log() {},
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
  assert.deepEqual(report.captures, []);
  assert.match(await readFile(path.join(out, 'normal/report.md'), 'utf8'), /No browser installed/);
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
