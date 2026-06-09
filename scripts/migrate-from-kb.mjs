/**
 * Миграция иллюстраций из it-knowledge-base в it-encyclopedia-media.
 * Копирует файлы, обновляет markdown-ссылки, удаляет исходники из KB.
 *
 * Usage:
 *   node scripts/migrate-from-kb.mjs [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const KB_ROOT = path.join(MEDIA_ROOT, '..', 'it-knowledge-base');
const ENCYCLOPEDIA_DOCS = path.join(KB_ROOT, 'docs', 'encyclopedia');
const MEDIA_ENCYCLOPEDIA = path.join(MEDIA_ROOT, 'public', 'encyclopedia');
const STATIC_IMG = path.join(KB_ROOT, 'static', 'img');

const CDN_ORIGIN = 'https://assets.spirzen.ru';
const DRY_RUN = process.argv.includes('--dry-run');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const STATIC_KEEP = new Set(['docusaurus.png', 'logoITU.png']);

/** @type {Map<string, string>} abs source path → CDN path without origin */
const sourceToCdn = new Map();

function posix(p) {
  return p.split(path.sep).join('/');
}

function cdnUrl(cdnPath) {
  return `${CDN_ORIGIN}/encyclopedia/${cdnPath}`;
}

function isImageFile(filePath) {
  return IMAGE_EXTS.has(path.extname(filePath).toLowerCase());
}

function registerSource(absPath, cdnRelPath) {
  const key = path.resolve(absPath);
  if (!sourceToCdn.has(key)) {
    sourceToCdn.set(key, posix(cdnRelPath));
  }
}

function walkImages(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkImages(full, onFile);
    else if (isImageFile(full)) onFile(full);
  }
}

function collectEncyclopediaImages() {
  walkImages(ENCYCLOPEDIA_DOCS, (absPath) => {
    const rel = posix(path.relative(ENCYCLOPEDIA_DOCS, absPath));
    registerSource(absPath, rel);
  });
}

function collectSharedStaticImages() {
  if (!fs.existsSync(STATIC_IMG)) return;
  for (const name of fs.readdirSync(STATIC_IMG)) {
    if (STATIC_KEEP.has(name)) continue;
    const absPath = path.join(STATIC_IMG, name);
    if (!fs.statSync(absPath).isFile() || !isImageFile(absPath)) continue;
    registerSource(absPath, `_shared/img/${name}`);
  }
}

function parseImageTarget(raw) {
  const trimmed = raw.trim();
  const hashIdx = trimmed.indexOf('#');
  const withoutHash = hashIdx === -1 ? trimmed : trimmed.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : trimmed.slice(hashIdx);

  const titleMatch = withoutHash.match(/^(\S+)(?:\s+"([^"]*)")?$/);
  if (!titleMatch) return null;

  return {
    url: titleMatch[1],
    title: titleMatch[2] ? ` "${titleMatch[2]}"` : '',
    hash,
  };
}

function resolveRef(url, mdFile) {
  if (/^https?:\/\//i.test(url)) {
    if (url.startsWith(CDN_ORIGIN)) return null;
    return null;
  }

  if (url.startsWith('/img/')) {
    const abs = path.join(STATIC_IMG, path.basename(url));
    return fs.existsSync(abs) ? abs : null;
  }

  if (url.startsWith('/')) {
    return null;
  }

  const abs = path.resolve(path.dirname(mdFile), url);
  return fs.existsSync(abs) ? abs : null;
}

function copyFiles() {
  let copied = 0;
  let skipped = 0;

  for (const [src, cdnRel] of sourceToCdn) {
    const dest = path.join(MEDIA_ENCYCLOPEDIA, ...cdnRel.split('/'));
    const destDir = path.dirname(dest);

    if (!DRY_RUN) fs.mkdirSync(destDir, { recursive: true });

    const srcStat = fs.statSync(src);
    const exists = fs.existsSync(dest);
    if (exists) {
      const destStat = fs.statSync(dest);
      if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`[copy] ${posix(path.relative(KB_ROOT, src))} → encyclopedia/${cdnRel}`);
    } else {
      fs.copyFileSync(src, dest);
    }
    copied++;
  }

  return { copied, skipped };
}

function collectDocFiles(dir) {
  const files = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...collectDocFiles(full));
    else if (/\.(md|mdx)$/i.test(ent.name)) files.push(full);
  }
  return files;
}

function updateMarkdown() {
  const imageRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let filesChanged = 0;
  let refsUpdated = 0;
  let refsMissing = 0;

  for (const mdFile of collectDocFiles(ENCYCLOPEDIA_DOCS)) {
    const original = fs.readFileSync(mdFile, 'utf8');
    let changed = false;

    const updated = original.replace(imageRe, (full, alt, rawTarget) => {
      const parsed = parseImageTarget(rawTarget);
      if (!parsed) return full;

      const abs = resolveRef(parsed.url, mdFile);
      if (!abs) {
        if (!/^https?:\/\//i.test(parsed.url) && !parsed.url.startsWith('/img/')) {
          refsMissing++;
        }
        return full;
      }

      const cdnRel = sourceToCdn.get(path.resolve(abs));
      if (!cdnRel) return full;

      const next = `![${alt}](${cdnUrl(cdnRel)}${parsed.title}${parsed.hash})`;
      if (next !== full) {
        changed = true;
        refsUpdated++;
      }
      return next;
    });

    if (changed) {
      filesChanged++;
      if (!DRY_RUN) fs.writeFileSync(mdFile, updated, 'utf8');
    }
  }

  return { filesChanged, refsUpdated, refsMissing };
}

function deleteSources() {
  let deleted = 0;

  for (const src of sourceToCdn.keys()) {
    if (!fs.existsSync(src)) continue;
    if (DRY_RUN) {
      console.log(`[delete] ${posix(path.relative(KB_ROOT, src))}`);
    } else {
      fs.unlinkSync(src);
    }
    deleted++;
  }

  if (!DRY_RUN) pruneEmptyDirs(ENCYCLOPEDIA_DOCS);
  return deleted;
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) pruneEmptyDirs(path.join(dir, ent.name));
  }
  if (dir === ENCYCLOPEDIA_DOCS) return;
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

function main() {
  if (!fs.existsSync(ENCYCLOPEDIA_DOCS)) {
    console.error(`Not found: ${ENCYCLOPEDIA_DOCS}`);
    process.exit(1);
  }

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== MIGRATE ===');
  collectEncyclopediaImages();
  collectSharedStaticImages();

  console.log(`Images to migrate: ${sourceToCdn.size}`);

  const { copied, skipped } = copyFiles();
  console.log(`Copied: ${copied}, skipped (already present): ${skipped}`);

  const { filesChanged, refsUpdated, refsMissing } = updateMarkdown();
  console.log(`Markdown: ${filesChanged} file(s), ${refsUpdated} ref(s) updated, ${refsMissing} unresolved local ref(s)`);

  const deleted = deleteSources();
  console.log(`Deleted from KB: ${deleted} file(s)`);

  if (!DRY_RUN) {
    execFileSync(process.execPath, [path.join(MEDIA_ROOT, 'scripts', 'generate-manifest.mjs')], {
      stdio: 'inherit',
      cwd: MEDIA_ROOT,
    });
  }

  console.log('Done.');
}

main();
