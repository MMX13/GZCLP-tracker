// Builds a single-file version of the app for publishing as a Claude artifact (artifact/gzclp-tracker.html).
// Everything, React included, is inlined so the page has no external script dependency. No service worker - the artifact
// saves to its own database instead.
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const js = await esbuild.build({
  entryPoints: [join(root, 'src/artifact-main.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'safari15'],
  jsx: 'automatic',
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});

const css = await esbuild.build({
  entryPoints: [join(root, 'src/styles.css')],
  bundle: true,
  minify: true,
  write: false,
  logLevel: 'warning',
});

// Artifact-only adjustments: a 16px side gutter overall, and fit inside the viewer's safe-area padding.
const extraCss = `
:root{color-scheme:dark;background:var(--bg)}
html,body{background:var(--bg)}
#root{padding-inline:4px;min-height:auto}
.overlay-inner{padding-inline:4px}
`;

const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>GZCLP Tracker</title>
<meta name="theme-color" content="#1b1a18">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500&family=Barlow:wght@400;500&family=Rock+Salt&display=swap">
<style>${css.outputFiles[0].text}${extraCss}</style>
<div id="root"><div class="empty" style="margin-top:30vh"><h3>Loading your log…</h3></div></div>
<script>
window.addEventListener('error', function (e) { showBootError(e.message || 'Script error'); });
window.addEventListener('unhandledrejection', function (e) { showBootError(String((e.reason && (e.reason.message || e.reason.code)) || e.reason)); });
function showBootError(msg) {
  if (window.__booted) return;
  var r = document.getElementById('root');
  r.innerHTML = '<div class="empty" style="margin-top:24vh"><h3>The tracker could not start</h3><p></p></div>';
  r.querySelector('p').textContent = msg;
}
</script>
<script>${script}</script>
`;

mkdirSync(join(root, 'artifact'), { recursive: true });
const out = join(root, 'artifact/gzclp-tracker.html');
writeFileSync(out, html);
console.log(`Built artifact/gzclp-tracker.html - ${(html.length / 1024).toFixed(1)} KB`);
