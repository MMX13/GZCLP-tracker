// Layout checks: hand fan with 5 and 10 cards at 360x640 and 390x844 (uses ?dev cheat hook).
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '/tmp/claude-0/ui2';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[360, 640], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:4173/?dev'); await page.waitForTimeout(500);
  await page.locator('[data-testid="new-run"]').tap({ force: true });
  await page.locator('[data-testid="start-run"]').tap({ force: true }); await page.waitForTimeout(400);
  await page.locator('.node.selectable').first().tap({ force: true }); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/hand5-${w}.png` });
  await page.evaluate(() => window.__fg.cheat((r) => { const c = r.screen.combat; c.hand.push(...c.draw.splice(0), ...c.discard.splice(0)); }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/hand${await page.locator('[data-testid^="card-"]').count()}-${w}.png` });
  const xs = await page.$$eval('.hand-slot', (els) => els.map((e) => e.getBoundingClientRect()).map((r) => [Math.round(r.left), Math.round(r.right)]));
  console.log(w, 'hand extents', xs[0], xs[xs.length - 1]);
  await ctx.close();
}
await browser.close();
