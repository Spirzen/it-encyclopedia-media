/**
 * Переснимает пережатые UI-иллюстрации из локальных HTML и поисковиков.
 *
 * Usage:
 *   npm install
 *   npx playwright install chromium
 *   node scripts/recapture-assets.mjs [--dry-run] [--only=interfeys|desktop|search]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? null;

const HTML_TARGETS = [
  {
    group: 'interfeys',
    html: path.join(__dirname, 'capture', 'interfeys.html'),
    destDir: 'public/encyclopedia/1-basics/1-25-interfeys',
    caps: [
      'image.png',
      'image-1.png',
      'image-2.png',
      'image-3.png',
      'image-4.png',
      'image-5.png',
      'image-6.png',
      'image-7.png',
      'image-8.png',
      'image-9.png',
      'image-10.png',
      'image-11.png',
      'image-12.png',
      'image-13.png',
      'image-14.png',
      'image-15.png',
      'image-16.png',
      'image-17.png',
      'image-18.png',
      'image-19.png',
      'image-20.png',
      'image-21.png',
    ],
  },
  {
    group: 'desktop',
    html: path.join(__dirname, 'capture', 'desktop.html'),
    destDir: 'public/encyclopedia/4-code-dev/4-11-desktopnye-prilozheniya',
    caps: [
      'image-1.png',
      'image-2.png',
      'image-3.png',
      'image-4.png',
      'image-5.png',
      'image-6.png',
      'image-7.png',
      'image-8.png',
      'image-9.png',
      'image-10.png',
      'image-11.png',
      'image-12.png',
      'image-13.png',
      'image-14.png',
      'image-15.png',
      'image-16.png',
      'image-18.png',
      'image-20.png',
    ],
  },
];

const URL_TARGETS = [
  {
    group: 'search',
    dest: 'public/encyclopedia/1-basics/1-21-poisk-informatsii/Google.png',
    url: 'https://www.google.com/?hl=ru',
    waitMs: 2500,
    selector: 'form[role="search"], textarea[name="q"], input[name="q"]',
    pad: 40,
  },
  {
    group: 'search',
    dest: 'public/encyclopedia/1-basics/1-21-poisk-informatsii/Yandex.png',
    url: 'https://ya.ru/',
    waitMs: 2500,
    selector: 'input[name="text"], .search3__input',
    pad: 60,
  },
  {
    group: 'search',
    dest: 'public/encyclopedia/1-basics/1-21-poisk-informatsii/DuckDuckGo.png',
    url: 'https://duckduckgo.com/?kl=ru-ru',
    waitMs: 2500,
    selector: '#search_form_input, form input[name="q"]',
    pad: 50,
  },
];

function capId(filename) {
  return `#cap-${filename.replace(/\.png$/i, '')}`;
}

function oldBytes(destRel) {
  const manifestPath = path.join(MEDIA_ROOT, 'public', 'media-manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const urlPath = `/${destRel.replace(/^public\//, '')}`;
  const entry = manifest.images.find((i) => i.path === urlPath);
  return entry?.bytes ?? null;
}

async function captureHtmlTargets(page, batch) {
  const fileUrl = `file:///${batch.html.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'load' });

  for (const filename of batch.caps) {
    const destRel = `${batch.destDir}/${filename}`;
    const destAbs = path.join(MEDIA_ROOT, destRel);
    const selector = capId(filename);
    const locator = page.locator(selector);

    if ((await locator.count()) === 0) {
      console.warn(`SKIP missing ${selector} in ${batch.group}`);
      continue;
    }

    const before = oldBytes(destRel);
    if (DRY_RUN) {
      console.log(`[dry-run] ${destRel} <= ${selector} (was ${before ?? '?'} B)`);
      continue;
    }

    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    await locator.screenshot({ path: destAbs, type: 'png' });
    const after = fs.statSync(destAbs).size;
    console.log(`${destRel}: ${before ?? '?'} -> ${after} B`);
  }
}

async function captureUrlTargets(page, target) {
  const destAbs = path.join(MEDIA_ROOT, target.dest);
  const before = oldBytes(target.dest);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(target.waitMs);

  const locator = page.locator(target.selector).first();
  if ((await locator.count()) === 0) {
    console.warn(`SKIP ${target.dest}: selector not found, full viewport fallback`);
    if (DRY_RUN) {
      console.log(`[dry-run] ${target.dest} <= viewport fallback`);
      return;
    }
    await page.screenshot({ path: destAbs, type: 'png', fullPage: false });
    return;
  }

  const box = await locator.boundingBox();
  if (!box) {
    console.warn(`SKIP ${target.dest}: no bounding box`);
    return;
  }

  const pad = target.pad;
  const clip = {
    x: Math.max(0, box.x - pad * 2),
    y: Math.max(0, box.y - pad * 3),
    width: Math.min(1280, box.width + pad * 4),
    height: Math.min(900, box.height + pad * 6),
  };

  if (DRY_RUN) {
    console.log(`[dry-run] ${target.dest} clip ${JSON.stringify(clip)} (was ${before ?? '?'} B)`);
    return;
  }

  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  await page.screenshot({ path: destAbs, clip, type: 'png' });
  const after = fs.statSync(destAbs).size;
  console.log(`${target.dest}: ${before ?? '?'} -> ${after} B`);
}

async function main() {
  const htmlBatches = HTML_TARGETS.filter((b) => !ONLY || b.group === ONLY);
  const urlTargets = URL_TARGETS.filter((t) => !ONLY || t.group === ONLY);

  if (htmlBatches.length === 0 && urlTargets.length === 0) {
    console.error(`Unknown --only=${ONLY}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  for (const batch of htmlBatches) {
    console.log(`\n== ${batch.group} ==`);
    await captureHtmlTargets(page, batch);
  }

  for (const target of urlTargets) {
    console.log(`\n== ${target.group}: ${path.basename(target.dest)} ==`);
    try {
      await captureUrlTargets(page, target);
    } catch (err) {
      console.warn(`FAIL ${target.dest}:`, err.message);
    }
  }

  await browser.close();

  if (!DRY_RUN) {
    execFileSync(process.execPath, [path.join(MEDIA_ROOT, 'scripts', 'generate-manifest.mjs')], {
      stdio: 'inherit',
      cwd: MEDIA_ROOT,
    });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
