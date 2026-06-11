import fs from 'node:fs';

const m = JSON.parse(fs.readFileSync('public/media-manifest.json', 'utf8'));
for (const prefix of ['1-basics/1-25-interfeys', '4-code-dev/4-11-desktopnye-prilozheniya', '1-basics/1-21-poisk-informatsii']) {
  console.log('\n##', prefix);
  m.images
    .filter((i) => i.path.includes(prefix) && i.bytes < 20480)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .forEach((i) => console.log(i.bytes, i.name));
}
