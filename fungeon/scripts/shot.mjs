// Screenshot helper: node scripts/shot.mjs <url-or-file> <out.png> [width] [height]
// Uses the pre-installed Chromium. Prints console errors from the page.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const [, , target, outFile = 'shot.png', w = '390', h = '844'] = process.argv;
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
page.on('console', (m) => m.type() === 'error' && console.log('console error:', m.text()));
page.on('pageerror', (e) => console.log('page error:', e.message));
const url = /^https?:|^file:/.test(target) ? target : `file://${new URL(target, `file://${process.cwd()}/`).pathname}`;
await page.goto(url);
await page.waitForTimeout(800);
await page.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log('saved', outFile);
