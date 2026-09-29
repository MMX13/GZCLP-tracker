// Loads saved-run scenes (from scripts/mkscenes.ts) into the app and screenshots them.
// node scripts/scenes.mjs [scenes.json] [outDir] [w] [h]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const [, , file = '/tmp/claude-0/scenes.json', out = '/tmp/claude-0', w = '390', h = '844'] = process.argv;
const scenes = JSON.parse(readFileSync(file, 'utf8'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, save] of Object.entries(scenes)) {
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript((s) => { localStorage.setItem('fungeon.run.v1', s); }, save);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(name, 'PAGE ERROR', e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="continue"]').tap({ force: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/s-${name}${w === '390' ? '' : '-' + w}.png` });
  console.log('shot', name);
  await ctx.close();
}
await browser.close();
