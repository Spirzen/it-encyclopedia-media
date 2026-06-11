/**
 * Find largest historical version of encyclopedia images in it-knowledge-base git.
 * Usage: node scripts/find-git-originals.mjs [--threshold-kb=20] [--limit=20]
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
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 30);
const THRESHOLD = thresholdKb * 1024;

function git(args) {
  return execSync(`git -C "${KB_ROOT}" ${args}`, { encoding: 'utf8' }).trim();
}

function lsTreeSize(commit, kbPath) {
  try {
    const out = git(`ls-tree -l ${commit} -- "${kbPath}"`);
    if (!out) return null;
    const match = out.match(/\bblob [0-9a-f]+\s+(\d+)\t/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function blobHash(commit, kbPath) {
  try {
    const out = git(`ls-tree ${commit} -- "${kbPath}"`);
    const match = out.match(/\bblob ([0-9a-f]+)\s/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const candidates = manifest.images
  .filter((i) => i.bytes < THRESHOLD && !/\.(svg|webp|avif|gif)$/i.test(i.name))
  .sort((a, b) => a.bytes - b.bytes);

console.log(`Candidates under ${thresholdKb}KB (non-svg/webp): ${candidates.length}`);

const restorable = [];

for (const img of candidates) {
  const rel = img.path.replace(/^\/encyclopedia\//, '');
  const kbPath = `docs/encyclopedia/${rel}`;

  let commits;
  try {
    commits = git(`log --all --format=%H -- "${kbPath}"`).split('\n').filter(Boolean);
  } catch {
    commits = [];
  }

  let best = { size: img.bytes, commit: null, hash: null };
  for (const commit of commits) {
    const size = lsTreeSize(commit, kbPath);
    if (size != null && size > best.size) {
      best = { size, commit, hash: blobHash(commit, kbPath) };
    }
  }

  if (best.size > img.bytes * 1.25 && best.size - img.bytes > 4096) {
    restorable.push({
      path: rel,
      current: img.bytes,
      best: best.size,
      commit: best.commit?.slice(0, 8),
      ratio: (best.size / img.bytes).toFixed(1),
    });
  }
}

restorable.sort((a, b) => b.best - a.best);
console.log(`Restorable from git (>${thresholdKb}KB found, +25% bigger): ${restorable.length}`);
for (const row of restorable.slice(0, limit)) {
  console.log(
    `${String(row.current).padStart(6)} -> ${String(row.best).padStart(7)} (${row.ratio}x) [${row.commit}] ${row.path}`,
  );
}
