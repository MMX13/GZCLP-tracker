// Tests drag-to-play, long-press zoom, status/relic tooltips, deck sheet with mouse pointer events.
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '/tmp/claude-0';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(400);
const t = (id) => page.locator(`[data-testid="${id}"]`);
await t('new-run').click(); await t('start-run').click({ force: true }); await page.waitForTimeout(400);
await page.locator('.node.selectable').first().click({ force: true }); await page.waitForTimeout(900);
const box = async (loc) => (await loc.boundingBox());
// long press
let card = page.locator('[data-testid^="card-"][data-card="cap_up"]').first();
let b = await box(card);
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/d-zoom.png` });
await page.mouse.up();
await t('sheet-close').click(); await page.waitForTimeout(200);
// drag untargeted
b = await box(card);
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
await page.mouse.move(b.x + b.width / 2, b.y - 150, { steps: 8 }); await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/d-drag.png` });
await page.mouse.up(); await page.waitForTimeout(1200);
console.log('block after cap up:', await page.locator('.pip .hpbar-block').count());
// drag targeted onto enemy
card = page.locator('[data-testid^="card-"][data-card="bonk"]').first();
b = await box(card);
const e = await box(page.locator('[data-enemy-uid]').first());
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2, { steps: 10 }); await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/d-drag-target.png` });
await page.mouse.up(); await page.waitForTimeout(1500);
console.log('enemy hp:', await page.locator('[data-enemy-uid] .hpbar-text').first().innerText());
// tooltips
await page.locator('[data-enemy-uid]').first().click(); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/d-tip-enemy.png` });
await page.mouse.click(5, 400);
await page.locator('.intent-btn').first().click(); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/d-tip-intent.png` });
await page.mouse.click(5, 400);
await page.locator('[data-testid^="relic-"]').first().click(); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/d-tip-relic.png` });
await page.mouse.click(5, 400);
await t('deck-btn').click(); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/d-deck.png` });
await t('sheet-close').click();
await t('pile-discard').click(); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/d-discard.png` });
await browser.close();
