// node scripts/gallery-shot.mjs out.png [scrollY] [height] [width]  -- screenshots a slice of the gallery
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const [, , out = 'g.png', y = '0', h = '1000', w = '1000'] = process.argv;
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5 });
p.on('pageerror', (e) => console.log('page error:', e.message));
await p.goto('file://' + new URL('../dist-gallery/gallery.html', import.meta.url).pathname);
await p.waitForTimeout(500);
await p.evaluate((yy) => window.scrollTo(0, yy), +y);
await p.waitForTimeout(100);
await p.screenshot({ path: out });
await b.close();
