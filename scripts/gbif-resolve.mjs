/**
 * GBIF Backbone Taxonomy シノニム解決スクリプト
 *
 * 全種の学名を GBIF species/match で正式名に解決する。
 * SYNONYM → acceptedUsageKey から正式名取得 + synonyms[] 列挙。
 * ACCEPTED → そのまま。
 * NONE / FUZZY / HIGHERRANK → 要人間確認としてフラグ。
 *
 * Usage:
 *   node scripts/gbif-resolve.mjs                    # 全種処理 (キャッシュ利用)
 *   node scripts/gbif-resolve.mjs --reset            # キャッシュ無視して再取得
 *   node scripts/gbif-resolve.mjs --only=koutake     # 特定種のみ
 *   node scripts/gbif-resolve.mjs --dry-run          # fetch なし (キャッシュ確認)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const OUT_FILE = join(ROOT, 'scripts/temp/gbif-results.json');
const TEMP_DIR = join(ROOT, 'scripts/temp');

const ARGS = process.argv.slice(2);
const RESET = ARGS.includes('--reset');
const DRY_RUN = ARGS.includes('--dry-run');
const ONLY = ARGS.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',');

const AUTO_APPLY_THRESHOLD = 90;
const RATE_LIMIT_MS = 200; // 5 req/sec
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; species verification)';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return await res.json();
      if (res.status === 429) {
        const wait = Number(res.headers.get('Retry-After') || (i + 1) * 5) * 1000;
        console.log(`  429 rate limited, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  return null;
}

async function gbifMatch(sciName) {
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sciName)}&strict=false`;
  return await fetchJSON(url);
}

async function gbifGetUsage(usageKey) {
  return await fetchJSON(`https://api.gbif.org/v1/species/${usageKey}`);
}

async function gbifGetSynonyms(usageKey) {
  const data = await fetchJSON(`https://api.gbif.org/v1/species/${usageKey}/synonyms?limit=100`);
  if (!data?.results) return [];
  // 種ランクのシノニムのみ、canonicalName を重複排除
  const names = data.results
    .filter(r => r.rank === 'SPECIES' || r.rank === 'VARIETY' || r.rank === 'SUBSPECIES')
    .map(r => r.canonicalName)
    .filter(Boolean);
  return [...new Set(names)];
}

async function resolveSpecies(species) {
  const input = species.names.scientific;
  const match = await gbifMatch(input);
  if (!match) {
    return { input, status: 'NONE', matchType: null, confidence: 0, note: 'GBIF no response' };
  }

  const common = {
    input,
    status: match.status || 'NONE',
    matchType: match.matchType || null,
    confidence: match.confidence ?? 0,
    usageKey: match.usageKey ?? null,
    acceptedUsageKey: match.acceptedUsageKey ?? null,
  };

  if (match.status === 'ACCEPTED') {
    await sleep(RATE_LIMIT_MS);
    const synonyms = match.usageKey ? await gbifGetSynonyms(match.usageKey) : [];
    return {
      ...common,
      accepted: match.canonicalName,
      taxonomy: pickTaxonomy(match),
      synonyms,
      autoApply: match.matchType === 'EXACT' && common.confidence >= AUTO_APPLY_THRESHOLD,
    };
  }

  if (match.status === 'SYNONYM' && match.acceptedUsageKey) {
    await sleep(RATE_LIMIT_MS);
    const accepted = await gbifGetUsage(match.acceptedUsageKey);
    if (!accepted) {
      return { ...common, note: 'SYNONYM but acceptedUsage fetch failed' };
    }
    await sleep(RATE_LIMIT_MS);
    const synonyms = await gbifGetSynonyms(match.acceptedUsageKey);
    return {
      ...common,
      accepted: accepted.canonicalName,
      taxonomy: pickTaxonomy(accepted),
      synonyms: [input, ...synonyms.filter(n => n !== accepted.canonicalName)],
      autoApply: match.matchType === 'EXACT' && common.confidence >= AUTO_APPLY_THRESHOLD,
    };
  }

  // FUZZY / HIGHERRANK / NONE → 要人間確認
  return {
    ...common,
    accepted: match.canonicalName || null,
    taxonomy: pickTaxonomy(match),
    synonyms: [],
    autoApply: false,
    note: match.status === 'ACCEPTED'
      ? `${match.matchType} match, needs review`
      : match.note || match.matchType || 'not resolved',
  };
}

function pickTaxonomy(m) {
  if (!m) return null;
  return {
    kingdom: m.kingdom,
    phylum: m.phylum,
    class: m.class,
    order: m.order,
    family: m.family,
    genus: m.genus,
  };
}

async function main() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const cache = !RESET && existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
    : {};

  const targets = ONLY
    ? mushrooms.filter(m => ONLY.includes(m.id))
    : mushrooms;

  console.log(`GBIF resolver: ${targets.length} species (cache hits: ${Object.keys(cache).length})`);
  if (DRY_RUN) {
    console.log('(dry run — no network calls)');
  }

  let processed = 0;
  let autoApplyCount = 0;
  let needsReviewCount = 0;

  for (const m of targets) {
    if (cache[m.id] && !RESET) {
      processed++;
      if (cache[m.id].autoApply) autoApplyCount++;
      else needsReviewCount++;
      continue;
    }
    if (DRY_RUN) continue;

    try {
      const result = await resolveSpecies(m);
      cache[m.id] = result;
      const badge = result.autoApply ? '✓' : (result.status === 'ACCEPTED' ? '·' : '!');
      const acc = result.accepted && result.accepted !== result.input
        ? ` → ${result.accepted}`
        : '';
      console.log(`  ${badge} ${m.id.padEnd(30)} ${result.status.padEnd(8)} ${result.matchType || '-'.padEnd(8)} c=${result.confidence}${acc}`);

      if (result.autoApply) autoApplyCount++;
      else needsReviewCount++;

      processed++;
      if (processed % 20 === 0) {
        writeFileSync(OUT_FILE, JSON.stringify(cache, null, 2) + '\n');
        console.log(`  [cache flushed: ${processed}/${targets.length}]`);
      }
      await sleep(RATE_LIMIT_MS);
    } catch (e) {
      console.error(`  ✗ ${m.id}: ${e.message}`);
      cache[m.id] = { input: m.names.scientific, status: 'ERROR', note: e.message };
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(cache, null, 2) + '\n');

  // サマリー
  const all = Object.values(cache);
  const changed = all.filter(r => r.accepted && r.accepted !== r.input);
  console.log('\n=== Summary ===');
  console.log(`Total:        ${all.length}`);
  console.log(`Auto-apply:   ${all.filter(r => r.autoApply).length}`);
  console.log(`Name changes: ${changed.length}`);
  console.log(`ACCEPTED:     ${all.filter(r => r.status === 'ACCEPTED').length}`);
  console.log(`SYNONYM:      ${all.filter(r => r.status === 'SYNONYM').length}`);
  console.log(`DOUBTFUL:     ${all.filter(r => r.status === 'DOUBTFUL').length}`);
  console.log(`NONE/other:   ${all.filter(r => !['ACCEPTED','SYNONYM','DOUBTFUL'].includes(r.status)).length}`);
  console.log(`FUZZY match:  ${all.filter(r => r.matchType === 'FUZZY').length}`);
  console.log(`HIGHERRANK:   ${all.filter(r => r.matchType === 'HIGHERRANK').length}`);

  console.log(`\nOutput: ${OUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
