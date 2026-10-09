#!/usr/bin/env node
// Draw every ```mermaid fence in content/ as an SVG under assets/images/diagrams/, named by
// a hash of its source. Hugo swaps each fence for its drawing at build time, so the deployed
// site needs no JavaScript and Cloudflare Pages keeps building with plain `hugo`.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAWING = /^[0-9a-f]{16}\.svg$/;

export function optionsFromArgs(args) {
  const { values } = parseArgs({ args, options: {
    check: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    content: { type: 'string', default: path.join(ROOT, 'content') },
    out: { type: 'string', default: path.join(ROOT, 'assets/images/diagrams') },
    css: { type: 'string', default: path.join(ROOT, 'assets/css/main.css') },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.check && values.all) throw new Error('--check only reports; it cannot be combined with --all.');
  return { ...values, content: path.resolve(values.content), out: path.resolve(values.out), css: path.resolve(values.css) };
}

// The text Hugo hands the render hook as .Inner, without trailing whitespace.
export function normalise(source) {
  return source.replace(/\r\n/g, '\n').replace(/[ \t\r\n]+$/, '');
}

// Must match layouts/_default/_markup/render-codeblock-mermaid.html.
export function diagramKey(source) {
  return createHash('sha256').update(normalise(source)).digest('hex').slice(0, 16);
}

// CommonMark fences: enough to tell a mermaid block from one quoted inside another block.
export function findDiagrams(markdown) {
  const diagrams = [];
  let fence = null;
  const close = () => {
    if (fence.language === 'mermaid') diagrams.push(normalise(fence.lines.join('\n')));
    fence = null;
  };
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (fence) {
      const end = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (end && end[1][0] === fence.char && end[1].length >= fence.length) close();
      else fence.lines.push(line.replace(new RegExp(`^ {0,${fence.indent}}`), ''));
      continue;
    }
    const start = line.match(/^( {0,3})(`{3,}|~{3,})[ \t]*([^\s`{]*)(.*)$/);
    // A backtick fence's info string cannot itself contain a backtick.
    if (start && !(start[2][0] === '`' && start[4].includes('`'))) {
      fence = { indent: start[1].length, char: start[2][0], length: start[2].length, language: start[3].toLowerCase(), lines: [] };
    }
  }
  if (fence) close(); // An unclosed fence runs to the end of the document.
  return diagrams;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.name.endsWith('.md')) files.push(target);
  }
  return files.sort();
}

// What the content asks for against what is already drawn.
export async function plan({ content, out }) {
  const wanted = new Map();
  for (const file of await markdownFiles(content)) {
    for (const source of findDiagrams(await readFile(file, 'utf8'))) {
      const key = diagramKey(source);
      if (!wanted.has(key)) wanted.set(key, { key, source, files: [] });
      wanted.get(key).files.push(path.relative(content, file));
    }
  }
  const drawn = (await readdir(out).catch(error => { if (error.code === 'ENOENT') return []; throw error; }))
    .filter(name => DRAWING.test(name)).map(name => name.slice(0, 16));
  const diagrams = [...wanted.values()];
  return {
    diagrams,
    missing: diagrams.filter(diagram => !drawn.includes(diagram.key)),
    orphans: drawn.filter(key => !wanted.has(key)),
  };
}

// Colours and type come from the stylesheet's own tokens, so a diagram cannot drift from the page.
export function mermaidConfig(css) {
  const gb = Object.fromEntries([...css.matchAll(/--gb-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map(match => [match[1], match[2]]));
  const fontFamily = css.match(/--font-mono:\s*([^;]+);/)?.[1].trim() ?? 'monospace';
  for (const token of ['bg0-hard', 'bg0', 'bg1', 'bg3', 'fg1', 'fg3']) {
    if (!gb[token]) throw new Error(`The stylesheet no longer defines --gb-${token}; diagrams take their colours from it.`);
  }
  return {
    startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily,
    // SVG text, not HTML in a foreignObject: the drawing is shown as an image.
    htmlLabels: false, flowchart: { htmlLabels: false },
    themeVariables: {
      darkMode: true, background: gb.bg0, fontFamily, fontSize: '14px',
      primaryColor: gb.bg1, primaryTextColor: gb.fg1, primaryBorderColor: gb.fg3,
      secondaryColor: gb['bg0-hard'], secondaryTextColor: gb.fg1, secondaryBorderColor: gb.bg3,
      tertiaryColor: gb.bg0, tertiaryTextColor: gb.fg1, tertiaryBorderColor: gb.bg3,
      lineColor: gb.fg3, textColor: gb.fg1, mainBkg: gb.bg1, nodeBorder: gb.fg3,
      clusterBkg: gb['bg0-hard'], clusterBorder: gb.bg3, edgeLabelBackground: gb.bg0, titleColor: gb.fg1,
    },
  };
}

// Mermaid lays out in a real browser, so it runs in the Chromium the screenshot tooling already uses.
async function launchRenderer() {
  let bundle;
  try { bundle = createRequire(import.meta.url).resolve('mermaid/dist/mermaid.min.js'); }
  catch { throw new Error('Mermaid is not installed. Run "npm install"; it is a development dependency, never part of the site.'); }
  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  } catch (error) {
    throw new Error(`Chromium could not start. Run "npx playwright install chromium" on a supported host.\n${error.message}`);
  }
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><meta charset="utf-8"><title>diagrams</title><body></body>');
    await page.addScriptTag({ path: bundle });
    return {
      render: (diagram, config) => page.evaluate(async ({ key, source, config }) => {
        globalThis.mermaid.initialize(config);
        await document.fonts.ready;
        return (await globalThis.mermaid.render(`diagram-${key}`, source)).svg;
      }, { key: diagram.key, source: diagram.source, config }),
      close: () => browser.close(),
    };
  } catch (error) { await browser.close(); throw error; }
}

export async function runDiagrams(options, { launch = launchRenderer, log = console.log } = {}) {
  const state = await plan(options);
  const report = { ...state, drawn: [], failed: [], removed: [], passed: false };
  const where = diagram => `${diagram.key}.svg (${diagram.files.join(', ')})`;
  if (options.check) {
    for (const diagram of state.missing) log(`MISSING ${where(diagram)}`);
    for (const key of state.orphans) log(`ORPHAN ${key}.svg is no longer used by any page`);
    report.passed = state.missing.length === 0 && state.orphans.length === 0;
    log(report.passed ? `${state.diagrams.length} diagram(s), all drawn.` : 'Run "npm run diagrams" and commit the result.');
    return report;
  }
  const todo = options.all ? state.diagrams : state.missing;
  if (todo.length) {
    const config = mermaidConfig(await readFile(options.css, 'utf8'));
    const renderer = await launch(); // Before touching the folder: a missing browser changes nothing.
    await mkdir(options.out, { recursive: true });
    try {
      for (const diagram of todo) {
        try {
          const svg = await renderer.render(diagram, config);
          if (!/^<svg[\s>]/.test(svg)) throw new Error('Mermaid did not return an SVG.');
          await writeFile(path.join(options.out, `${diagram.key}.svg`), svg.endsWith('\n') ? svg : `${svg}\n`);
          report.drawn.push(diagram.key);
          log(`DRAWN ${where(diagram)}`);
        } catch (error) {
          report.failed.push({ key: diagram.key, files: diagram.files, message: error.message });
          log(`FAILED ${where(diagram)}: ${error.message.split('\n')[0]}`);
        }
      }
    } finally { await renderer.close(); }
  }
  // Remove only drawings this script names itself; anything else in the folder is someone's file.
  for (const key of state.orphans) {
    await unlink(path.join(options.out, `${key}.svg`));
    report.removed.push(key);
    log(`REMOVED ${key}.svg`);
  }
  report.passed = report.failed.length === 0;
  log(`${state.diagrams.length} diagram(s): ${report.drawn.length} drawn, ${state.diagrams.length - todo.length} unchanged, ${report.removed.length} removed, ${report.failed.length} failed.`);
  return report;
}

async function main() {
  const options = optionsFromArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: npm run diagrams -- [--check] [--all]\n\nDraws each ```mermaid fence in content/ to assets/images/diagrams/<key>.svg and removes drawings no page uses.\n  --check  report fences without a drawing and unused drawings; draws nothing, needs no browser\n  --all    redraw everything, for example after changing the palette or upgrading Mermaid\nRequires Node 20+, "npm install", and Chromium installed with: npx playwright install chromium');
    return;
  }
  const report = await runDiagrams(options);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
