// Builds the app into dist/ as a static site: bundled JS and CSS, index.html, manifest, icons and service worker.
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const out = join(root, 'dist');
const dev = process.argv.includes('--dev');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await esbuild.build({
  entryPoints: { app: join(root, 'src/main.tsx'), styles: join(root, 'src/styles.css') },
  bundle: true,
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  format: 'esm',
  target: ['chrome100', 'safari15'],
  jsx: 'automatic',
  outdir: out,
  entryNames: '[name]-[hash]',
  metafile: true,
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
  logLevel: 'warning',
});

const outputs = Object.keys(result.metafile.outputs).map((p) => relative(out, join(root, p)));
const js = outputs.find((p) => p.startsWith('app-') && p.endsWith('.js'));
const css = outputs.find((p) => p.startsWith('styles-') && p.endsWith('.css'));
const stray = outputs.find((p) => p.startsWith('styles-') && p.endsWith('.js'));
if (stray) rmSync(join(out, stray));

// Static files, except the service worker template.
for (const f of readdirSync(join(root, 'static'))) {
  if (f === 'sw.template.js') continue;
  cpSync(join(root, 'static', f), join(out, f), { recursive: true });
}

// Fonts - bundled locally if `npm run fonts` has been run, otherwise loaded from Google Fonts and cached by the service worker.
const localFonts = existsSync(join(root, 'static/fonts/fonts.css'));
const fontTags = localFonts
  ? '<link rel="stylesheet" href="fonts/fonts.css" />'
  : [
      '<link rel="preconnect" href="https://fonts.googleapis.com" />',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500&family=Barlow:wght@400;500&family=Rock+Salt&display=swap" />',
    ].join('\n    ');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1b1a18" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>GZCLP Tracker</title>
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="icon" href="icons/icon-192.png" />
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
    ${fontTags}
    <link rel="stylesheet" href="${css}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${js}"></script>
  </body>
</html>
`;
writeFileSync(join(out, 'index.html'), html);

// Service worker with a precache list and a version derived from the built files.
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(out).map((p) => relative(out, p).split('\\').join('/'));
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(f).update(readFileSync(join(out, f)));
const version = hash.digest('hex').slice(0, 12);
const shell = ['./', ...files.filter((f) => !f.endsWith('.svg')).map((f) => `./${f}`)];
const sw = readFileSync(join(root, 'static/sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__SHELL__', JSON.stringify(shell, null, 2));
writeFileSync(join(out, 'sw.js'), sw);

const size = (f) => (statSync(join(out, f)).size / 1024).toFixed(1);
console.log(`Built dist/ - ${js} ${size(js)} KB, ${css} ${size(css)} KB, version ${version}${localFonts ? ', local fonts' : ''}`);
