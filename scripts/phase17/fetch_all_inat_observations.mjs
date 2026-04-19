#!/usr/bin/env node
/**
 * Phase 17 S6: 大菌輪 pages.json の和名付き 4204 件について、iNat 国内観察数
 * (place_id=6803, 全 quality grade) を accepted 学名で fetch。
 *
 * synonyms 合算は S4 完了後の 2nd pass で追加する想定 (accepted name ひとつで
 * iNat 側の taxon synonym 解決が効くため、多くの種で十分な数値が取れる)。
 *
 * rate: 1 req/sec、exponential backoff 3 回まで
 * 出力: data/phase17/inat-observations.json
 *
 * 使い方:
 *   node scripts/phase17/fetch_all_inat_observations.mjs
 *   node scripts/phase17/fetch_all_inat_observations.mjs --limit 20
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaikinrinPagesIndex } from '../phase13/daikinrin-pages.mjs';
import { fetchDomesticCountOnce } from './inat-observations.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OUTPUT_DIR = join(ROOT, 'data/phase17');
const OUTPUT_PATH = join(OUTPUT_DIR, 'inat-observations.json');

const BASE_INTERVAL_MS = 1000;

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--limit');
  return { limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { limit } = parseArgs();
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries = await fetchDaikinrinPagesIndex();
  const withJa = entries.filter((e) => e.japaneseName);
  const total = Math.min(withJa.length, limit);
  console.log(`Total ja-named entries: ${withJa.length}. Target: ${total}`);

  const results = [];
  const stats = { zero: 0, positive: 0, max: 0, maxEntry: null };
  const startMs = Date.now();
  let lastFetchMs = 0;

  for (let i = 0; i < total; i++) {
    const e = withJa[i];
    // cache hit ならすぐ取る、miss なら rate limit
    const count = await fetchDomesticCountOnce(e.scientificName);
    // 前回 fetch から 1 秒未満なら sleep（cache hit は即スキップ）
    const sinceLast = Date.now() - lastFetchMs;
    if (sinceLast < BASE_INTERVAL_MS) {
      await sleep(BASE_INTERVAL_MS - sinceLast);
    }
    lastFetchMs = Date.now();

    results.push({
      scientificName: e.scientificName,
      japaneseName: e.japaneseName,
      mycoBankId: e.mycoBankId,
      inatDomestic: count,
    });
    if (count > 0) {
      stats.positive++;
      if (count > stats.max) {
        stats.max = count;
        stats.maxEntry = { scientificName: e.scientificName, ja: e.japaneseName, count };
      }
    } else {
      stats.zero++;
    }

    if ((i + 1) % 100 === 0 || i + 1 === total) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      const elapsedSec = Math.round((Date.now() - startMs) / 1000);
      const etaSec = Math.round((elapsedSec * (total - (i + 1))) / Math.max(1, i + 1));
      console.log(
        `[${i + 1}/${total}] positive=${stats.positive} zero=${stats.zero} max=${stats.max} | elapsed=${elapsedSec}s ETA=${etaSec}s`,
      );
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log('\n=== Final Report ===');
  console.log(JSON.stringify({ total, stats, durationSec: Math.round((Date.now() - startMs) / 1000) }, null, 2));
  console.log(`Results written to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
