/**
 * Search entire KB git history for largest blob per basename.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const KB_ROOT = path.join(MEDIA_ROOT, '..', 'it-knowledge-base');
const MANIFEST = path.join(MEDIA_ROOT, 'public', 'media-manifest.json');

const thresholdKb = 20;
const THRESHOLD = thresholdKb * 1024;

function git(args) {
  return execSync(`git -C "${KB_ROOT}" ${args}`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim();
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const candidates = manifest.images
  .filter((i) => i.bytes < THRESHOLD && /\.png$/i.test(i.name))
  .slice(0, 15);

console.log('Searching by basename for', candidates.length, 'tiny PNGs...');

for (const img of candidates) {
  const name = img.name;
  const rel = img.path.replace(/^\/encyclopedia\//, '');

  let out;
  try {
    out = git(`log --all --format=%H --name-only -- "**/${name}"`);
  } catch {
    console.log(name, 'no history');
    continue;
  }

  const commits = [...new Set(out.split('\n').filter((l) => /^[0-9a-f]{40}$/.test(l)))];
  let best = { size: img.bytes, path: rel, commit: null };

  for (const commit of commits.slice(0, 80)) {
    let files;
    try {
      files = git(`ls-tree -r -l ${commit} -- "**/${name}"`);
    } catch {
      continue;
    }
    for (const line of files.split('\n').filter(Boolean)) {
      const m = line.match(/\bblob [0-9a-f]+\s+(\d+)\t(.+)$/);
      if (!m) continue;
      const size = Number(m[1]);
      const p = m[2];
      if (size > best.size) best = { size, path: p, commit: commit.slice(0, 8) };
    }
  }

  console.log(
    `${name.padEnd(20)} cur=${String(img.bytes).padStart(5)} best=${String(best.size).padStart(7)} commit=${best.commit ?? '-'} path=${best.path}`,
  );
}
