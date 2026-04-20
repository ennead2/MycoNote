#!/usr/bin/env node
/**
 * Phase 17 補正: tier0 (Wikipedia JA あり判定) 396 件について、
 * redirect の妥当性を検証して偽 tier0 を洗い出す。
 *
 * 問題例:
 *   「カンタケ」(Agaricus spodoleucus) → Wikipedia ja は「ヒラタケ」に redirect
 *   redirect 先は全く別種 (属すら違う) なので、カンタケ単独の記事は無い
 *   → 実質 tier2 にすべき
 *
 * 検証ロジック:
 *   1. matchedTitle で Wikipedia ja を叩き、redirect されたか確認
 *   2. redirect 先の title が acceptableTitles (和名 / 学名 / synonyms) のいずれかと
 *      完全一致するか確認
 *   3. 一致しなければ偽 tier0 → tier 下げる (en があれば tier1、無ければ tier2)
 *
 * 出力:
 *   - data/phase17/wikipedia-availability.json を上書き (tier を補正)
 *   - data/phase17/tier0-redirect-verification.json (検証結果レポート)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const REPORT = join(ROOT, 'data/phase17/tier0-redirect-verification.json');

const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; phase17 redirect verify)';
const BASE_INTERVAL = 1000;
const cache = createCache({ dir: join(ROOT, '.cache/phase17'), namespace: 'wikipedia-redirect' });

const daikinrinCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchArticleMeta(lang, title) {
  const key = `${lang}:${title}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    action: 'query', titles: title, format: 'json', redirects: '1', origin: '*',
  });
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}`;
  let result;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!r.ok) { result = { exists: false, error: `HTTP ${r.status}` }; }
    else {
      const j = await r.json();
      const pages = j?.query?.pages;
      if (!pages) result = { exists: false };
      else {
        const pid = Object.keys(pages)[0];
        const page = pages[pid];
        if (!page || page.missing !== undefined) result = { exists: false };
        else {
          const redirects = j.query.redirects || [];
          result = {
            exists: true,
            finalTitle: page.title,
            redirected: redirects.length > 0,
            redirectChain: redirects.map((r) => ({ from: r.from, to: r.to })),
          };
        }
      }
    }
  } catch (e) {
    result = { exists: false, error: e.message };
  }
  await cache.set(key, result);
  return result;
}

async function main() {
  const wiki = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const tier0 = wiki.filter((w) => w.tier === 0);
  console.log(`tier0 entries to verify: ${tier0.length}`);

  const report = {
    total: tier0.length,
    verified_ok: 0,
    demoted_to_tier1: 0,
    demoted_to_tier2: 0,
    errors: 0,
    demotions: [],
  };

  let lastFetch = 0;
  for (let i = 0; i < tier0.length; i++) {
    const e = tier0[i];
    const title = e.wikipediaJa.matchedTitle;
    if (!title) {
      // matchedTitle ないのに exists=true はありえない想定だがスキップ
      continue;
    }

    // 大菌輪 cache から synonyms 取得
    let synonyms = [];
    if (e.mycoBankId) {
      const dk = await daikinrinCache.get(`${e.scientificName}_${e.mycoBankId}`);
      synonyms = dk?.synonyms || [];
    }
    const acceptable = new Set([e.japaneseName, e.scientificName, ...synonyms]);

    // rate limit
    const since = Date.now() - lastFetch;
    if (since < BASE_INTERVAL) await sleep(BASE_INTERVAL - since);
    lastFetch = Date.now();

    const meta = await fetchArticleMeta('ja', title);
    if (!meta.exists || meta.error) {
      report.errors++;
      continue;
    }
    if (!meta.redirected) {
      report.verified_ok++;
      continue;
    }
    // redirect された → 最終 title が acceptable に含まれるか
    if (acceptable.has(meta.finalTitle)) {
      report.verified_ok++;
      continue;
    }

    // 偽 tier0 確定
    const newTier = e.wikipediaEn.exists ? 1 : 2;
    if (newTier === 1) report.demoted_to_tier1++;
    else report.demoted_to_tier2++;
    report.demotions.push({
      japaneseName: e.japaneseName,
      scientificName: e.scientificName,
      originalTier: 0,
      newTier,
      redirectTo: meta.finalTitle,
      redirectChain: meta.redirectChain,
    });

    // wiki 配列を直接更新
    e.tier = newTier;
    e.wikipediaJa.exists = false;
    e.wikipediaJa.matchedTitle = null;
    e.wikipediaJa.demoted = { reason: 'redirect_to_unrelated', redirectTo: meta.finalTitle };

    if ((i + 1) % 50 === 0 || i + 1 === tier0.length) {
      console.log(
        `[${i + 1}/${tier0.length}] ok=${report.verified_ok} demote1=${report.demoted_to_tier1} demote2=${report.demoted_to_tier2} err=${report.errors}`,
      );
    }
  }

  writeFileSync(WIKI_AVAIL, JSON.stringify(wiki, null, 2));
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log('\n=== Final Report ===');
  console.log(JSON.stringify(report, (k, v) => (k === 'demotions' ? `(${v.length} items, see ${REPORT})` : v), 2));
  console.log(`Updated: ${WIKI_AVAIL}`);
  console.log(`Report: ${REPORT}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
