import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(400);
for (const [b, n] of [['new-run','newrun'],['btn-howto','howto'],['btn-settings','settings'],['btn-stats','stats'],['btn-compendium','comp']]) {
  await page.locator(`[data-testid="${b}"]`).tap(); await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/claude-0/m-${n}.png` });
  await page.locator('[data-testid="sheet-close"]').tap(); await page.waitForTimeout(200);
}
await browser.close();
