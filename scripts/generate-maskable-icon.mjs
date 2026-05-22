// Renders public/maskable-icon.svg to public/maskable-icon-512x512.png.
// Kept separate from pwa-assets-generator because that tool uses a single
// source SVG for every icon type, and Android's adaptive icon needs a
// trophy that's smaller than the regular PWA icon so it stays inside the
// safe zone after the launcher applies its mask shape.
//
// Run with: node scripts/generate-maskable-icon.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(root, "public", "maskable-icon.svg");
const dest = join(root, "public", "maskable-icon-512x512.png");

const svg = readFileSync(src);
await sharp(svg)
  .resize(512, 512)
  .png({ compressionLevel: 9, quality: 60 })
  .toFile(dest);

console.log(`Wrote ${dest}`);
