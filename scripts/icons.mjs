// Regenerates the PNG icons from the SVG sources. Needs `sharp` (npm i -D sharp).
import sharp from 'sharp';
const dir = new URL('../static/icons/', import.meta.url);
const out = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'maskable-512.png', 512],
  ['maskable.svg', 'apple-touch-icon.png', 180],
];
for (const [src, dest, size] of out) {
  await sharp(new URL(src, dir).pathname).resize(size, size).png().toFile(new URL(dest, dir).pathname);
}
console.log('Icons written');
