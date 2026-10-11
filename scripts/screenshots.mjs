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
    'text-only': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  } });
  if (!/^\d+$/.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535) {
    throw new Error('--port must be an integer between 1 and 65535.');
  }
  if (!values.out.trim()) throw new Error('--out must be a directory.');
  return { ...values, port: Number(values.port), out: path.resolve(values.out), textOnly: values['text-only'] };
}

export function screenshotName(route, viewport, shot) {
  return `${route.name}-${viewport.name}${shot.name ? `-${shot.name}` : ''}.png`;
}

// The page as assistive technology receives it, as text.
export function treeName(route, viewport) {
  return `${route.name}-${viewport.name}.aria.yml`;
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

// Runs in the browser. The facts a picture blurs: structure, order, contrast and geometry.
// It only measures; findings() below decides what counts as wrong.
export function measurePage() {
  const shown = element => {
    if (!element || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none';
  };
  // Text kept for screen readers only is not painted, so it has no contrast to measure.
  const clipped = style => style.clipPath !== 'none' ||
    (style.position === 'absolute' && parseFloat(style.width) <= 1 && parseFloat(style.height) <= 1);
  // An element's words as assistive technology reads them: decoration marked hidden is left out.
  const said = node => node.nodeType === 3 ? node.textContent
    : node.nodeType !== 1 || node.getAttribute('aria-hidden') === 'true' ? '' : [...node.childNodes].map(said).join('');
  const label = element => (element.getAttribute('aria-label') || said(element) || element.getAttribute('alt') || '')
    .replace(/\s+/g, ' ').trim().slice(0, 60) || element.tagName.toLowerCase();
  const describe = element => element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') +
    [...element.classList].map(name => `.${name}`).join('');

  // Structure.
  // A heading's own words, without the "#" link the site appends to it.
  const words = heading => [...heading.childNodes].filter(node => !node.classList?.contains('heading-permalink'))
    .map(said).join('').replace(/\s+/g, ' ').trim().slice(0, 60);
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(shown)
    .map(heading => ({ level: Number(heading.tagName[1]), text: words(heading) }));
  const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const landmarks = [...document.querySelectorAll('body > header, nav, main, [role="region"], body > footer')].filter(shown)
    .map(element => ({ kind: element.getAttribute('role') || element.tagName.toLowerCase(), label: element.getAttribute('aria-label') || '' }));
  const withoutAlt = [...document.querySelectorAll('img:not([alt])')].filter(shown).map(image => image.currentSrc || image.src);

  // Keyboard: what Tab reaches, in the order it reaches it.
  const focusable = [...document.querySelectorAll('a[href], button, summary, input, select, textarea, [tabindex]')]
    .filter(element => shown(element) && element.tabIndex >= 0 && !element.disabled);
  const tabStops = [...focusable.filter(element => element.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex),
    ...focusable.filter(element => element.tabIndex === 0)].map(label);

  // Target size (WCAG 2.5.8). Smaller than 24px is fine inside a sentence, or when a 24px
  // circle on the target touches no other target and no other small target's circle.
  const targets = focusable.map(element => ({ element, rect: element.getBoundingClientRect() }));
  const small = targets.filter(({ rect }) => rect.width < 24 || rect.height < 24);
  const inSentence = element => {
    const display = getComputedStyle(element).display;
    if (display === 'inline') return true;
    return display.startsWith('inline') && [...element.parentElement.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
  };
  const centre = rect => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  const reach = (point, rect) => Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom));
  const crowded = target => {
    const middle = centre(target.rect);
    return targets.some(other => {
      if (other.element === target.element || target.element.contains(other.element) || other.element.contains(target.element)) return false;
      if (small.includes(other)) { const there = centre(other.rect); return Math.hypot(middle.x - there.x, middle.y - there.y) < 24; }
      return reach(middle, other.rect) < 12;
    });
  };
  const smallTargets = small.filter(target => !inSentence(target.element) && crowded(target)).map(({ element, rect }) =>
    ({ name: label(element), where: describe(element), width: Math.round(rect.width), height: Math.round(rect.height) }));

  // In-page links that lead to something hidden or missing.
  const deadFragments = [...new Set([...document.querySelectorAll('a[href^="#"]')].filter(shown).map(link => link.getAttribute('href'))
    .filter(href => href.length > 1 && !shown(document.getElementById(decodeURIComponent(href.slice(1))))))];

  // Contrast of every painted run of text against the first opaque background behind it.
  const parse = colour => { const parts = colour.match(/[\d.]+/g).map(Number); return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }; };
  const luminance = ({ r, g, b }) => [r, g, b].map(value => { value /= 255; return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const hex = colour => '#' + [colour.r, colour.g, colour.b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
  const behind = element => {
    for (let current = element; current; current = current.parentElement) {
      const colour = parse(getComputedStyle(current).backgroundColor);
      if (colour.a > 0.99) return colour;
    }
    return { r: 255, g: 255, b: 255, a: 1 }; // The browser's own canvas.
  };
  const pairs = new Map();
  const paint = (element, style, text, pseudo) => {
    const sample = text.replace(/\s+/g, ' ').trim();
    if (!sample) return;
    const colour = parse(style.color), background = behind(element);
    const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700;
    const key = `${hex(colour)} ${hex(background)} ${size} ${bold}`;
    if (pairs.has(key)) return;
    const [lighter, darker] = [luminance(colour), luminance(background)].sort((a, b) => b - a);
    pairs.set(key, { ratio: Math.round((lighter + 0.05) / (darker + 0.05) * 100) / 100,
      required: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, colour: hex(colour), background: hex(background),
      size, bold, sample: (pseudo ? `${pseudo} ` : '') + sample.slice(0, 40), where: describe(element) });
  };
  for (const element of document.querySelectorAll('body *')) {
    if (element.closest('svg, script, style, [hidden]') || !shown(element)) continue;
    const style = getComputedStyle(element);
    if (clipped(style)) continue;
    for (const node of element.childNodes) if (node.nodeType === 3) paint(element, style, node.textContent, '');
    for (const pseudo of ['::before', '::after']) {
      const generated = getComputedStyle(element, pseudo);
      if (!generated.content || ['none', 'normal', '""'].includes(generated.content) || generated.display === 'none' || clipped(generated)) continue;
      paint(element, generated, generated.content.replace(/["\\]/g, ''), pseudo);
    }
  }
  const contrast = [...pairs.values()].sort((a, b) => a.ratio - b.ratio);

  // The margin column: what hangs there, whether anything collides, and what it displaces.
  const top = element => Math.round(element.getBoundingClientRect().top + scrollY);
  const hanging = [...document.querySelectorAll('.toc-margin, .sidenote')].filter(element => shown(element) && getComputedStyle(element).float !== 'none');
  const naming = element => element.classList.contains('toc-margin') ? 'on this page'
    : element.classList.contains('footnote-aside') ? `footnote ${element.dataset.n}` : `sidenote "${label(element).slice(0, 24)}"`;
  const items = hanging.map(element => {
    const marker = element.classList.contains('sidenote') ? element.previousElementSibling : null;
    return { name: naming(element), top: top(element), height: Math.round(element.getBoundingClientRect().height),
      below: marker && shown(marker) ? top(element) - top(marker) : 0 };
  });
  const overlaps = [];
  hanging.forEach((first, index) => hanging.slice(index + 1).forEach(second => {
    const a = first.getBoundingClientRect(), b = second.getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps.push([naming(first), naming(second)]);
  }));
  // The gaps that open above wide blocks so they clear what hangs in the margin. Only
  // hanging items are taken away to measure: a note set inline is part of the text.
  const wide = [...document.querySelectorAll('.article-prose > :is(pre, figure, .table-scroll, .dev-flow, .footnotes)')].filter(shown);
  const withMargin = wide.map(top);
  for (const element of hanging) element.style.setProperty('display', 'none', 'important');
  const shifts = wide.map((element, index) => withMargin[index] - top(element));
  for (const element of hanging) element.style.removeProperty('display');
  const pushed = wide.map((element, index) => ({ block: describe(element), by: shifts[index] - (shifts[index - 1] || 0) })).filter(entry => entry.by > 1);

  const count = selector => [...document.querySelectorAll(selector)].filter(shown).length;
  return {
    title: document.title, lang: document.documentElement.lang, height: document.documentElement.scrollHeight,
    headings, landmarks, tabStops, duplicateIds, deadFragments, smallTargets, withoutAlt, contrast,
    margin: { items, overlaps, pushed },
    notes: { margin: count('.footnote-aside'), end: count('.footnotes li'), sidenotes: count('.sidenote:not(.footnote-aside)') },
  };
}

// Fixed rules over the measurements: the same page always gives the same findings.
export function findings(measured) {
  const found = [];
  const add = (type, message) => found.push({ type, message });
  for (const pair of measured.contrast.filter(pair => pair.ratio < pair.required)) {
    add('contrast', `${pair.ratio}:1 for ${pair.colour} on ${pair.background} at ${pair.size}px${pair.bold ? ' bold' : ''}; needs ${pair.required}:1 ("${pair.sample}" in ${pair.where})`);
  }
  const first = measured.headings.filter(heading => heading.level === 1).length;
  if (first !== 1) add('heading', `expected one h1, found ${first}`);
  measured.headings.reduce((previous, heading) => {
    if (previous && heading.level > previous.level + 1) add('heading', `"${heading.text}" (h${heading.level}) follows "${previous.text}" (h${previous.level}), skipping a level`);
    return heading;
  }, null);
  for (const id of measured.duplicateIds) add('duplicate-id', `id "${id}" is used more than once`);
  for (const href of measured.deadFragments) add('dead-link', `${href} leads to nothing visible on the page`);
  for (const target of measured.smallTargets) add('target', `"${target.name}" (${target.where}) is ${target.width}x${target.height}px with another target within 24px`);
  for (const source of measured.withoutAlt) add('alt', `image has no alt attribute: ${source}`);
  for (const [one, other] of measured.margin.overlaps) add('margin', `${one} overlaps ${other} in the margin`);
  return found;
}

// Worth knowing, not wrong: how the margin column rearranged the page.
export function remarks(measured) {
  return [
    ...measured.margin.items.filter(item => item.below > 60).map(item => `${item.name} sits ${item.below}px below its marker`),
    ...measured.margin.pushed.map(entry => `${entry.block} starts ${entry.by}px lower to clear the margin`),
  ];
}

// Every page the site publishes, from its own sitemap, plus the 404 page it leaves out.
export async function sitemapPaths(baseURL, fetcher = fetch) {
  const response = await fetcher(new URL('sitemap.xml', baseURL), { signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`sitemap.xml answered ${response.status}`);
  const paths = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  if (!paths.length) throw new Error('sitemap.xml lists no pages');
  return [...new Set([...paths, '/404.html'])].sort();
}

function watch(page, issue) {
  page.setDefaultTimeout(TIMEOUT);
  page.on('pageerror', error => issue('pageerror', error.message));
  page.on('console', message => { if (message.type() === 'error') issue('console', message.text()); });
  page.on('requestfailed', request => issue('requestfailed', `${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) issue('http', `${response.status()} ${response.url()}`);
  });
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

export async function captureRoute(context, route, viewport, baseURL, output, signal, { images = true } = {}) {
  const capture = { route: route.route, viewport: viewport.name, screenshots: [], issues: [] };
  const page = await context.newPage();
  const issue = (type, message) => capture.issues.push({ type, message });
  watch(page, issue);
  try {
    signal?.throwIfAborted();
    const response = await page.goto(new URL(route.route, baseURL).href, { waitUntil: 'networkidle', timeout: TIMEOUT });
    capture.status = response?.status();
    for (const image of await readyImages(page)) issue('image', `Image did not decode: ${image}`);
    capture.overflow = await page.evaluate(measureOverflow);
    if (capture.overflow.pixels > 1) issue('overflow', `${capture.overflow.pixels}px horizontal page overflow.`);
    try {
      const file = treeName(route, viewport);
      await writeFile(path.join(output, file), `${await page.locator('body').ariaSnapshot()}\n`);
      capture.tree = file;
    } catch (error) { issue('tree', error.message); }
    for (const shot of images ? route.shots : []) {
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

// One page, measured: no pictures, so it can afford to visit every page there is.
export async function measureRoute(context, route, viewport, baseURL, signal) {
  const result = { route, viewport: viewport.name, issues: [], remarks: [] };
  const page = await context.newPage();
  const issue = (type, message) => result.issues.push({ type, message });
  watch(page, issue);
  try {
    signal?.throwIfAborted();
    const response = await page.goto(new URL(route, baseURL).href, { waitUntil: 'networkidle', timeout: TIMEOUT });
    result.status = response?.status();
    for (const image of await readyImages(page)) issue('image', `Image did not decode: ${image}`);
    result.overflow = await page.evaluate(measureOverflow);
    if (result.overflow.pixels > 1) issue('overflow', `${result.overflow.pixels}px horizontal page overflow.`);
    result.measured = await page.evaluate(measurePage);
    result.issues.push(...findings(result.measured));
    result.remarks = remarks(result.measured);
  } catch (error) { issue('measure', error.message); }
  finally { await page.close(); }
  return result;
}

// The same finding on forty pages is one line with forty addresses.
export function groupFindings(pages, field = 'issues') {
  const groups = new Map();
  for (const page of pages) for (const entry of page[field]) {
    const finding = typeof entry === 'string' ? { type: 'remark', message: entry } : entry;
    const key = `${finding.type}\n${finding.message}`;
    if (!groups.has(key)) groups.set(key, { ...finding, pages: new Map() });
    const where = groups.get(key).pages;
    where.set(page.route, [...new Set([...(where.get(page.route) || []), page.viewport])]);
  }
  return [...groups.values()].map(group => ({ type: group.type, message: group.message,
    pages: [...group.pages].map(([route, viewports]) => ({ route, viewports })) }));
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
    'Read the findings and measurements before opening an image. They are exact, and the same site',
    'always gives the same ones; the pictures are for judging how it looks. `report.json` has every number.', ''];
  if (report.fatal) lines.push('## Runner error', '', '```text', report.fatal, '```', '');
  for (const note of report.notes) lines.push(`> ${note}`, '');
  const places = pages => pages.slice(0, 6).map(page => `${page.route} (${page.viewports.join(', ')})`).join('; ') +
    (pages.length > 6 ? `; and ${pages.length - 6} more` : '');
  const flat = text => text.replaceAll('\n', ' ');
  if (report.pages.length || report.findings.length) {
    lines.push('## Findings', '');
    if (!report.findings.length) lines.push(`None on ${new Set(report.pages.map(page => page.route)).size} page(s) at ${report.viewports.length} size(s).`);
    for (const finding of report.findings) lines.push(`- **${finding.type}:** ${flat(finding.message)}`, `  - ${places(finding.pages)}`);
    lines.push('');
  }
  if (report.remarks.length) {
    lines.push('## Worth knowing', '');
    for (const remark of report.remarks) lines.push(`- ${flat(remark.message)}`, `  - ${places(remark.pages)}`);
    lines.push('');
  }
  if (report.pages.length) {
    lines.push('## Measured pages', '',
      '| page | size | overflow | lowest contrast | headings | tab stops | notes in margin / at end | findings |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const page of report.pages) {
      const measured = page.measured;
      lines.push(`| ${page.route} | ${page.viewport} | ${page.overflow ? `${page.overflow.pixels}px` : '?'} | ` +
        `${measured?.contrast[0] ? `${measured.contrast[0].ratio}:1` : '-'} | ${measured ? measured.headings.length : '?'} | ` +
        `${measured ? measured.tabStops.length : '?'} | ${measured ? `${measured.notes.margin + measured.notes.sidenotes} / ${measured.notes.end}` : '?'} | ` +
        `${page.issues.length || ''} |`);
    }
    lines.push('');
  }
  const some = (list, limit) => list.slice(0, limit).join(' > ') + (list.length > limit ? ` > … (${list.length} in all)` : '');
  for (const capture of report.captures) {
    lines.push(`## ${capture.route} — ${capture.viewport}`, '');
    for (const issue of capture.issues) lines.push(`- **${issue.type}:** ${flat(issue.message)}`);
    const measured = report.pages.find(page => page.route === capture.route && page.viewport === capture.viewport)?.measured;
    if (measured) {
      lines.push(`- outline: ${some(measured.headings.map(heading => `h${heading.level} ${heading.text}`), 12)}`,
        `- tab order: ${some(measured.tabStops, 12)}`);
    }
    if (capture.tree) lines.push(`- accessibility tree: [${capture.tree}](${capture.tree})`);
    for (const shot of capture.screenshots) lines.push('', `![${shot.file}](${shot.file})`, '');
    if (!capture.screenshots.length) lines.push('');
  }
  return lines.join('\n');
}

export async function runScreenshots(options, {
  startServer = startPreview, launchBrowser = launchChromium, routes = ROUTES,
  viewports = VIEWPORTS, listPages = sitemapPaths, log = console.log, signal,
} = {}) {
  const mode = options.drafts ? 'drafts' : 'normal';
  const output = path.join(options.out, mode);
  await mkdir(output, { recursive: true });
  // Clear only this runner's known files, never recursively delete an output directory.
  const files = ['report.json', 'report.md', 'server.log', ...routes.flatMap(route =>
    viewports.flatMap(viewport => [treeName(route, viewport), ...route.shots.map(shot => screenshotName(route, viewport, shot))]))];
  for (const file of files) await unlink(path.join(output, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  const report = { mode, createdAt: new Date().toISOString(), platform: `${process.platform}/${process.arch}`,
    node: process.version, viewports, settings: { deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC',
      colorScheme: 'dark', reducedMotion: 'reduce' }, captures: [], pages: [], findings: [], remarks: [], notes: [],
    passed: false };
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
    // Pictures cover a chosen few routes; measurements cover every page the site lists.
    let pages;
    try { pages = await listPages(server.baseURL); }
    catch (error) {
      pages = routes.map(route => route.route);
      report.notes.push(`Only the captured routes were measured, because the sitemap could not be read: ${error.message}`);
    }
    for (const viewport of viewports) {
      signal?.throwIfAborted();
      const { name, width, height, ...emulation } = viewport;
      const context = await browser.newContext({ viewport: { width, height }, ...emulation,
        ...report.settings, serviceWorkers: 'block' });
      try {
        for (const route of routes) {
          signal?.throwIfAborted();
          const capture = await captureRoute(context, route, viewport, server.baseURL, output, signal, { images: !options.textOnly });
          report.captures.push(capture);
          log(`${capture.issues.length ? 'FAIL' : 'OK'} ${route.route} ${name}: ${capture.screenshots.length} screenshot(s)`);
        }
        let flagged = 0;
        for (const route of pages) {
          signal?.throwIfAborted();
          const measured = await measureRoute(context, route, viewport, server.baseURL, signal);
          report.pages.push(measured);
          if (!measured.issues.length) continue;
          flagged++;
          log(`FAIL ${route} ${name}: ${[...new Set(measured.issues.map(issue => issue.type))].join(', ')}`);
        }
        log(`${flagged ? 'FAIL' : 'OK'} measured ${pages.length} page(s) at ${name}: ${flagged} with findings`);
      } finally { await context.close(); }
    }
    report.findings = groupFindings(report.pages);
    report.remarks = groupFindings(report.pages, 'remarks');
    report.passed = [...report.captures, ...report.pages].every(visit => visit.issues.length === 0);
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
    console.log('Usage: npm run screenshots -- [--drafts] [--text-only] [--port 1314] [--out .artifacts/screenshots]\n\nStarts a dedicated Hugo preview. Measures every page in the sitemap at desktop and phone sizes,\nand writes PNGs and accessibility trees for the main routes, under normal/ or drafts/.\nRead report.md first: findings come from fixed rules, so they repeat exactly.\n  --text-only  measure and write the report and trees, but no PNGs\nRequires Hugo, Node 20+, and Chromium installed with: npx playwright install chromium');
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
