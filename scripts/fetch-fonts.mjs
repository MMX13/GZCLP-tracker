// Downloads the three fonts from Google Fonts into static/fonts/ so the app ships them itself.
// Run with `npm run fonts`, then `npm run build`. The build uses local fonts whenever static/fonts/fonts.css exists.
import { mkdirSync, writeFileSync } from 'node:fs';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500&family=Barlow:wght@400;500&family=Rock+Salt&display=swap';
// A modern user agent makes Google return woff2.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const dir = new URL('../static/fonts/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

let css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
let i = 0;
for (const url of urls) {
  const name = `f${i++}.woff2`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(dir + name, buf);
  css = css.split(url).join(name);
}
writeFileSync(dir + 'fonts.css', css);
console.log(`Saved ${urls.length} font files to static/fonts/`);
