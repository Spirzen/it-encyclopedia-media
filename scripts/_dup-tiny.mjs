import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root = 'F:/ITUniverse/it-encyclopedia-media/public/encyclopedia';
const manifest = JSON.parse(
  fs.readFileSync('F:/ITUniverse/it-encyclopedia-media/public/media-manifest.json', 'utf8'),
);
const tiny = manifest.images.filter((i) => i.bytes < 20480 && /\.png$/i.test(i.name));
const hashMap = new Map();

for (const img of tiny) {
  const f = path.join(root, img.path.replace(/^\/encyclopedia\//, ''));
  const buf = fs.readFileSync(f);
  const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
  if (!hashMap.has(h)) hashMap.set(h, { count: 0, bytes: img.bytes, paths: [] });
  const e = hashMap.get(h);
  e.count++;
  if (e.paths.length < 2) e.paths.push(img.path);
}

console.log('unique tiny png blobs:', hashMap.size, 'total files:', tiny.length);
for (const [, e] of [...hashMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20)) {
  console.log(`${String(e.count).padStart(3)}x ${String(e.bytes).padStart(5)}B  ${e.paths[0]}`);
}
