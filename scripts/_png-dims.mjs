import fs from 'node:fs';
import path from 'node:path';

const root = 'F:/ITUniverse/it-encyclopedia-media/public/encyclopedia';
const manifest = JSON.parse(fs.readFileSync('F:/ITUniverse/it-encyclopedia-media/public/media-manifest.json', 'utf8'));

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const tiny = manifest.images.filter((i) => i.bytes < 20480 && /\.png$/i.test(i.name)).slice(0, 25);
for (const img of tiny) {
  const file = path.join(root, img.path.replace(/^\/encyclopedia\//, ''));
  const dim = pngSize(file);
  console.log(`${img.bytes.toString().padStart(6)}B ${dim ? `${dim.w}x${dim.h}`.padStart(10) : '???'.padStart(10)} ${img.path}`);
}
