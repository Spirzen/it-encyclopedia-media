import { execSync } from 'node:child_process';

const repo = 'F:/ITUniverse/it-knowledge-base';
const path = process.argv[2] ?? 'docs/encyclopedia/4-code-dev/4-11-desktopnye-prilozheniya/image-6.png';
const commits = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['91cb4f1eaf', '5a1be52fdb^', '5a1be52fdb', '684d86cd83^'];

for (const c of commits) {
  try {
    const out = execSync(`git -C "${repo}" ls-tree -l ${c} -- "${path}"`, { encoding: 'utf8' }).trim();
    console.log(c, out || 'MISSING');
  } catch {
    console.log(c, 'MISSING');
  }
}
