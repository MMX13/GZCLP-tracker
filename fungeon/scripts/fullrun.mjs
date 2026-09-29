// Plays a REAL full run (3 acts) through the UI using the ?dev cheat hook (enemy hp -> 1, player healed).
// node scripts/fullrun.mjs [outDir]   (needs node build.mjs + scripts/serve.mjs)
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '/tmp/claude-0/full';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const VW = +(process.env.VW ?? 390), VH = +(process.env.VH ?? 844);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
  if (!localStorage.getItem('fungeon.profile.v1')) localStorage.setItem('fungeon.profile.v1', JSON.stringify({ unlocked: 0, settings: { sfx: true, music: true, speed: 'fast', reduceMotion: false } }));
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:4173/?dev'); await page.waitForTimeout(500);
const t = (id) => page.locator(`[data-testid="${id}"]`);
const kind = () => page.locator('.app').getAttribute('data-screen');
const seen = new Set();
const shot = async (n) => { if (!seen.has(n)) { seen.add(n); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); } };
const settle = async () => { for (let i = 0; i < 80; i++) { if (!(await t('skip').count())) return; await page.waitForTimeout(100); } };
await t('new-run').tap({ force: true }); await t('start-run').tap({ force: true }); await page.waitForTimeout(500);
let combatSteps = 0, lastAct = 0, rewardTries = 0;
for (let step = 0; step < 3000; step++) {
  await settle();
  const k = await kind();
  if (k !== 'reward') rewardTries = 0;
  if (k !== 'combat') combatSteps = 0;
  if (k === 'title') break;
  if (step % 25 === 0) console.log('step', step, k, JSON.stringify(await page.evaluate(() => { const r = window.__fg?.run; return r && { act: r.act, floor: r.floor, hp: r.hp, scr: r.screen.kind, en: r.screen.combat?.enemies.map((e) => e.id + ':' + e.hp + (e.alive ? '' : 'x')), hand: r.screen.combat?.hand.length, pend: !!r.screen.combat?.pending, ph: r.screen.combat?.phase }; })));
  const info = await page.evaluate(() => { const r = window.__fg?.run; return r ? { act: r.act, floor: r.floor } : null; });
  if (k === 'map') {
    if (info && info.act !== lastAct) { lastAct = info.act; await page.waitForTimeout(300); await shot(`map-act${info.act}`); await page.evaluate(() => document.querySelector('.map-scroll').scrollTo(0, 0)); await page.waitForTimeout(150); await shot(`map-act${info.act}-top`); }
    await page.locator('.node.selectable').first().tap({ force: true });
  } else if (k === 'combat') {
    if (++combatSteps === 60) { await page.screenshot({ path: `${out}/stuck-combat.png` }); (await import('node:fs')).writeFileSync(`${out}/stuck-save.json`, JSON.stringify({ stuck: await page.evaluate(() => localStorage.getItem('fungeon.run.v1')) })); console.log('STUCK', JSON.stringify(await page.$$eval('.hand-slot', (e) => e.map((x) => x.dataset.card + ':' + x.dataset.playable))), await page.locator('.app').innerText().then((x) => x.replace(/\n/g, '|').slice(0, 400))); break; }
    await page.evaluate(() => window.__fg.cheat((r) => { const c = r.screen.combat; if (!c) return; c.enemies.forEach((e) => { e.hp = Math.min(e.hp, 1); }); c.player.hp = c.player.maxHp; c.player.block = 50; }));
    await page.waitForTimeout(100);
    if (await t('proceed').count()) { await t('proceed').tap({ force: true }); continue; }
    if (await t('pending').count()) {
      await shot('pending-real');
      const c = page.locator('[data-testid^="pc-"]').first(); if (await c.count()) await c.tap({ force: true });
      await t('pending-confirm').tap({ force: true }); continue;
    }
    const cards = page.locator('[data-testid^="card-"][data-playable="1"]');
    if (await cards.count()) {
      const c = cards.first(); await c.tap({ force: true, position: { x: 14, y: 60 } }); await page.waitForTimeout(150); await c.tap({ force: true, position: { x: 14, y: 60 } }); await page.waitForTimeout(150);
      const en = page.locator('[data-enemy-uid].targetable').first(); if (await en.count()) await en.tap({ force: true });
    } else await t('end-turn').tap({ force: true });
  } else if (k === 'reward') {
    await shot(`reward-act${info?.act}`);
    rewardTries++;
    if (await t('card-reward').count()) { await t('reward-card-0').tap({ force: true }); await t('card-take').tap({ force: true }); continue; }
    const rows = page.locator('[data-testid^="reward-"]:not([data-testid^="reward-card"]):not(.blocked)');
    if ((await rows.count()) && rewardTries < 8) {
      await rows.first().tap({ force: true }); await page.waitForTimeout(250);
      if (await t('card-reward').count()) { await shot('cardreward'); await t('reward-card-0').tap({ force: true }); await t('card-take').tap({ force: true }); }
    } else { if (await page.locator('.loot.blocked').count()) await shot('reward-brews-full'); await t('proceed').tap({ force: true }); rewardTries = 0; }
  } else if (k === 'rest') {
    if ((await t('rest-heal').count()) && (await t('rest-heal').isEnabled())) await t('rest-heal').tap({ force: true });
    else if ((await t('rest-upgrade').count()) && (await t('rest-upgrade').isEnabled())) await t('rest-upgrade').tap({ force: true });
    else await t('proceed').tap({ force: true });
    await page.waitForTimeout(200);
    if ((await kind()) === 'rest' && (await t('proceed').count())) await t('proceed').tap({ force: true });
  }
  else if (k === 'shop') await t('proceed').tap({ force: true });
  else if (k === 'event') await page.locator('[data-testid^="event-choice-"]:not([disabled])').first().tap({ force: true });
  else if (k === 'treasure') { if (await t('treasure-chest').isEnabled()) await t('treasure-chest').tap({ force: true }); else await t('proceed').tap({ force: true }); }
  else if (k === 'bossRelic') { await shot(`bossrelic-act${info?.act}`); await page.locator('[data-testid^="boss-relic-"]').first().tap({ force: true }); await t('boss-relic-take').tap({ force: true }); }
  else if (k === 'cardSelect') { await page.locator('[data-testid^="cs-"]').first().tap({ force: true }); await t('select-confirm').tap({ force: true }); }
  else if (k === 'victory') {
    await page.waitForTimeout(600); await shot('victory');
    console.log('stats', await page.locator('.stats-list').innerText().then((s) => s.replace(/\n/g, ' ')));
    await t('to-title').tap({ force: true }); break;
  } else if (k === 'defeat') { await shot('defeat'); console.log('DEFEAT'); await t('to-title').tap({ force: true }); break; }
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400); await shot('title-after');
await t('new-run').tap({ force: true }); await page.waitForTimeout(300);
console.log('blight level shown:', await t('blight-level').innerText(), 'profile:', await page.evaluate(() => localStorage.getItem('fungeon.profile.v1')));
await shot('newrun-after');
await browser.close();
