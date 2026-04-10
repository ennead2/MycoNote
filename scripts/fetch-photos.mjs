/**
 * Wikimedia Commons から各キノコの代表写真を取得し、WebP に変換するスクリプト
 *
 * Usage: node scripts/fetch-photos.mjs [--dry-run] [--only=matsutake,shiitake]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const IMAGES_DIR = join(ROOT, 'public/images/mushrooms');

const DETAIL_WIDTH = 800;
const DETAIL_QUALITY = 80;

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',');

const WIKI_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MycoNote/1.0 (mushroom handbook app; contact: github.com/ennead2/MycoNote)';

// Rate limiting
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const API_DELAY = 1500; // 1.5s between API calls
const DOWNLOAD_DELAY = 2000; // 2s between downloads
const MAX_RETRIES = 3;

async function fetchWithRetry(url, opts, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, opts);
    if (res.ok) return res;
    if (res.status === 429) {
      const wait = (i + 1) * 5000;
      console.log(`    Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error('Max retries exceeded (429)');
}

/**
 * Search Wikimedia Commons for images of a given scientific name
 */
async function searchWikimediaImages(scientificName) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${scientificName} mushroom`,
    gsrnamespace: '6', // File namespace
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: String(DETAIL_WIDTH),
    format: 'json',
    origin: '*',
  });

  const res = await fetchWithRetry(`${WIKI_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  const data = await res.json();
  if (!data.query?.pages) return [];

  const pages = Object.values(data.query.pages)
    .filter(p => p.imageinfo?.[0])
    .map(p => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata || {};
      const license = meta.LicenseShortName?.value || '';
      const isValidLicense =
        /cc/i.test(license) ||
        /public\s*domain/i.test(license) ||
        /pd/i.test(license) ||
        /gfdl/i.test(license);

      return {
        title: p.title,
        thumbUrl: info.thumburl,
        originalUrl: info.url,
        descriptionUrl: info.descriptionurl,
        width: info.width,
        height: info.height,
        mime: info.mime,
        license,
        isValidLicense,
      };
    })
    .filter(img =>
      img.isValidLicense &&
      /^image\/(jpeg|png|webp|tiff)/.test(img.mime) &&
      img.width >= 400 &&
      img.height >= 300
    )
    // Prefer larger images
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  return pages;
}

/**
 * Download image and convert to WebP
 */
async function downloadAndConvert(url, outputPath) {
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  const buffer = Buffer.from(await res.arrayBuffer());

  await sharp(buffer)
    .resize(DETAIL_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: DETAIL_QUALITY })
    .toFile(outputPath);
}

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const targets = ONLY
    ? mushrooms.filter(m => ONLY.includes(m.id))
    : mushrooms;

  console.log(`Processing ${targets.length} species${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  const results = { success: [], failed: [], skipped: [] };

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;
    const outputPath = join(IMAGES_DIR, `${m.id}.webp`);

    // Skip if already has a real image (not placeholder)
    if (m.image_local !== '/images/mushrooms/placeholder.svg' && existsSync(join(ROOT, 'public', m.image_local))) {
      console.log(`${prefix} ${m.names.ja} — SKIP (already has image)`);
      results.skipped.push(m.id);
      continue;
    }

    try {
      console.log(`${prefix} ${m.names.ja} (${m.names.scientific})...`);
      const images = await searchWikimediaImages(m.names.scientific);

      if (images.length === 0) {
        // Try with just the genus name
        const genus = m.names.scientific.split(' ')[0];
        const fallback = await searchWikimediaImages(`${genus} fungus`);
        if (fallback.length === 0) {
          console.log(`  ✗ No suitable image found`);
          results.failed.push({ id: m.id, name: m.names.ja, reason: 'no image' });
          await sleep(API_DELAY);
          continue;
        }
        images.push(...fallback);
      }

      const best = images[0];

      if (DRY_RUN) {
        console.log(`  ✓ Would download: ${best.title} (${best.license})`);
        results.success.push(m.id);
      } else {
        const downloadUrl = best.thumbUrl || best.originalUrl;
        await downloadAndConvert(downloadUrl, outputPath);

        // Update mushroom data
        m.image_local = `/images/mushrooms/${m.id}.webp`;
        m.source_url = best.descriptionUrl;

        // Add additional images to images_remote (up to 3)
        m.images_remote = images
          .slice(1, 4)
          .map(img => img.originalUrl);

        const sizeKB = Math.round(
          readFileSync(outputPath).byteLength / 1024
        );
        console.log(`  ✓ ${best.title} (${best.license}) — ${sizeKB}KB`);
        results.success.push(m.id);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      results.failed.push({ id: m.id, name: m.names.ja, reason: err.message });
    }

    await sleep(DOWNLOAD_DELAY); // Rate limiting
  }

  // Write updated mushrooms.json
  if (!DRY_RUN && results.success.length > 0) {
    writeFileSync(MUSHROOMS_JSON, JSON.stringify(mushrooms, null, 2) + '\n', 'utf8');
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed:  ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed species:');
    for (const f of results.failed) {
      console.log(`  - ${f.name} (${f.id}): ${f.reason}`);
    }
  }
}

main().catch(console.error);
