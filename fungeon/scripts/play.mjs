// Drives the real game through the UI with Playwright and screenshots each screen kind once.
// Usage: node scripts/play.mjs [url] [outDir] [maxSteps]   (needs `node build.mjs` and `node scripts/serve.mjs` first)
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
const [, , url = 'http://localhost:4173/', out = '/tmp/claude-0', maxSteps = '400'] = process.argv;
mkdirSync(out, { recursive: true });
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe });
const VW = +(process.env.VW ?? 390), VH = +(process.env.VH ?? 844);
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
page.on('console', (m) => m.type() === 'error' && !/ERR_CERT|404|Failed to load/.test(m.text()) && console.log('console error:', m.text()));
await page.goto(url);
await page.waitForTimeout(500);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}${VW === 390 ? '' : '-' + VW}.png` }); console.log('shot', name); };
const seen = new Set();
const once = async (name) => { if (!seen.has(name)) { seen.add(name); await shot(name); } };
const tid = (id) => page.locator(`[data-testid="${id}"]`);
const kind = () => page.locator('.app').getAttribute('data-screen');
const settle = async () => { for (let i = 0; i < 60; i++) { if (!(await tid('skip').count())) return; await page.waitForTimeout(120); } };

await once('01-title');
await tid('new-run').tap({ force: true });
await page.waitForTimeout(300);
await once('02-newrun');
await tid('start-run').tap({ force: true });
await page.waitForTimeout(600);

let combats = 0;
for (let step = 0; step < +maxSteps; step++) {
  await settle();
  const k = await kind();
  if (k === 'title' || k === 'victory' || k === 'defeat') { await once(`end-${k}`); break; }
  if (k === 'map') {
    await once('03-map');
    const n = page.locator('.node.selectable').first();
    if (!(await n.count())) { console.log('no selectable node'); break; }
    await n.tap({ force: true });
  } else if (k === 'combat') {
    if (!seen.has('combat')) { seen.add('combat'); await page.waitForTimeout(800); await shot('04-combat'); }
    if (await page.locator('[data-testid^="plot-"].full').count()) await once('05b-garden');
    if (await page.locator('.enemy .status').count()) await once('05c-enemy-status');
    if (await page.locator('.pip .status').count()) await once('05d-pip-status');
    const cards = page.locator('[data-testid^="card-"][data-playable="1"]');
    if (await tid('pending').count()) {
      await once('pending');
      const c = page.locator('[data-testid^="pc-"]').first();
      if (await c.count()) await c.tap({ force: true });
      await tid('pending-confirm').tap({ force: true });
    } else if (await cards.count()) {
      const c = cards.first();
      await c.tap({ force: true });
      await page.waitForTimeout(250);
      await once('05-selected');
      await c.tap({ force: true });
      await page.waitForTimeout(150);
      const en = page.locator('[data-enemy-uid].targetable').first();
      if (await en.count()) { await once('06-target'); await en.tap({ force: true }); }
    } else {
      combats++;
      await tid('end-turn').tap({ force: true });
    }
  } else if (k === 'reward') {
    await once('07-reward');
    const cardRow = page.locator('[data-testid^="reward-"]:not([data-testid^="reward-card"])');
    const cnt = await cardRow.count();
    let handled = false;
    for (let i = 0; i < cnt; i++) {
      const r = cardRow.nth(i);
      const t = await r.innerText();
      await r.tap({ force: true });
      await page.waitForTimeout(250);
      if (await tid('card-reward').count()) {
        await once('08-cardreward');
        await tid('reward-card-0').tap({ force: true });
        await tid('card-take').tap({ force: true });
      }
      handled = true;
      break;
    }
    if (!handled) await tid('proceed').tap({ force: true });
  } else if (k === 'rest') {
    await once('09-rest');
    if (await tid('rest-heal').count()) await tid('rest-heal').tap({ force: true }); else await tid('proceed').tap({ force: true });
  } else if (k === 'shop') { await once('10-shop'); await tid('proceed').tap({ force: true }); }
  else if (k === 'event') {
    await once('11-event');
    const c = page.locator('[data-testid^="event-choice-"]:not([disabled])').first();
    await c.tap({ force: true });
  } else if (k === 'treasure') {
    await once('12-treasure');
    if (await tid('treasure-chest').isEnabled()) await tid('treasure-chest').tap({ force: true }); else { await once('12b-treasure-open'); await tid('proceed').tap({ force: true }); }
  } else if (k === 'bossRelic') { await once('13-bossrelic'); await page.locator('[data-testid^="boss-relic-"]').first().tap({ force: true }); await tid('boss-relic-take').tap({ force: true }); }
  else if (k === 'cardSelect') {
    await once('14-cardselect');
    await page.locator('[data-testid^="cs-"]').first().tap({ force: true });
    await page.waitForTimeout(200);
    await once('14b-cardselect-picked');
    await tid('select-confirm').tap({ force: true });
  } else { console.log('unknown screen', k); break; }
  await page.waitForTimeout(150);
}
console.log('done; errors:', errors.length);
await browser.close();
