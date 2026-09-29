// Builds Fungeon into dist/ as a static PWA (hashed JS/CSS, index.html, manifest, service worker).
// `--single` also writes dist/fungeon.html with everything inlined (for sharing as one file).
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const out = join(root, 'dist');
const dev = process.argv.includes('--dev');
const single = process.argv.includes('--single');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await esbuild.build({
  entryPoints: { app: join(root, 'src/main.tsx'), styles: join(root, 'src/ui/styles.css') },
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

for (const f of readdirSync(join(root, 'static'))) {
  if (f === 'sw.template.js') continue;
  cpSync(join(root, 'static', f), join(out, f), { recursive: true });
}

const fontTags = [
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&display=swap" />',
].join('\n    ');

const head = (extra) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#1f1a14" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="description" content="Fungeon - a cozy, crunchy mushroom roguelike deckbuilder." />
    <title>Fungeon</title>
    ${fontTags}
    ${extra}
  </head>`;

writeFileSync(
  join(out, 'index.html'),
  `${head(`<link rel="manifest" href="manifest.webmanifest" />
    <link rel="icon" href="icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="${css}" />`)}
  <body>
    <div id="root"></div>
    <script type="module" src="${js}"></script>
  </body>
</html>
`,
);

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
const shell = ['./', ...files.map((f) => `./${f}`)];
const sw = readFileSync(join(root, 'static/sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__SHELL__', JSON.stringify(shell, null, 2));
writeFileSync(join(out, 'sw.js'), sw);

if (single) {
  const jsText = readFileSync(join(out, js), 'utf8').replace(/<\/script/g, '<\\/script');
  const cssText = readFileSync(join(out, css), 'utf8');
  const icon = readFileSync(join(root, 'static/icon.svg'), 'utf8');
  writeFileSync(
    join(out, 'fungeon.html'),
    `${head(`<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}" />
    <style>${cssText}</style>`)}
  <body>
    <div id="root"></div>
    <script type="module">${jsText}</script>
  </body>
</html>
`,
  );
}

const size = (f) => (statSync(join(out, f)).size / 1024).toFixed(1);
console.log(`Built dist/ - ${js} ${size(js)} KB, ${css} ${size(css)} KB, version ${version}${single ? `, fungeon.html ${size('fungeon.html')} KB` : ''}`);
