// Regenerates PWA/browser icons from public/logo.png.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const source = path.join(publicDir, 'logo.png');

const targets = [
  { file: 'pwa-icon-192.png', size: 192 },
  { file: 'pwa-icon-512.png', size: 512 },
];

for (const { file, size } of targets) {
  await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, file));
  console.log(`Generated ${file} (${size}x${size})`);
}
