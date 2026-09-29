// Tiny static server for dist/: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const port = +(process.argv[2] ?? 4173);
const root = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  try {
    const f = await readFile(join(root, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p)] ?? (p === '/' ? 'text/html' : 'application/octet-stream') });
    res.end(f);
  } catch { res.writeHead(404); res.end('nf'); }
}).listen(port, () => console.log('serving', port));
