import { execSync } from 'node:child_process';

const repo = 'F:/ITUniverse/it-knowledge-base';
const before = 'd47537b35ece94731a0fff4d3fe9df24d6ec84df';
const after = '5a1be52fdb026293f22266ab55ca4ccc11e6f2ec';

function git(args) {
  return execSync(`git -C "${repo}" ${args}`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
}

function pngTree(commit) {
  const out = git(`ls-tree -r -l ${commit} -- docs/encyclopedia/`);
  const map = new Map();
  for (const line of out.split('\n').filter(Boolean)) {
    const m = line.match(/\bblob [0-9a-f]+\s+(\d+)\t(.+)$/);
    if (!m) continue;
    const p = m[2];
    if (!/\.png$/i.test(p)) continue;
    map.set(p, Number(m[1]));
  }
  return map;
}

const a = pngTree(before);
const b = pngTree(after);
const shrunk = [];
const grown = [];

for (const [p, sizeAfter] of b) {
  const sizeBefore = a.get(p);
  if (sizeBefore == null) continue;
  const ratio = sizeAfter / sizeBefore;
  if (ratio < 0.5 && sizeBefore > 5000) {
    shrunk.push({ p, sizeBefore, sizeAfter, ratio });
  } else if (ratio > 1.5 && sizeAfter > 5000) {
    grown.push({ p, sizeBefore, sizeAfter, ratio });
  }
}

shrunk.sort((x, y) => y.sizeBefore - x.sizeBefore);
grown.sort((x, y) => y.sizeAfter - x.sizeAfter);

console.log('PNG count before', a.size, 'after', b.size);
console.log('Shrunk >50% in Ultra6k:', shrunk.length);
for (const row of shrunk.slice(0, 20)) {
  console.log(`${row.sizeBefore} -> ${row.sizeAfter} (${(row.ratio * 100).toFixed(0)}%) ${row.p}`);
}
console.log('Grown >50% in Ultra6k:', grown.length);
for (const row of grown.slice(0, 10)) {
  console.log(`${row.sizeBefore} -> ${row.sizeAfter} (${(row.ratio * 100).toFixed(0)}%) ${row.p}`);
}
