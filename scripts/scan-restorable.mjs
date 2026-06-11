/**
 * Scan tiny media files; find best git blob via --follow on KB path.
 * Usage: node scripts/scan-restorable.mjs [--threshold-kb=20]
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const KB_ROOT = path.join(MEDIA_ROOT, '..', 'it-knowledge-base');
const MANIFEST = path.join(MEDIA_ROOT, 'public', 'media-manifest.json');

const thresholdKb = Number(process.argv.find((a) => a.startsWith('--threshold-kb='))?.split('=')[1] ?? 20);
const THRESHOLD = thresholdKb * 1024;

function git(args) {
  return execSync(`git -C "${KB_ROOT}" ${args}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function bestBlob(kbPath) {
  let commits;
  try {
    commits = git(`log --all --follow --format=%H -- "${kbPath}"`).split('\n').filter(Boolean);
  } catch {
    return null;
  }
  let best = null;
  for (const commit of commits) {
    try {
      const out = git(`ls-tree -l ${commit} -- "${kbPath}"`).trim();
      const m = out.match(/\bblob ([0-9a-f]+)\s+(\d+)\t/);
      if (!m) continue;
      const size = Number(m[2]);
      if (!best || size > best.size) best = { size, hash: m[1], commit: commit.slice(0, 8) };
    } catch {
      /* skip */
    }
  }
  return best;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const candidates = manifest.images
  .filter((i) => i.bytes < THRESHOLD && /\.(png|jpe?g)$/i.test(i.name))
  .sort((a, b) => a.bytes - b.bytes);

console.log(`Scanning ${candidates.length} tiny raster files...`);
const restorable = [];

for (let i = 0; i < candidates.length; i++) {
  const img = candidates[i];
  const rel = img.path.replace(/^\/encyclopedia\//, '');
  const kbPath = `docs/encyclopedia/${rel}`;
  const best = bestBlob(kbPath);
  if (!best) continue;
  if (best.size > img.bytes * 1.25 && best.size - img.bytes > 4096) {
    restorable.push({ rel, current: img.bytes, best: best.size, hash: best.hash, commit: best.commit });
  }
  if ((i + 1) % 25 === 0) process.stderr.write(`  ${i + 1}/${candidates.length}\n`);
}

restorable.sort((a, b) => b.best - a.best);
console.log(`Restorable: ${restorable.length}`);
for (const row of restorable.slice(0, 40)) {
  console.log(
    `${String(row.current).padStart(6)} -> ${String(row.best).padStart(7)} [${row.commit}] ${row.rel}`,
  );
}

if (process.argv.includes('--json')) {
  fs.writeFileSync(path.join(__dirname, 'restore-plan.json'), JSON.stringify(restorable, null, 2));
}
