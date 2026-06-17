#!/usr/bin/env node
/**
 * Генерация SVG-иконок BPMN 2.0 в public/encyclopedia/_shared/img/bpmn/.
 * Определения глифов — в соседнем it-knowledge-base (компонент BpmnIcon).
 *
 * Usage (из media или KB):
 *   node scripts/generate-bpmn-icons.mjs
 *   npm run docs:bpmn-icons   # в it-knowledge-base
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const KB_ROOT = path.join(MEDIA_ROOT, '..', 'it-knowledge-base');
const defsPath = path.join(KB_ROOT, 'src', 'data', 'bpmn', 'iconDefinitions.js');
const outDir = path.join(MEDIA_ROOT, 'public', 'encyclopedia', '_shared', 'img', 'bpmn');

if (!fs.existsSync(defsPath)) {
  console.error(`Not found: ${defsPath}`);
  console.error('Ожидается соседний репозиторий it-knowledge-base.');
  process.exit(1);
}

const {BPMN_ICON_DEFINITIONS, bpmnIconSvgDocument} = await import(pathToFileURL(defsPath).href);

fs.mkdirSync(outDir, {recursive: true});

let count = 0;
for (const id of Object.keys(BPMN_ICON_DEFINITIONS)) {
  const svg = bpmnIconSvgDocument(id);
  if (!svg) continue;
  fs.writeFileSync(path.join(outDir, `${id}.svg`), svg, 'utf8');
  count += 1;
}

console.log(`BPMN icons: ${count} → public/encyclopedia/_shared/img/bpmn/`);

execFileSync(process.execPath, [path.join(MEDIA_ROOT, 'scripts', 'generate-manifest.mjs')], {
  stdio: 'inherit',
  cwd: MEDIA_ROOT,
});
