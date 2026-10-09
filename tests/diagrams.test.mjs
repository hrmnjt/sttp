import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  diagramKey, findDiagrams, mermaidConfig, normalise, optionsFromArgs, plan, runDiagrams,
} from '../scripts/diagrams.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLOW = 'flowchart LR\n    A --> B';
// sha256(FLOW)[:16]. tests/test_site.py derives the same key and checks Hugo finds the file.
const FLOW_KEY = 'd493232efc3c3445';

async function workspace(t, pages = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sttp-diagram-tests-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const content = path.join(directory, 'content');
  const out = path.join(directory, 'diagrams');
  for (const [name, text] of Object.entries(pages)) {
    await mkdir(path.dirname(path.join(content, name)), { recursive: true });
    await writeFile(path.join(content, name), text);
  }
  await mkdir(content, { recursive: true });
  return { content, out, css: path.join(ROOT, 'assets/css/main.css'), check: false, all: false };
}

function fakeRenderer({ fail } = {}) {
  const state = { launched: 0, rendered: [], closed: 0 };
  const launch = async () => {
    state.launched++;
    return {
      render: async (diagram, config) => {
        state.rendered.push({ key: diagram.key, config });
        if (fail?.(diagram)) throw new Error('Parse error on line 1\nmore detail');
        return `<svg viewBox="0 0 10 10"><text>${diagram.key}</text></svg>`;
      },
      close: async () => { state.closed++; },
    };
  };
  return { state, launch };
}

test('finds mermaid fences and nothing that only mentions one', () => {
  const markdown = [
    'Intro.', '', '```mermaid', 'flowchart LR', '    A --> B', '```', '',
    '~~~Mermaid {alt="tilde fence, attributes, capitals"}', 'graph TD', '~~~', '',
    '````markdown', 'How to write one:', '```mermaid', 'flowchart LR', '    quoted --> only', '```', '````', '',
    '```python', 'print("```mermaid")', '```', '',
    '- a list item', '', '  ```mermaid', '  sequenceDiagram', '      A->>B: hi', '  ```', '',
    'Inline `` ```mermaid `` is prose.',
  ].join('\n');
  assert.deepEqual(findDiagrams(markdown), [FLOW, 'graph TD', 'sequenceDiagram\n    A->>B: hi']);
});

test('an unclosed fence runs to the end of the document', () => {
  assert.deepEqual(findDiagrams('```mermaid\nflowchart LR\n    A --> B\n\n'), [FLOW]);
});

test('the key ignores line endings and trailing whitespace, and nothing else', () => {
  assert.equal(diagramKey(FLOW), FLOW_KEY);
  assert.equal(diagramKey('flowchart LR\r\n    A --> B\r\n\r\n  '), FLOW_KEY);
  assert.equal(normalise(`${FLOW}\n\t \n`), FLOW);
  assert.notEqual(diagramKey('flowchart LR\n  A --> B'), FLOW_KEY); // Indentation is source.
  assert.match(diagramKey(''), /^[0-9a-f]{16}$/);
});

test('the repository content is found the way Hugo sees it', async () => {
  const rfd = await readFile(path.join(ROOT, 'content/shards/2026-02-08-rfd.md'), 'utf8');
  const diagrams = findDiagrams(rfd);
  assert.equal(diagrams.length, 1); // The RFD template quoted in a markdown fence has none.
  assert.ok(diagrams[0].startsWith('flowchart TD\n'));
});

test('plan compares what pages ask for with what is drawn', async t => {
  const options = await workspace(t, {
    'shards/a.md': `Text\n\n\`\`\`mermaid\n${FLOW}\n\`\`\`\n`,
    'builds/b.md': `\`\`\`mermaid\n${FLOW}\n\`\`\`\n\n\`\`\`mermaid\ngraph TD\n\`\`\`\n`,
    'notes.txt': '```mermaid\nignored\n```\n',
  });
  let state = await plan(options); // No output folder yet.
  assert.deepEqual(new Set(state.diagrams.map(diagram => diagram.key)), new Set([FLOW_KEY, diagramKey('graph TD')]));
  assert.deepEqual(state.diagrams.find(diagram => diagram.key === FLOW_KEY).files, ['builds/b.md', 'shards/a.md']);
  assert.equal(state.missing.length, 2);
  assert.deepEqual(state.orphans, []);
  await mkdir(options.out);
  await writeFile(path.join(options.out, `${FLOW_KEY}.svg`), '<svg/>');
  await writeFile(path.join(options.out, '0123456789abcdef.svg'), '<svg/>');
  await writeFile(path.join(options.out, 'hand-drawn.svg'), '<svg/>');
  state = await plan(options);
  assert.deepEqual(state.missing.map(diagram => diagram.key), [diagramKey('graph TD')]);
  assert.deepEqual(state.orphans, ['0123456789abcdef']); // Never a file this script did not name.
});

test('check mode reports and never draws', async t => {
  const options = { ...await workspace(t, { 'a.md': `\`\`\`mermaid\n${FLOW}\n\`\`\`\n` }), check: true };
  const renderer = fakeRenderer();
  const lines = [];
  let report = await runDiagrams(options, { launch: renderer.launch, log: line => lines.push(line) });
  assert.equal(report.passed, false);
  assert.equal(renderer.state.launched, 0);
  assert.ok(lines.some(line => line.startsWith(`MISSING ${FLOW_KEY}.svg (a.md)`)));
  await mkdir(options.out);
  await writeFile(path.join(options.out, `${FLOW_KEY}.svg`), '<svg/>');
  report = await runDiagrams(options, { launch: renderer.launch, log() {} });
  assert.equal(report.passed, true);
  await writeFile(path.join(options.out, 'fedcba9876543210.svg'), '<svg/>');
  report = await runDiagrams(options, { launch: renderer.launch, log() {} });
  assert.equal(report.passed, false); // An unused drawing is stale too.
  assert.deepEqual((await readdir(options.out)).sort(), [`${FLOW_KEY}.svg`, 'fedcba9876543210.svg'].sort());
  assert.equal(renderer.state.launched, 0);
});

test('draws what is missing, keeps what is current, and removes only its own unused files', async t => {
  const options = await workspace(t, { 'a.md': `\`\`\`mermaid\n${FLOW}\n\`\`\`\n\n\`\`\`mermaid\ngraph TD\n\`\`\`\n` });
  await mkdir(options.out);
  await writeFile(path.join(options.out, `${FLOW_KEY}.svg`), 'already drawn');
  await writeFile(path.join(options.out, '0123456789abcdef.svg'), 'stale');
  await writeFile(path.join(options.out, 'hand-drawn.svg'), 'mine');
  const renderer = fakeRenderer();
  const report = await runDiagrams(options, { launch: renderer.launch, log() {} });
  const other = diagramKey('graph TD');
  assert.equal(report.passed, true);
  assert.deepEqual(report.drawn, [other]);
  assert.deepEqual(report.removed, ['0123456789abcdef']);
  assert.deepEqual((await readdir(options.out)).sort(), [`${FLOW_KEY}.svg`, `${other}.svg`, 'hand-drawn.svg'].sort());
  assert.equal(await readFile(path.join(options.out, `${FLOW_KEY}.svg`), 'utf8'), 'already drawn');
  assert.ok((await readFile(path.join(options.out, `${other}.svg`), 'utf8')).endsWith('</svg>\n'));
  assert.deepEqual([renderer.state.launched, renderer.state.closed], [1, 1]);
  // Nothing left to do: the browser is not started at all.
  const again = fakeRenderer();
  await runDiagrams(options, { launch: again.launch, log() {} });
  assert.equal(again.state.launched, 0);
  // --all redraws everything, for a new palette or a Mermaid upgrade.
  const all = fakeRenderer();
  await runDiagrams({ ...options, all: true }, { launch: all.launch, log() {} });
  assert.equal(all.state.rendered.length, 2);
  assert.notEqual(await readFile(path.join(options.out, `${FLOW_KEY}.svg`), 'utf8'), 'already drawn');
});

test('a diagram that does not parse fails the run without stopping the others', async t => {
  const options = await workspace(t, { 'a.md': `\`\`\`mermaid\n${FLOW}\n\`\`\`\n\n\`\`\`mermaid\nnot a diagram\n\`\`\`\n` });
  const renderer = fakeRenderer({ fail: diagram => diagram.source === 'not a diagram' });
  const lines = [];
  const report = await runDiagrams(options, { launch: renderer.launch, log: line => lines.push(line) });
  assert.equal(report.passed, false);
  assert.deepEqual(report.drawn, [FLOW_KEY]);
  assert.deepEqual(report.failed.map(failure => failure.files), [['a.md']]);
  assert.ok(lines.some(line => /^FAILED .*a\.md\): Parse error on line 1$/.test(line)));
  assert.equal(renderer.state.closed, 1);
  assert.deepEqual(await readdir(options.out), [`${FLOW_KEY}.svg`]);
});

test('diagrams take their colours and type from the stylesheet', async () => {
  const css = await readFile(path.join(ROOT, 'assets/css/main.css'), 'utf8');
  const config = mermaidConfig(css);
  const token = name => css.match(new RegExp(`--gb-${name}: (#[0-9a-f]{6});`))[1];
  assert.equal(config.themeVariables.background, token('bg0'));
  assert.equal(config.themeVariables.primaryTextColor, token('fg1'));
  assert.equal(config.themeVariables.lineColor, token('fg3'));
  assert.ok(config.fontFamily.startsWith('ui-monospace'));
  assert.equal(config.securityLevel, 'strict');
  assert.equal(config.flowchart.htmlLabels, false); // Shown as an image: SVG text only.
  assert.throws(() => mermaidConfig(':root { --gb-bg0: #282828; }'), /no longer defines --gb-/);
});

test('options', () => {
  const options = optionsFromArgs(['--check']);
  assert.equal(options.check, true);
  assert.equal(options.out, path.join(ROOT, 'assets/images/diagrams'));
  assert.equal(options.content, path.join(ROOT, 'content'));
  assert.throws(() => optionsFromArgs(['--check', '--all']), /cannot be combined/);
});
