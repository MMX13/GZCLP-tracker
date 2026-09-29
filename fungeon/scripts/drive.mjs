// Step-by-step manual play: node scripts/drive.mjs <cmd>...  (persistent profile keeps the saved run between calls)
// cmds: tap:<testid> | tapsel:<css> | wait:<ms> | shot:<name> | text | reset | url:<url>
import { chromium } from 'playwright-core';
const profile = '/tmp/claude-0/pw-profile';
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: '/opt/pw-browsers/chromium', viewport: { width: +(process.env.VW ?? 390), height: +(process.env.VH ?? 844) },
  deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block',
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(process.env.URL ?? 'http://localhost:4173/');
await page.waitForTimeout(700);
for (const c of process.argv.slice(2)) {
  const [cmd, ...r] = c.split(':'); const arg = r.join(':');
  if (cmd === 'tap') await page.locator(`[data-testid="${arg}"]`).first().tap({ force: true });
  else if (cmd === 'tapsel') await page.locator(arg).first().tap({ force: true });
  else if (cmd === 'wait') await page.waitForTimeout(+arg);
  else if (cmd === 'shot') await page.screenshot({ path: `/tmp/claude-0/${arg}.png` });
  else if (cmd === 'reset') { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  else if (cmd === 'text') console.log((await page.locator('.app').innerText()).replace(/\n+/g, ' | ').slice(0, 1500));
  else if (cmd === 'ids') console.log((await page.$$eval('[data-testid]', (els) => els.map((e) => e.getAttribute('data-testid')))).join(' '));
  await page.waitForTimeout(350);
}
await ctx.close();
