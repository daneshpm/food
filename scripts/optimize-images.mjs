// Resizes and recompresses product photos in public/images/.
// Any PNG with no real alpha channel (checked via actual pixel stats, not
// just presence of an alpha channel - many PNGs carry one at 100% opaque)
// is re-encoded as JPEG - PNG's lossless encoding is a poor fit for
// photographic content and inflates these several times over for no
// visual benefit. PNGs with genuine transparency are kept as PNG.
// Run with: node scripts/optimize-images.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(__dirname, '..', 'public', 'images');
const MAX_WIDTH = 1000;

const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g)$/i.test(f));

let beforeTotal = 0;
let afterTotal = 0;
const renames = {};

for (const file of files) {
  const filePath = path.join(imagesDir, file);
  const inputBuffer = fs.readFileSync(filePath);
  const before = inputBuffer.length;
  beforeTotal += before;

  const image = sharp(inputBuffer);
  const meta = await image.metadata();
  const needsResize = meta.width > MAX_WIDTH;
  let pipeline = needsResize ? image.resize({ width: MAX_WIDTH }) : image;

  const isPng = /\.png$/i.test(file);
  let hasRealTransparency = false;
  if (isPng && meta.hasAlpha) {
    const stats = await image.stats();
    const alphaChannel = stats.channels[stats.channels.length - 1];
    hasRealTransparency = alphaChannel.min < 255;
  }
  const convertToJpeg = isPng && !hasRealTransparency;

  let outBuffer, outFile;
  if (convertToJpeg) {
    outBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    outFile = file.replace(/\.png$/i, '.jpg');
  } else if (isPng) {
    outBuffer = await pipeline.png({ quality: 80, compressionLevel: 9, palette: true }).toBuffer();
    outFile = file;
  } else {
    outBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    outFile = file;
  }

  fs.writeFileSync(path.join(imagesDir, outFile), outBuffer);
  if (outFile !== file) {
    fs.unlinkSync(filePath);
    renames[file] = outFile;
  }
  afterTotal += outBuffer.length;
}

console.error(`Files processed: ${files.length}`);
console.error(`Before: ${(beforeTotal / 1024 / 1024).toFixed(2)} MB`);
console.error(`After:  ${(afterTotal / 1024 / 1024).toFixed(2)} MB`);
console.error(`Saved:  ${((1 - afterTotal / beforeTotal) * 100).toFixed(1)}%`);
console.error(`Renamed ${Object.keys(renames).length} files (png -> jpg)`);
console.log(JSON.stringify(renames, null, 2));
