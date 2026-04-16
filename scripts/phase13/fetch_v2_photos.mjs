/**
 * Phase 13-G: v2 60 種の画像取得
 *
 * Fork of scripts/fetch-photos-v2.mjs with v2-specific changes:
 * - all-rights-reserved 写真を除外
 * - scientific_synonyms フォールバック
 * - カバレッジレポート出力 (data/v2-image-coverage.json)
 * - 撮影者名 + ライセンスを attribution として保存
 *
 * Usage:
 *   node scripts/phase13/fetch_v2_photos.mjs [--dry-run] [--only=<id>,<id>]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const IMAGES_DIR = join(ROOT, 'public/images/mushrooms');
const COVERAGE_PATH = join(ROOT, 'data/v2-image-coverage.json');

const DETAIL_WIDTH = 800;
const DETAIL_QUALITY = 80;
const INAT_MAX_PHOTOS = 9;
const INAT_FETCH_COUNT = 30;

// ライセンス: cc0 / cc-by* のみ採用、all-rights-reserved は除外
const ACCEPTED_LICENSES = new Set([
  'cc0',
  'cc-by',
  'cc-by-nc',
  'cc-by-sa',
  'cc-by-nc-sa',
  'cc-by-nd',
  'cc-by-nc-nd',
]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== Pure helpers (testable) =====

export function isAcceptedLicense(licenseCode) {
  if (!licenseCode) return false;
  return ACCEPTED_LICENSES.has(licenseCode.toLowerCase());
}

const LICENSE_LABEL = {
  cc0: 'CC0',
  'cc-by': 'CC BY',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-nd': 'CC BY-NC-ND',
};

export function formatAttribution(userLogin, licenseCode) {
  const label = LICENSE_LABEL[licenseCode?.toLowerCase()] ?? licenseCode ?? '';
  return label ? `(c) ${userLogin}, ${label}` : `(c) ${userLogin}`;
}

/** ユーザー分散ラウンドロビン選択。各 user バケットから 1 枚ずつ循環的に取り出す。 */
export function selectByUserDispersion(photosByUser, maxPhotos) {
  const queues = [...photosByUser.values()].map((photos) => ({ photos, idx: 0 }));
  const selected = [];
  while (selected.length < maxPhotos) {
    let added = false;
    for (const q of queues) {
      if (selected.length >= maxPhotos) break;
      if (q.idx < q.photos.length) {
        selected.push(q.photos[q.idx]);
        q.idx++;
        added = true;
      }
    }
    if (!added) break;
  }
  return selected;
}

// ===== Network ops =====

async function fetchWithRetry(url, opts = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': 'MycoNote/2.0 (https://github.com/ennead2/MycoNote)', ...opts.headers },
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

/** Wikipedia 代表画像: ja(和名) → ja(学名) → ja(synonym) → en(学名) の優先順位。 */
async function getWikipediaImage(jaName, scientificName, synonyms = []) {
  const sources = [
    { lang: 'ja', title: jaName },
    { lang: 'ja', title: scientificName },
    ...synonyms.map((s) => ({ lang: 'ja', title: s })),
    { lang: 'en', title: scientificName },
    ...synonyms.map((s) => ({ lang: 'en', title: s })),
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
    if (/\.(svg|gif)$/i.test(imgUrl)) continue;

    const wikiPageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    return { url: imgUrl, source: wikiPageUrl, from: `${lang}.wikipedia (${title})` };
  }
  return null;
}

/** iNaturalist Research Grade 写真。CC ライセンスのみ、ユーザー分散選択。 */
async function getInatPhotos(scientificName, synonyms = [], maxPhotos = INAT_MAX_PHOTOS) {
  const candidates = [scientificName, ...synonyms];

  for (const candidate of candidates) {
    const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(candidate)}&rank=species&per_page=1`;
    const taxonRes = await fetchWithRetry(taxonUrl);
    if (!taxonRes) continue;

    const taxonData = await taxonRes.json();
    const taxon = taxonData.results?.[0];
    if (!taxon) continue;

    await sleep(1000);

    const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&quality_grade=research&photos=true&per_page=${INAT_FETCH_COUNT}&order=desc&order_by=votes`;
    const obsRes = await fetchWithRetry(obsUrl);
    if (!obsRes) continue;

    const obsData = await obsRes.json();
    const observations = obsData.results || [];
    if (observations.length === 0) continue;

    const photosByUser = new Map();
    for (const obs of observations) {
      const userId = obs.user?.id || 'unknown';
      const userName = obs.user?.login || 'unknown';
      if (!photosByUser.has(userId)) photosByUser.set(userId, []);

      for (const photo of obs.photos || []) {
        if (!isAcceptedLicense(photo.license_code)) continue;
        const mediumUrl = photo.url?.replace(/\/square\./i, '/medium.');
        if (!mediumUrl) continue;
        photosByUser.get(userId).push({
          url: mediumUrl,
          attribution: formatAttribution(userName, photo.license_code),
        });
      }
    }

    const selected = selectByUserDispersion(photosByUser, maxPhotos);
    if (selected.length > 0) {
      return { photos: selected, matchedName: candidate };
    }
  }

  return { photos: [], matchedName: null };
}

async function downloadAndConvert(url, outputPath) {
  const res = await fetchWithRetry(url);
  if (!res) throw new Error('Download returned null');

  const buf = Buffer.from(await res.arrayBuffer());
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

// ===== Main =====

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]?.split(',');

  mkdirSync(IMAGES_DIR, { recursive: true });
  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const targets = only ? mushrooms.filter((m) => only.includes(m.id)) : mushrooms;

  console.log(`\nProcessing ${targets.length} v2 species${dryRun ? ' (DRY RUN)' : ''}...\n`);

  const coverage = [];
  let totalRemoteBytes = 0;

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;
    const outputPath = join(IMAGES_DIR, `${m.id}.webp`);
    const synonyms = m.names.scientific_synonyms ?? [];
    const entry = {
      id: m.id,
      ja: m.names.ja,
      scientific: m.names.scientific,
      hero: null,
      heroSource: null,
      remote: 0,
      remoteMatchedVia: null,
      bytesHero: 0,
    };

    console.log(`${prefix} ${m.names.ja} (${m.names.scientific})`);

    try {
      const wikiImg = await getWikipediaImage(m.names.ja, m.names.scientific, synonyms);
      await sleep(1500);

      if (wikiImg) {
        if (dryRun) {
          console.log(`  ✓ Wikipedia: ${wikiImg.from}`);
        } else {
          const bytes = await downloadAndConvert(wikiImg.url, outputPath);
          m.image_local = `/images/mushrooms/${m.id}.webp`;
          entry.hero = m.image_local;
          entry.heroSource = wikiImg.source;
          entry.bytesHero = bytes;
          console.log(`  ✓ Wikipedia: ${wikiImg.from} — ${Math.round(bytes / 1024)}KB`);
        }
      } else {
        console.log(`  ✗ Wikipedia: not found`);
      }

      await sleep(1000);

      const { photos, matchedName } = await getInatPhotos(m.names.scientific, synonyms);
      if (photos.length > 0) {
        m.images_remote = photos.map((p) => p.url);
        m.images_remote_credits = photos.map((p) => p.attribution);
        entry.remote = photos.length;
        entry.remoteMatchedVia = matchedName;
        const uniqueUsers = new Set(photos.map((p) => p.attribution)).size;
        console.log(`  + iNat: ${photos.length} photos from ${uniqueUsers} users (matched ${matchedName})`);
      } else {
        console.log(`  ✗ iNat: 0 photos accepted (license filter or no observations)`);
      }

      await sleep(1500);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      await sleep(2000);
    }

    totalRemoteBytes += entry.bytesHero;
    coverage.push(entry);
  }

  if (!dryRun) {
    writeFileSync(MUSHROOMS_JSON, JSON.stringify(mushrooms, null, 2) + '\n', 'utf8');
    console.log(`\nwrote ${MUSHROOMS_JSON}`);
  }

  // Coverage report
  const heroHits = coverage.filter((c) => c.hero).length;
  const remoteHits = coverage.filter((c) => c.remote > 0).length;
  const remote5plus = coverage.filter((c) => c.remote >= 5).length;
  const report = {
    generatedAt: new Date().toISOString(),
    total: coverage.length,
    heroHits,
    heroHitRate: coverage.length > 0 ? heroHits / coverage.length : null,
    remoteHits,
    remoteHitRate: coverage.length > 0 ? remoteHits / coverage.length : null,
    remote5plus,
    totalHeroBytes: totalRemoteBytes,
    perSpecies: coverage,
  };

  if (!dryRun) {
    writeFileSync(COVERAGE_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`wrote ${COVERAGE_PATH}`);
  }

  console.log(`\n=== Coverage Summary ===`);
  console.log(`Hero (Wikipedia): ${heroHits}/${coverage.length} (${(report.heroHitRate * 100).toFixed(1)}%)`);
  console.log(`iNat (any):       ${remoteHits}/${coverage.length} (${(report.remoteHitRate * 100).toFixed(1)}%)`);
  console.log(`iNat (≥5):        ${remote5plus}/${coverage.length}`);
  console.log(`Total hero bytes: ${(totalRemoteBytes / 1024).toFixed(0)} KB`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
