/**
 * Сканирует public/encyclopedia и пишет public/media-manifest.json для index.html.
 * Запуск: node scripts/generate-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const encyclopediaDir = path.join(publicDir, 'encyclopedia');
const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);

function walk(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(base, ent.name);
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...walk(full, rel));
      continue;
    }
    if (!exts.has(path.extname(ent.name).toLowerCase())) continue;
    const webPath = `/encyclopedia/${rel.replace(/\\/g, '/')}`;
    results.push({
      path: webPath,
      name: ent.name,
      article: path.posix.dirname(rel).replace(/\\/g, '/'),
      bytes: fs.statSync(full).size,
    });
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

const images = walk(encyclopediaDir);
const manifest = {
  v: 1,
  generatedAt: new Date().toISOString(),
  count: images.length,
  images,
};

fs.writeFileSync(
  path.join(publicDir, 'media-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`media-manifest.json: ${images.length} image(s)`);
