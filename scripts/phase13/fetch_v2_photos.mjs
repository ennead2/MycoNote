/**
 * Phase 13-G / 14+: v2 図鑑の画像取得
 *
 * 方針:
 *   - Hero: Wikipedia ja → en → 学名 synonyms の順にフォールバック
 *   - Gallery: iNaturalist Research Grade + CC ライセンス画像
 *   - ライセンス優先順位: cc0 > cc-by > cc-by-nc > cc-by-sa > cc-by-nc-sa > cc-by-nd > cc-by-nc-nd
 *   - all-rights-reserved は採用しない
 *   - 選別ルール（優先順位の高い順）:
 *     1. ユーザー分散最大（同一ユーザーの写真が偏らない）
 *     2. Japan 観察（place_id=6737）優先（同順位内で先出し）
 *     3. ユーザー内は JP 写真 → global 写真の順
 *   - ヒーロー不在のとき iNat を +1 枚取得（ギャラリー 3x3 を維持）
 *   - scientific_synonyms を taxon 解決のフォールバックとして使用
 *
 * Usage:
 *   node scripts/phase13/fetch_v2_photos.mjs                             # 全種
 *   node scripts/phase13/fetch_v2_photos.mjs --only=<id>,<id>            # 対象指定
 *   node scripts/phase13/fetch_v2_photos.mjs --max-photos=N              # iNat 枚数上限 (既定 9)
 *   node scripts/phase13/fetch_v2_photos.mjs --dry-run                   # 書き込まない
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
const INAT_JAPAN_PLACE_ID = 6737; // iNat の Japan place_id

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
export async function getWikipediaImage(jaName, scientificName, synonyms = []) {
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

/** observations を photosByUser (Map<userId, photos[]>) に変換。CC ライセンスのみ採用。 */
function observationsToPhotosByUser(observations) {
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
  return photosByUser;
}

async function fetchObservations(taxonId, { placeId } = {}) {
  const params = new URLSearchParams({
    taxon_id: String(taxonId),
    quality_grade: 'research',
    photos: 'true',
    per_page: String(INAT_FETCH_COUNT),
    order: 'desc',
    order_by: 'votes',
  });
  if (placeId) params.set('place_id', String(placeId));
  const res = await fetchWithRetry(`https://api.inaturalist.org/v1/observations?${params}`);
  if (!res) return [];
  const data = await res.json();
  return data.results || [];
}

/** JP と global の photosByUser を統合。優先順位: 異なるユーザー (round-robin) > Japan 観察先出し。
 *  JP ユーザーを先に Map に insert → Map 反復順（挿入順）で round-robin 時に先に当たる。
 *  各ユーザー内でも JP 写真を先頭に配置。URL 重複は除外。
 */
export function mergeByUserJapanFirst(jpByUser, globalByUser) {
  const merged = new Map();
  for (const [userId, photos] of jpByUser) {
    merged.set(userId, [...photos]);
  }
  for (const [userId, photos] of globalByUser) {
    const existing = merged.get(userId) || [];
    const existingUrls = new Set(existing.map((p) => p.url));
    const extras = photos.filter((p) => !existingUrls.has(p.url));
    merged.set(userId, [...existing, ...extras]);
  }
  return merged;
}

/** iNaturalist Research Grade 写真。ユーザー分散最優先、Japan 観察は同順位内で先出し。 */
export async function getInatPhotos(scientificName, synonyms = [], maxPhotos = INAT_MAX_PHOTOS) {
  const candidates = [scientificName, ...synonyms];

  for (const candidate of candidates) {
    const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(candidate)}&rank=species&per_page=1`;
    const taxonRes = await fetchWithRetry(taxonUrl);
    if (!taxonRes) continue;
    const taxonData = await taxonRes.json();
    const taxon = taxonData.results?.[0];
    if (!taxon) continue;

    await sleep(1000);

    // Japan + global を並行 fetch（両方得て統合プールで分散選択）
    const jpObs = await fetchObservations(taxon.id, { placeId: INAT_JAPAN_PLACE_ID });
    await sleep(1000);
    const globalObs = await fetchObservations(taxon.id);

    const jpByUser = observationsToPhotosByUser(jpObs);
    const globalByUser = observationsToPhotosByUser(globalObs);
    const merged = mergeByUserJapanFirst(jpByUser, globalByUser);

    const selected = selectByUserDispersion(merged, maxPhotos);
    if (selected.length > 0) {
      const jpCount = selected.filter((p) => [...jpByUser.values()].flat().some((j) => j.url === p.url)).length;
      const matchedVia = jpCount > 0
        ? `${candidate} (users:${[...merged.keys()].filter((k) => merged.get(k).length > 0).length}, JP:${jpCount})`
        : `${candidate} (users:${[...merged.keys()].filter((k) => merged.get(k).length > 0).length})`;
      return { photos: selected, matchedName: matchedVia };
    }
  }

  return { photos: [], matchedName: null };
}

export async function downloadAndConvert(url, outputPath) {
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
  const maxPhotosArg = process.argv.find((a) => a.startsWith('--max-photos='))?.split('=')[1];
  const maxPhotos = maxPhotosArg ? Number(maxPhotosArg) : INAT_MAX_PHOTOS;

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

      // wiki hero が無い種はギャラリー 3x3 を保つため 1 枚多く取得（1 枚は hero 流用で消費される）
      const inatTarget = wikiImg ? maxPhotos : maxPhotos + 1;
      const { photos, matchedName } = await getInatPhotos(m.names.scientific, synonyms, inatTarget);
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
