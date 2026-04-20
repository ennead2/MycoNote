#!/usr/bin/env node
/**
 * Phase 17: tier0 385 種の写真を収集する。
 *
 * 優先順:
 *  1. 旧 approved (src/data/mushrooms.json) に images_remote あり → そのまま継承
 *  2. 旧 phase16 article に images_remote あり → 継承 (現状 phase16 は images 無し)
 *  3. なければ iNat から新規取得 (scripts/phase13/fetch_v2_photos.mjs の getInatPhotos)
 *
 * 出力:
 *  - data/phase17/tier0-photos.json
 *    { "<scientificName>": { images_remote: [url...], images_remote_credits: [...], matched_name: "...", source: "approved|phase16|inat" } }
 *
 * build_master.mjs で取り込んで master.v1.json に merge する。
 *
 * Rate: iNat 側は 1 req/sec (getInatPhotos が taxon + jp + global の 3 req)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';
import { getInatPhotos } from '../phase13/fetch_v2_photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ARTICLE_MAP = join(ROOT, 'data/phase17/article-map.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const MUSHROOMS = join(ROOT, 'src/data/mushrooms.json');
const PHASE16_DIR = join(ROOT, '../hopeful-brattain-19fc23/generated/articles');
const OUTPUT = join(ROOT, 'data/phase17/tier0-photos.json');

const dkCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--limit');
  return {
    limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity,
    onlyMissing: args.includes('--only-missing'),
  };
}

function loadApprovedByJa() {
  const rows = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
  const map = new Map();
  for (const r of rows) if (r.names?.ja) map.set(r.names.ja, r);
  return map;
}

function loadPhase16(sci) {
  const p = join(PHASE16_DIR, sci.replace(/ /g, '_') + '.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

async function main() {
  const { limit, onlyMissing } = parseArgs();
  mkdirSync(dirname(OUTPUT), { recursive: true });

  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const wiki = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const wikiMap = new Map(wiki.map((w) => [w.scientificName, w]));
  const approvedByJa = loadApprovedByJa();

  // 既存出力あれば resume
  const existing = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf-8')) : {};

  const tier0 = articleMap.filter((e) => wikiMap.get(e.scientificName)?.tier === 0);
  const targets = tier0.slice(0, Math.min(tier0.length, limit));
  console.log(`tier0: ${tier0.length}, preparing ${targets.length}, resume=${Object.keys(existing).length}`);

  const result = { ...existing };
  const stats = { approved: 0, phase16: 0, inat_hit: 0, inat_miss: 0, skipped: 0 };

  for (let i = 0; i < targets.length; i++) {
    const e = targets[i];
    const sci = e.scientificName;
    if (onlyMissing && result[sci]?.images_remote?.length > 0) { stats.skipped++; continue; }
    if (result[sci] && !onlyMissing) { stats.skipped++; continue; }

    // 1. approved 継承
    if (e.article_origin === 'approved') {
      const row = approvedByJa.get(e.japaneseName);
      if (row?.images_remote && row.images_remote.length > 0) {
        result[sci] = {
          images_remote: row.images_remote,
          images_remote_credits: row.images_remote_credits || [],
          matched_name: sci,
          source: 'approved',
        };
        stats.approved++;
        continue;
      }
    }

    // 2. phase16 継承 (通常無いが念のため)
    if (e.article_origin === 'phase16') {
      const art = loadPhase16(sci);
      if (art?.images_remote && art.images_remote.length > 0) {
        result[sci] = {
          images_remote: art.images_remote,
          images_remote_credits: art.images_remote_credits || [],
          matched_name: sci,
          source: 'phase16',
        };
        stats.phase16++;
        continue;
      }
    }

    // 3. iNat fetch (大菌輪 synonyms も fallback に)
    const dk = e.mycoBankId ? await dkCache.get(`${sci}_${e.mycoBankId}`) : null;
    const synonyms = dk?.synonyms || [];
    try {
      const { photos, matchedName } = await getInatPhotos(sci, synonyms);
      if (photos.length > 0) {
        result[sci] = {
          images_remote: photos.map((p) => p.url),
          images_remote_credits: photos.map((p) => ({
            url: p.url,
            attribution: p.attribution,
            license: p.license,
            user_login: p.user_login,
          })),
          matched_name: matchedName,
          source: 'inat',
        };
        stats.inat_hit++;
      } else {
        result[sci] = { images_remote: [], images_remote_credits: [], matched_name: null, source: 'inat_miss' };
        stats.inat_miss++;
      }
    } catch (err) {
      console.warn(`  [err] ${e.japaneseName} / ${sci}: ${err.message}`);
      result[sci] = { images_remote: [], images_remote_credits: [], matched_name: null, source: 'err', error: err.message };
      stats.inat_miss++;
    }

    if ((i + 1) % 20 === 0 || i + 1 === targets.length) {
      writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
      console.log(`[${i + 1}/${targets.length}] ${e.japaneseName} (${e.article_origin}) | approved=${stats.approved} ph16=${stats.phase16} iNat=${stats.inat_hit}/${stats.inat_miss} skip=${stats.skipped}`);
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log('\n=== Final ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Wrote: ${OUTPUT}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
