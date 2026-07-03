#!/usr/bin/env node
/**
 * Копирует SVG иконки интерфейса (Hugeicons) в public/encyclopedia/_shared/img/ui-icons/.
 * Список файлов — it-knowledge-base/src/data/uiIconDefinitions.js
 *
 * Usage:
 *   node scripts/generate-ui-icons.mjs
 *   npm run docs:ui-icons   # в it-knowledge-base
 *
 * Источник SVG: HUGEICONS_SVG_DIR или F:\Projects\hugeicons-react\exported-icons\svg
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const KB_ROOT = path.join(MEDIA_ROOT, '..', 'it-knowledge-base');
const defsPath = path.join(KB_ROOT, 'src', 'data', 'uiIconDefinitions.js');
const outDir = path.join(MEDIA_ROOT, 'public', 'encyclopedia', '_shared', 'img', 'ui-icons');
const defaultSrc = path.join('F:', 'Projects', 'hugeicons-react', 'exported-icons', 'svg');
const srcDir = process.env.HUGEICONS_SVG_DIR ?? defaultSrc;

if (!fs.existsSync(defsPath)) {
  console.error(`Not found: ${defsPath}`);
  console.error('Ожидается соседний репозиторий it-knowledge-base.');
  process.exit(1);
}

if (!fs.existsSync(srcDir)) {
  console.error(`Источник Hugeicons не найден: ${srcDir}`);
  console.error('Задайте HUGEICONS_SVG_DIR.');
  process.exit(1);
}

const {UI_ICON_ENTRIES} = await import(pathToFileURL(defsPath).href);

fs.mkdirSync(outDir, {recursive: true});

const files = new Set();
for (const entry of UI_ICON_ENTRIES) {
  files.add(entry.file);
  for (const alt of entry.alternates ?? []) {
    files.add(alt);
  }
}

let copied = 0;
let missing = 0;

for (const file of [...files].sort()) {
  const src = path.join(srcDir, `${file}.svg`);
  const dest = path.join(outDir, `${file}.svg`);
  if (!fs.existsSync(src)) {
    console.warn(`  пропуск (нет файла): ${file}.svg`);
    missing += 1;
    continue;
  }
  fs.copyFileSync(src, dest);
  copied += 1;
}

console.log(`UI icons: ${copied} → public/encyclopedia/_shared/img/ui-icons/`);

if (missing) {
  console.warn(`UI icons: ${missing} отсутствует в источнике`);
  process.exitCode = 1;
}

execFileSync(process.execPath, [path.join(MEDIA_ROOT, 'scripts', 'generate-manifest.mjs')], {
  stdio: 'inherit',
  cwd: MEDIA_ROOT,
});
