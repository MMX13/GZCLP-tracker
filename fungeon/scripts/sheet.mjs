// Contact sheet: node scripts/sheet.mjs out.png a.png b.png ... (renders side by side at half size)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const [, , out, ...files] = process.argv;
const imgs = files.map((f) => `<img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:390px;margin:4px;vertical-align:top">`).join('');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: files.length * 398, height: 900 } });
await p.setContent(`<body style="margin:0;background:#888">${imgs}</body>`);
await p.screenshot({ path: out, fullPage: true });
await b.close();
