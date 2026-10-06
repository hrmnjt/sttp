#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT = 15_000;
export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, isMobile: false, hasTouch: false },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const full = { name: '', fullPage: true };
export const ROUTES = [
  { name: 'home', route: '/', shots: [full] },
  { name: 'catalog', route: '/catalog/', shots: [full] },
  { name: 'shards', route: '/shards/', shots: [full] },
  { name: 'builds', route: '/builds/', shots: [full] },
  { name: 'build-dev', route: '/builds/dev/', shots: [full] },
  { name: 'wal', route: '/wal/', shots: [full] },
  { name: 'readme', route: '/readme/', shots: [full] },
  { name: 'shard-rfd', route: '/2026/02/08/rfd/', shots: [
    { name: 'top' }, { name: 'code', selector: 'article .code-block:has(.highlight)' },
    { name: 'end', selector: 'article .source-trail' },
  ] },
  { name: 'shard-harlequin', route: '/2024/12/02/readdatawithharlequin/', shots: [
    { name: 'top' }, { name: 'media', selector: 'article img' },
  ] },
];

export function optionsFromArgs(args) {
  const { values } = parseArgs({ args, options: {
    drafts: { type: 'boolean', default: false },
    port: { type: 'string', default: '1314' },
    out: { type: 'string', default: path.join(ROOT, '.artifacts/screenshots') },
    help: { type: 'boolean', short: 'h' },
  } });
  if (!/^\d+$/.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535) {
    throw new Error('--port must be an integer between 1 and 65535.');
  }
  if (!values.out.trim()) throw new Error('--out must be a directory.');
  return { ...values, port: Number(values.port), out: path.resolve(values.out) };
}

export function screenshotName(route, viewport, shot) {
  return `${route.name}-${viewport.name}${shot.name ? `-${shot.name}` : ''}.png`;
}

export async function assertPortFree(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', () => reject(new Error(`Port ${port} is unavailable. Choose another with --port; existing servers are never reused.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

// Own a loopback-only, non-watching Hugo server and temporary build/cache outputs.
export async function startPreview({ port, drafts, root = ROOT, signal }) {
  await assertPortFree(port);
  signal?.throwIfAborted();
  const temp = await mkdtemp(path.join(tmpdir(), 'sttp-screenshots-'));
  const baseURL = `http://127.0.0.1:${port}/`;
  const args = [
    'server', '--bind', '127.0.0.1', '--port', String(port), '--baseURL', baseURL,
    '--appendPort=false', '--watch=false', '--disableLiveReload', '--disableFastRender',
    '--noHTTPCache', '--noBuildLock', '--panicOnWarning', '--printPathWarnings',
    '--destination', path.join(temp, 'public'), '--cacheDir', path.join(temp, 'cache'),
  ];
  if (drafts) args.push('--buildDrafts');
  const child = spawn(process.env.HUGO_BIN || 'hugo', args, {
    cwd: root, env: { ...process.env, HUGO_RESOURCEDIR: path.join(temp, 'resources') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  let ended;
  const exited = new Promise(resolve => {
    child.once('error', error => { ended = { error }; resolve(); });
    child.once('exit', (code, signal) => { ended ??= { code, signal }; resolve(); });
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { log = (log + chunk.toString()).slice(-65_536); });
  }
  let stopping;
  const stop = () => stopping ??= (async () => {
    if (!ended) {
      child.kill('SIGTERM');
      const stopped = await Promise.race([exited.then(() => true), sleep(1000).then(() => false)]);
      if (!stopped) { child.kill('SIGKILL'); await exited; }
    }
    await rm(temp, { recursive: true, force: true });
  })();
  try {
    const deadline = Date.now() + TIMEOUT;
    while (Date.now() < deadline) {
      signal?.throwIfAborted();
      if (ended) throw new Error(`Hugo failed to start: ${ended.error?.message || `exit ${ended.code}`}\n${log}`);
      try {
        const response = await fetch(baseURL, { signal: AbortSignal.timeout(1000) });
        await response.arrayBuffer();
        if (response.ok) {
          // Check the child is still alive; don't silently use another process's server.
          await sleep(50, undefined, { signal });
          if (ended) continue;
          return { baseURL, stop, get log() { return log; } };
        }
      } catch { /* Server is still starting. */ }
      await sleep(100, undefined, { signal });
    }
    throw new Error(`Hugo did not become ready within ${TIMEOUT / 1000}s.\n${log}`);
  } catch (error) {
    await stop();
    throw error;
  }
}

// Runs in the browser. Nested scrolling code/tables are not page overflow.
export function measureOverflow() {
  const width = window.innerWidth;
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const offenders = documentWidth > width + 1 ? [...document.querySelectorAll('body *')].filter(element => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || (rect.right <= width + 1 && rect.left >= -1)) return false;
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) return false;
    }
    return true;
  }).slice(0, 8).map(element => ({
    element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') +
      [...element.classList].map(name => `.${name}`).join(''),
    width: Math.round(element.getBoundingClientRect().width),
  })) : [];
  return { viewportWidth: width, documentWidth, pixels: Math.max(0, documentWidth - width), offenders };
}

async function readyImages(page) {
  return page.evaluate(async () => {
    let timer;
    try {
      return await Promise.race([
        (async () => {
          await document.fonts.ready;
          // Full-page captures include offscreen media too; don't mistake lazy placeholders for broken images.
          for (const image of document.images) image.loading = 'eager';
          await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
          return [...document.images].filter(image => !image.naturalWidth).map(image => image.currentSrc || image.src);
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out waiting for fonts/images.')), 10_000); }),
      ]);
    } finally { clearTimeout(timer); }
  });
}

export async function captureRoute(context, route, viewport, baseURL, output, signal) {
  const capture = { route: route.route, viewport: viewport.name, screenshots: [], issues: [] };
  const page = await context.newPage();
  const issue = (type, message) => capture.issues.push({ type, message });
  page.setDefaultTimeout(TIMEOUT);
  page.on('pageerror', error => issue('pageerror', error.message));
  page.on('console', message => { if (message.type() === 'error') issue('console', message.text()); });
  page.on('requestfailed', request => issue('requestfailed', `${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) issue('http', `${response.status()} ${response.url()}`);
  });
  try {
    signal?.throwIfAborted();
    const response = await page.goto(new URL(route.route, baseURL).href, { waitUntil: 'networkidle', timeout: TIMEOUT });
    capture.status = response?.status();
    for (const image of await readyImages(page)) issue('image', `Image did not decode: ${image}`);
    capture.overflow = await page.evaluate(measureOverflow);
    if (capture.overflow.pixels > 1) issue('overflow', `${capture.overflow.pixels}px horizontal page overflow.`);
    for (const shot of route.shots) {
      signal?.throwIfAborted();
      try {
        if (shot.selector) {
          const region = page.locator(shot.selector).first();
          if (!await region.count()) throw new Error(`Missing capture region: ${shot.selector}`);
          await region.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
        } else {
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        const file = screenshotName(route, viewport, shot);
        await page.screenshot({ path: path.join(output, file), fullPage: !!shot.fullPage,
          animations: 'disabled', caret: 'hide', timeout: TIMEOUT });
        capture.screenshots.push({ file, region: shot.selector || (shot.fullPage ? 'full page' : 'top viewport') });
      } catch (error) { issue('screenshot', error.message); }
    }
  } catch (error) { issue('capture', error.message); }
  finally { await page.close(); }
  return capture;
}

async function launchChromium() {
  const { chromium } = await import('playwright');
  try {
    return await chromium.launch({ headless: true, timeout: TIMEOUT,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  } catch (error) {
    throw new Error(`Chromium could not start. Run "npx playwright install chromium" on a supported host (your Mac or Ubuntu). Alpine is not supported by bundled Playwright browsers.\n${error.message}`);
  }
}

function markdownReport(report) {
  const lines = ['# sttp screenshot report', '', `Mode: **${report.mode}** · ${report.passed ? 'PASS' : 'FAIL'}`,
    `Chromium: ${report.chromium || 'not started'} · ${report.platform}`, '',
    'See `report.json` for viewport settings, overflow measurements, and request errors.', ''];
  if (report.fatal) lines.push('## Runner error', '', '```text', report.fatal, '```', '');
  for (const capture of report.captures) {
    lines.push(`## ${capture.route} — ${capture.viewport}`, '');
    for (const issue of capture.issues) lines.push(`- **${issue.type}:** ${issue.message.replaceAll('\n', ' ')}`);
    for (const shot of capture.screenshots) lines.push('', `![${shot.file}](${shot.file})`, '');
  }
  return lines.join('\n');
}

export async function runScreenshots(options, {
  startServer = startPreview, launchBrowser = launchChromium, routes = ROUTES,
  viewports = VIEWPORTS, log = console.log, signal,
} = {}) {
  const mode = options.drafts ? 'drafts' : 'normal';
  const output = path.join(options.out, mode);
  await mkdir(output, { recursive: true });
  // Clear only this runner's known files, never recursively delete an output directory.
  const files = ['report.json', 'report.md', 'server.log', ...routes.flatMap(route =>
    viewports.flatMap(viewport => route.shots.map(shot => screenshotName(route, viewport, shot))))];
  for (const file of files) await unlink(path.join(output, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  const report = { mode, createdAt: new Date().toISOString(), platform: `${process.platform}/${process.arch}`,
    node: process.version, viewports, settings: { deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC',
      colorScheme: 'dark', reducedMotion: 'reduce' }, captures: [], passed: false };
  let server;
  let browser;
  const abort = () => { void browser?.close().catch(() => {}); void server?.stop().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    signal?.throwIfAborted();
    server = await startServer({ port: options.port, drafts: options.drafts, signal });
    report.baseURL = server.baseURL;
    signal?.throwIfAborted();
    browser = await launchBrowser();
    report.chromium = browser.version();
    for (const viewport of viewports) {
      signal?.throwIfAborted();
      const { name, width, height, ...emulation } = viewport;
      const context = await browser.newContext({ viewport: { width, height }, ...emulation,
        ...report.settings, serviceWorkers: 'block' });
      try {
        for (const route of routes) {
          signal?.throwIfAborted();
          const capture = await captureRoute(context, route, viewport, server.baseURL, output, signal);
          report.captures.push(capture);
          log(`${capture.issues.length ? 'FAIL' : 'OK'} ${route.route} ${name}: ${capture.screenshots.length} screenshot(s)`);
        }
      } finally { await context.close(); }
    }
    report.passed = report.captures.every(capture => capture.issues.length === 0);
  } catch (error) { report.fatal = error.message; }
  finally {
    signal?.removeEventListener('abort', abort);
    await browser?.close().catch(error => { report.fatal ??= error.message; });
    await server?.stop().catch(error => { report.fatal ??= error.message; });
    if (report.fatal) report.passed = false;
    await writeFile(path.join(output, 'server.log'), server?.log || report.fatal || '');
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(path.join(output, 'report.md'), markdownReport(report));
  }
  log(`Report: ${path.join(output, 'report.md')}`);
  return report;
}

async function main() {
  const options = optionsFromArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: npm run screenshots -- [--drafts] [--port 1314] [--out .artifacts/screenshots]\n\nStarts a dedicated Hugo preview; writes desktop/phone PNGs and reports under normal/ or drafts/.\nRequires Hugo, Node 20+, and Chromium installed with: npx playwright install chromium');
    return;
  }
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error('Screenshot run interrupted.'));
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const report = await runScreenshots(options, { signal: controller.signal });
    if (report.fatal) console.error(report.fatal);
    if (!report.passed) process.exitCode = controller.signal.aborted ? 130 : 1;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
