/**
 * v2: Wikipedia記事画像（代表写真）+ iNaturalist（野外追加写真）
 *
 * Usage: node scripts/fetch-photos-v2.mjs [--dry-run] [--only=matsutake,shiitake]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': 'MycoNote/1.0 (https://github.com/ennead2/MycoNote)', ...opts.headers },
      });
      if (res.ok) return res;
      if (res.status === 429) {
        const wait = (i + 1) * 5000;
        console.log(`    429 rate limited, waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000);
    }
  }
  return null;
}

// ─── Wikipedia ──────────────────────────────────────

/**
 * Get the main image from a Wikipedia article.
 * Tries: ja.wikipedia (和名) → ja.wikipedia (学名) → en.wikipedia (学名)
 */
async function getWikipediaImage(jaName, scientificName) {
  const sources = [
    { lang: 'ja', title: jaName },
    { lang: 'ja', title: scientificName },
    { lang: 'en', title: scientificName },
  ];

  for (const { lang, title } of sources) {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      piprop: 'original',
      format: 'json',
      origin: '*',
    });

    const url = `https://${lang}.wikipedia.org/w/api.php?${params}`;
    const res = await fetchWithRetry(url);
    if (!res) continue;

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) continue;

    const page = Object.values(pages)[0];
    if (page.missing !== undefined) continue;

    const imgUrl = page.original?.source;
    if (!imgUrl) continue;

    // Filter out SVG, GIF, and very small images
    if (/\.(svg|gif)$/i.test(imgUrl)) continue;

    const wikiPageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    return { url: imgUrl, source: wikiPageUrl, from: `${lang}.wikipedia (${title})` };
  }

  return null;
}

// ─── iNaturalist ────────────────────────────────────

const INAT_MAX_PHOTOS = 9;
const INAT_FETCH_COUNT = 30; // Fetch more to allow user-diverse selection

/**
 * Get Research Grade photos from iNaturalist for additional field images.
 * Returns up to INAT_MAX_PHOTOS photos, prioritizing different observers.
 * Each entry is { url, attribution } for credit display.
 */
async function getINaturalistPhotos(scientificName, maxPhotos = INAT_MAX_PHOTOS) {
  // Step 1: Find taxon ID
  const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`;
  const taxonRes = await fetchWithRetry(taxonUrl);
  if (!taxonRes) return [];

  const taxonData = await taxonRes.json();
  const taxon = taxonData.results?.[0];
  if (!taxon) return [];

  await sleep(1000); // iNaturalist rate limit

  // Step 2: Get research grade observations with photos (fetch extra for diversity)
  const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&quality_grade=research&photos=true&per_page=${INAT_FETCH_COUNT}&order=desc&order_by=votes`;
  const obsRes = await fetchWithRetry(obsUrl);
  if (!obsRes) return [];

  const obsData = await obsRes.json();
  const observations = obsData.results || [];

  // Step 3: Collect photos grouped by observer (user)
  // Each photo carries: url, attribution (observer login), observation id
  const photosByUser = new Map(); // userId -> [{ url, attribution }]

  for (const obs of observations) {
    const userId = obs.user?.id || 'unknown';
    const userName = obs.user?.login || 'unknown';
    if (!photosByUser.has(userId)) photosByUser.set(userId, []);

    for (const photo of (obs.photos || [])) {
      const mediumUrl = photo.url?.replace(/\/square\./i, '/medium.');
      if (!mediumUrl) continue;
      photosByUser.get(userId).push({
        url: mediumUrl,
        attribution: photo.attribution || `© ${userName}`,
      });
    }
  }

  // Step 4: Round-robin selection across users for diversity
  const selected = [];
  const userQueues = [...photosByUser.values()].map(photos => ({ photos, idx: 0 }));

  // Sort users by number of photos descending (so popular observers don't dominate)
  // Actually, we want to spread evenly, so just cycle through users
  let round = 0;
  while (selected.length < maxPhotos) {
    let addedThisRound = false;
    for (const queue of userQueues) {
      if (selected.length >= maxPhotos) break;
      if (queue.idx < queue.photos.length) {
        selected.push(queue.photos[queue.idx]);
        queue.idx++;
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break; // All queues exhausted
    round++;
  }

  return selected;
}

// ─── Download & Convert ─────────────────────────────

async function downloadAndConvert(url, outputPath) {
  const res = await fetchWithRetry(url);
  if (!res) throw new Error('Download returned null');

  const buf = Buffer.from(await res.arrayBuffer());

  // Validate it's an actual image
  const metadata = await sharp(buf).metadata();
  if (!metadata.width || metadata.width < 200) {
    throw new Error(`Image too small: ${metadata.width}x${metadata.height}`);
  }

  await sharp(buf)
    .resize(DETAIL_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: DETAIL_QUALITY })
    .toFile(outputPath);

  return readFileSync(outputPath).byteLength;
}

// ─── Main ───────────────────────────────────────────

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const targets = ONLY ? mushrooms.filter(m => ONLY.includes(m.id)) : mushrooms;

  console.log(`\nProcessing ${targets.length} species${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  const results = { wikipedia: 0, inat_only: 0, failed: 0 };
  const failedList = [];

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;
    const outputPath = join(IMAGES_DIR, `${m.id}.webp`);

    console.log(`${prefix} ${m.names.ja} (${m.names.scientific})`);

    try {
      // ── Step 1: Wikipedia main image ──
      const wikiImg = await getWikipediaImage(m.names.ja, m.names.scientific);
      await sleep(1500);

      if (wikiImg) {
        if (DRY_RUN) {
          console.log(`  ✓ Wikipedia: ${wikiImg.from}`);
        } else {
          const sizeBytes = await downloadAndConvert(wikiImg.url, outputPath);
          const sizeKB = Math.round(sizeBytes / 1024);
          m.image_local = `/images/mushrooms/${m.id}.webp`;
          m.source_url = wikiImg.source;
          console.log(`  ✓ Wikipedia: ${wikiImg.from} — ${sizeKB}KB`);
        }
        results.wikipedia++;
      } else {
        console.log(`  ✗ Wikipedia: not found`);
        failedList.push({ id: m.id, name: m.names.ja, reason: 'no Wikipedia image' });
        results.failed++;
      }

      await sleep(1000);

      // ── Step 2: iNaturalist additional photos ──
      const inatPhotos = await getINaturalistPhotos(m.names.scientific);
      if (inatPhotos.length > 0) {
        m.images_remote = inatPhotos.map(p => p.url);
        m.images_remote_credits = inatPhotos.map(p => p.attribution);
        const uniqueUsers = new Set(inatPhotos.map(p => p.attribution)).size;
        console.log(`  + iNaturalist: ${inatPhotos.length} photos from ${uniqueUsers} users`);
      }

      await sleep(1500);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failedList.push({ id: m.id, name: m.names.ja, reason: err.message });
      results.failed++;
      await sleep(2000);
    }
  }

  // Write updated JSON
  if (!DRY_RUN) {
    writeFileSync(MUSHROOMS_JSON, JSON.stringify(mushrooms, null, 2) + '\n', 'utf8');
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Wikipedia image: ${results.wikipedia}`);
  console.log(`Failed:          ${results.failed}`);
  console.log(`Total:           ${targets.length}`);

  if (failedList.length > 0) {
    console.log('\nFailed species:');
    for (const f of failedList) {
      console.log(`  - ${f.name} (${f.id}): ${f.reason}`);
    }
  }
}

main().catch(console.error);
