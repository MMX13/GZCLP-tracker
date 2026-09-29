// Captures mid-animation frames of a card play and an enemy turn.
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '/tmp/claude-0';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(400);
const t = (id) => page.locator(`[data-testid="${id}"]`);
await t('new-run').tap({ force: true }); await t('start-run').tap({ force: true }); await page.waitForTimeout(400);
await page.locator('.node.selectable').first().tap({ force: true }); await page.waitForTimeout(900);
const card = page.locator('[data-testid^="card-"][data-card="bonk"]').first();
await card.tap({ force: true }); await page.waitForTimeout(200);
await card.tap({ force: true });
const en = page.locator('[data-enemy-uid].targetable').first();
if (await en.count()) await en.tap({ force: true });
for (const ms of [120, 200, 250]) { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}/a-play-${ms}.png` }); }
await page.waitForTimeout(1200);
await t('end-turn').tap({ force: true });
for (const ms of [300, 300, 300, 400]) { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}/a-enemy-${ms}-${Date.now() % 1000}.png` }); }
await browser.close();
