// Génère les icônes PNG de la PWA à partir de public/icons/icon.svg
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icons/icon.svg');
const out = 'public/icons/';
await sharp(svg).resize(192, 192).png().toFile(out + 'icon-192.png');
await sharp(svg).resize(512, 512).png().toFile(out + 'icon-512.png');
await sharp(svg).resize(180, 180).flatten({ background: '#0B0D12' }).png().toFile(out + 'apple-touch-icon.png');
// maskable : contenu réduit à la zone de sécurité (80 %) sur fond plein
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0B0D12' } })
  .composite([{ input: inner, top: 56, left: 56 }]).png().toFile(out + 'maskable-512.png');
console.log('icônes générées');
