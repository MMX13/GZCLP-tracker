// Bundles src/art/gallery.tsx into dist-gallery/gallery.html (standalone).
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
mkdirSync(root + 'dist-gallery', { recursive: true });
const r = await esbuild.build({
  entryPoints: [root + 'src/art/gallery.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic',
  minify: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
});
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
writeFileSync(root + 'dist-gallery/gallery.html', `<!doctype html><html><head><meta charset="utf-8"><title>Fungeon gallery</title><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#1f1a14}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('gallery built');
