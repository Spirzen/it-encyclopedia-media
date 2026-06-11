import { execSync } from 'node:child_process';

const repo = 'F:/ITUniverse/it-knowledge-base';

function git(args) {
  return execSync(`git -C "${repo}" ${args}`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

const name = process.argv[2] ?? 'image-3.png';
const raw = git(`log --all --format=%H --name-only -- "**/${name}"`);
const lines = raw.split('\n');

const rows = [];
let commit = null;
for (const line of lines) {
  if (/^[0-9a-f]{40}$/.test(line)) {
    commit = line;
    continue;
  }
  if (!line || !line.endsWith(name)) continue;
  try {
    const out = git(`ls-tree -l ${commit} -- "${line}"`);
    const m = out.match(/\bblob ([0-9a-f]+)\s+(\d+)\t/);
    if (m) rows.push({ commit: commit.slice(0, 8), hash: m[1].slice(0, 8), size: Number(m[2]), path: line });
  } catch {
    /* skip */
  }
}

rows.sort((a, b) => b.size - a.size);
console.log(`History for ${name}: ${rows.length} paths`);
for (const row of rows.slice(0, 40)) {
  console.log(`${String(row.size).padStart(8)} ${row.hash} ${row.commit} ${row.path}`);
}
