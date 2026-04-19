#!/usr/bin/env node
/**
 * Phase 17 S4 補完: ja-name-overrides.json の 4 種のうち、大菌輪に学名ページ
 * だけある (和名フィールド null) 種 3 件を追加で fetch + parse して cache に
 * 入れる。
 *
 * 対象:
 *  - Entoloma murrayi (キイボカサタケ, mbId=158631)
 *  - Entoloma quadratum (アカイボカサタケ, mbId=313803)
 *  - Tricholoma equestre (キシメジ, mbId=176119)
 *
 * ウラベニホテイシメジ (Entoloma sarcopus) は大菌輪に学名すら無いので対象外。
 * 同種は master で旧 approved 本文のみで運用する。
 *
 * 軽量 3 req なのでバッチ fetch の sleep は省略。1 req ごと 1 秒 sleep。
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPageUrl, parseDaikinrinPage } from '../phase13/daikinrin.mjs';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OVERRIDES = join(ROOT, 'data/phase17/ja-name-overrides.json');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; phase17 override supplement)';

const cache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const overrides = JSON.parse(readFileSync(OVERRIDES, 'utf-8'));
  const targets = overrides.filter((o) => o.daikinrinHasScientificPage && o.mycoBankId);
  console.log(`Supplement fetch targets: ${targets.length}`);

  for (const t of targets) {
    const cacheKey = `${t.scientificName}_${t.mycoBankId}`;
    const cached = await cache.get(cacheKey);
    if (cached && 'habitat' in cached) {
      console.log(`[skip cached] ${t.scientificName}`);
      continue;
    }
    const url = buildPageUrl(t.scientificName, t.mycoBankId);
    console.log(`[fetch] ${t.japaneseName} / ${t.scientificName} → ${url}`);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      console.error(`  FAIL: HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const parsed = parseDaikinrinPage(html);
    const record = { url, fetchedAt: new Date().toISOString(), ...parsed };
    await cache.set(cacheKey, record);
    console.log(
      `  OK: synonyms=${parsed.synonyms.length} habitat=${Object.keys(parsed.habitat).length} features=${Object.keys(parsed.featuresRaw).length}`,
    );
    await sleep(1000);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
