// Optional real-browser QA: npm run test:images (requires Playwright Chromium).
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { startPreview, measureOverflow } from '../scripts/screenshots.mjs';

const article = '/2024/12/02/readdatawithharlequin/';
const headers = await readFile(new URL('../static/_headers', import.meta.url), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const engineName = process.env.IMAGE_TEST_BROWSER || 'chromium';
const engine = { chromium, webkit }[engineName];
if (!engine) throw new Error('IMAGE_TEST_BROWSER must be chromium or webkit');
let preview, browser;
before(async () => {
    preview = await startPreview({ port: Number(process.env.IMAGE_TEST_PORT || 1321), drafts: false });
    try {
        browser = await engine.launch({
            ...(engineName === 'chromium' && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
        });
    } catch (error) { await preview.stop(); throw error; }
});
after(async () => { try { await browser?.close(); } finally { await preview?.stop(); } });

async function context(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
    // Hugo preview doesn't apply Cloudflare headers. Exercise the real CSP too.
    await context.route('**/*', async route => {
        if (route.request().resourceType() === 'document') {
            const response = await route.fetch();
            await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
        } else await route.continue();
    });
    return context;
}

async function open(page, index = 0, action = 'keyboard') {
    const link = page.locator('.image-fullsize').nth(index);
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    const saved = await page.evaluate(() => ({ url: location.href, history: history.length, x: scrollX, y: scrollY }));
    if (action === 'touch') await link.tap();
    else if (action === 'click') await link.click();
    else await page.keyboard.press('Enter');
    await page.waitForSelector('.image-viewer[open]');
    await page.waitForFunction(() => !document.querySelector('.image-viewer-zoom').disabled);
    return { link, saved };
}

async function restored(page, link, saved) {
    await page.waitForSelector('.image-viewer', { state: 'detached' });
    const state = await page.evaluate(() => ({ url: location.href, history: history.length, x: scrollX, y: scrollY, locked: document.documentElement.classList.contains('image-viewing') }));
    assert.equal(state.url, saved.url);
    assert.equal(state.history, saved.history);
    assert.equal(state.locked, false);
    assert.ok(Math.abs(state.x - saved.x) < 1);
    assert.ok(Math.abs(state.y - saved.y) < 1);
    assert.ok(await link.evaluate(element => element === document.activeElement));
}

for (const width of [320, 390, 768, 1440]) {
    test(`${width}px: keyboard/touch open, fit/actual size, focus containment, Escape and scroll restoration`, async () => {
        const ctx = await context({ viewport: { width, height: width < 768 ? 844 : 1000 }, isMobile: width < 768, hasTouch: width < 768 });
        try {
            const page = await ctx.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
            await page.goto(new URL(article, preview.baseURL).href, { waitUntil: 'networkidle' });
            assert.equal(await page.locator('.image-viewer').count(), 0); // No dormant image fetch/DOM.
            const { link, saved } = await open(page, 1, width < 768 ? 'touch' : 'keyboard');
            const image = page.locator('.image-viewer img');
            assert.equal(await image.getAttribute('src'), new URL(await link.getAttribute('href'), preview.baseURL).href);
            const fit = await image.evaluate(element => {
                const rect = element.getBoundingClientRect(), area = element.parentElement.getBoundingClientRect();
                return { w: rect.width, h: rect.height, areaW: area.width, areaH: area.height, ratio: element.naturalWidth / element.naturalHeight };
            });
            assert.ok(fit.w > 0 && fit.h > 0);
            assert.ok(fit.w <= fit.areaW + 1 && fit.h <= fit.areaH + 1);
            assert.ok(Math.abs(fit.w / fit.h - fit.ratio) < 0.01);
            assert.equal((await page.evaluate(measureOverflow)).pixels, 0);
            assert.ok(await page.locator('.image-viewer-close').evaluate(element => element === document.activeElement));
            for (const key of ['Tab', 'Shift+Tab']) for (let n = 0; n < 5; n++) {
                await page.keyboard.press(key);
                assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('.image-viewer'))));
            }
            for (const button of await page.locator('.image-viewer button').all()) {
                const box = await button.boundingBox();
                assert.ok(box.height >= 44 && box.width >= 44);
            }
            if (process.env.IMAGE_VIEWER_SCREENSHOTS && (width === 390 || width === 1440)) {
                await mkdir(process.env.IMAGE_VIEWER_SCREENSHOTS, { recursive: true });
                await page.screenshot({ path: path.join(process.env.IMAGE_VIEWER_SCREENSHOTS, `image-modal-${engineName}-${width}.png`) });
            }
            await page.getByRole('button', { name: 'Actual size (1:1)', exact: true }).click();
            const actual = await image.evaluate(element => ({ w: element.getBoundingClientRect().width, natural: element.naturalWidth }));
            assert.equal(actual.w, actual.natural);
            assert.equal(await page.locator('.image-viewer-zoom').getAttribute('aria-pressed'), 'true');
            const canvas = page.locator('.image-viewer-canvas');
            await canvas.focus();
            const overflow = await canvas.evaluate(element => ({ x: element.scrollWidth > element.clientWidth, y: element.scrollHeight > element.clientHeight }));
            if (overflow.x) {
                await page.keyboard.press('ArrowRight');
                await page.waitForFunction(() => document.querySelector('.image-viewer-canvas').scrollLeft > 0);
            } else if (overflow.y) {
                await page.keyboard.press('ArrowDown');
                await page.waitForFunction(() => document.querySelector('.image-viewer-canvas').scrollTop > 0);
            }
            await page.getByRole('button', { name: 'Actual size (1:1)', exact: true }).click();
            assert.equal(await canvas.getAttribute('tabindex'), '-1');
            await page.keyboard.press('Escape');
            await restored(page, link, saved);
            assert.deepEqual(errors, []); // Includes CSP/integrity violations.
        } finally { await ctx.close(); }
    });
}

test('close button, backdrop, image clicks and repeated opening do not navigate', async () => {
    const ctx = await context();
    try {
        const page = await ctx.newPage();
        await page.goto(new URL(article, preview.baseURL).href, { waitUntil: 'networkidle' });
        let opened = await open(page, 0, 'click');
        await page.locator('.image-viewer img').click();
        assert.equal(await page.locator('.image-viewer[open]').count(), 1);
        await page.getByRole('button', { name: 'Close image viewer' }).click();
        await restored(page, opened.link, opened.saved);
        opened = await open(page, 0, 'click');
        await page.mouse.click(2, 2);
        await restored(page, opened.link, opened.saved);
        opened = await open(page, 0, 'click');
        const bounds = await page.locator('.image-viewer-canvas').boundingBox();
        await page.mouse.click(bounds.x + 1, bounds.y + 1); // Empty inner backdrop.
        await restored(page, opened.link, opened.saved);
    } finally { await ctx.close(); }
});

test('image load failure retains an accessible close action and original link', async () => {
    const ctx = await context();
    try {
        const page = await ctx.newPage();
        await page.goto(new URL(article, preview.baseURL).href, { waitUntil: 'networkidle' });
        const link = page.locator('.image-fullsize').first();
        const url = new URL(await link.getAttribute('href'), preview.baseURL).href;
        await page.route(url, route => route.abort());
        await link.click();
        await page.waitForFunction(() => document.querySelector('.image-viewer-status')?.textContent === 'Image could not load.');
        assert.equal(await page.locator('.image-viewer-original').getAttribute('href'), url);
        assert.equal(await page.locator('.image-viewer-original').getAttribute('target'), '_blank');
        await page.keyboard.press('Escape');
        await page.waitForSelector('.image-viewer', { state: 'detached' });
        assert.ok(await link.evaluate(element => element === document.activeElement));
    } finally { await ctx.close(); }
});

for (const fallback of ['no JavaScript', 'no native dialog support']) {
    test(`${fallback}: original image link remains navigable`, async () => {
        const ctx = await context({ javaScriptEnabled: fallback !== 'no JavaScript' });
        try {
            if (fallback === 'no native dialog support') await ctx.addInitScript(() => { HTMLDialogElement.prototype.showModal = undefined; });
            const page = await ctx.newPage();
            await page.goto(new URL(article, preview.baseURL).href, { waitUntil: 'networkidle' });
            const link = page.locator('.image-fullsize').first();
            assert.equal(await link.getAttribute('aria-haspopup'), null);
            const url = new URL(await link.getAttribute('href'), preview.baseURL).href;
            await Promise.all([page.waitForURL(url), link.click()]);
        } finally { await ctx.close(); }
    });
}

test('modified clicks are not swallowed by the modal', async () => {
    const ctx = await context();
    try {
        const page = await ctx.newPage();
        await page.goto(new URL(article, preview.baseURL).href, { waitUntil: 'networkidle' });
        const link = page.locator('.image-fullsize').first();
        // Inspect cancellation directly; headless native Cmd-click tab handling
        // differs across hosts. Prevent navigation only after the app handler ran.
        const swallowed = await link.evaluate(element => ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'].map(key => {
            let result;
            element.addEventListener('click', event => {
                result = event.defaultPrevented;
                event.preventDefault();
            }, { once: true });
            element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, [key]: true }));
            return result;
        }));
        assert.deepEqual(swallowed, [false, false, false, false]);
        assert.equal(await page.locator('.image-viewer').count(), 0);
    } finally { await ctx.close(); }
});
