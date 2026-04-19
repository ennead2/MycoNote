#!/usr/bin/env node
/**
 * Phase 17 S5: 大菌輪 pages.json の和名付き 4204 件について、Wikipedia JA/EN の
 * 記事存在を学名 + 和名でチェック (軽量 API call)。
 *
 * 新 tier 定義:
 *  tier0: Wikipedia JA あり
 *  tier1: Wikipedia JA なし / EN あり
 *  tier2: 両方なし
 *
 * チェック順序 (ja):
 *  1. 和名 (大菌輪 primary ja)
 *  2. 学名 (大菌輪 accepted scientific)
 *
 * チェック順序 (en):
 *  1. 学名 (大菌輪 accepted scientific)
 *  2. 和名 (通常 ヒットしないが 念のため)
 *
 * 注意: synonyms 合算は S4 完了後の 2nd pass で実装（accepted scientific name
 * だけで十分ヒットする種が大半、差分補完は後回し）。
 *
 * rate: 1 req/sec、exponential backoff 3 回まで
 * 出力: data/phase17/wikipedia-availability.json
 *
 * 使い方:
 *   node scripts/phase17/fetch_all_wikipedia_availability.mjs
 *   node scripts/phase17/fetch_all_wikipedia_availability.mjs --limit 20
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaikinrinPagesIndex } from '../phase13/daikinrin-pages.mjs';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OUTPUT_DIR = join(ROOT, 'data/phase17');
const OUTPUT_PATH = join(OUTPUT_DIR, 'wikipedia-availability.json');
const CACHE_DIR = join(ROOT, '.cache/phase17');

const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; phase17 wiki availability)';
const BASE_INTERVAL_MS = 1000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;

const cache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-availability' });

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--limit');
  return { limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseExistsResponse(json) {
  const pages = json?.query?.pages;
  if (!pages) return false;
  const ids = Object.keys(pages);
  if (ids.length === 0) return false;
  const page = pages[ids[0]];
  return !!page && page.missing === undefined;
}

async function checkTitleWithBackoff(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    format: 'json',
    redirects: '1',
    origin: '*',
  });
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        const json = await res.json();
        return { exists: parseExistsResponse(json) };
      }
      if (res.status === 429 || res.status >= 500) {
        await sleep(BACKOFF_BASE_MS * 2 ** attempt);
        continue;
      }
      // 404 等は「存在しない」扱い
      return { exists: false };
    } catch (e) {
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }
  // 最終失敗: 429/5xx で 3 回全滅なら **キャッシュしない** (false を永続化して汚染した Phase 13 のバグ踏襲しない)
  return { error: 'retry exhausted', exists: false };
}

async function checkTitleCached(lang, title) {
  const key = `${lang}:${title}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;
  const r = await checkTitleWithBackoff(lang, title);
  // エラーで終わった場合はキャッシュしない（汚染防止）
  if (!r.error) {
    await cache.set(key, r.exists);
  }
  return r.exists;
}

/**
 * 学名 + 和名で WP ja / en のいずれかヒットすれば true。
 */
async function checkWikipedia(lang, { ja, sci }, rateLimiter) {
  // 言語ごとのチェック順
  const candidates = lang === 'ja' ? [ja, sci] : [sci, ja];
  for (const title of candidates) {
    if (!title) continue;
    // cache hit のみなら rate limit スキップ
    const cachedValue = await cache.get(`${lang}:${title}`);
    if (cachedValue === null) {
      await rateLimiter();
    }
    const exists = await checkTitleCached(lang, title);
    if (exists) return { exists: true, matchedTitle: title };
  }
  return { exists: false, matchedTitle: null };
}

async function main() {
  const { limit } = parseArgs();
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries = await fetchDaikinrinPagesIndex();
  const withJa = entries.filter((e) => e.japaneseName);
  const total = Math.min(withJa.length, limit);
  console.log(`Total ja-named entries: ${withJa.length}. Target: ${total}`);

  const stats = { ja: 0, en: 0, tier0: 0, tier1: 0, tier2: 0 };
  const results = [];

  const startMs = Date.now();
  let lastFetchMs = 0;
  const rateLimiter = async () => {
    const sinceLast = Date.now() - lastFetchMs;
    if (sinceLast < BASE_INTERVAL_MS) {
      await sleep(BASE_INTERVAL_MS - sinceLast);
    }
    lastFetchMs = Date.now();
  };

  for (let i = 0; i < total; i++) {
    const e = withJa[i];
    const ja = await checkWikipedia('ja', { ja: e.japaneseName, sci: e.scientificName }, rateLimiter);
    const en = await checkWikipedia('en', { ja: e.japaneseName, sci: e.scientificName }, rateLimiter);

    if (ja.exists) stats.ja++;
    if (en.exists) stats.en++;
    let tier = 2;
    if (ja.exists) tier = 0;
    else if (en.exists) tier = 1;
    stats[`tier${tier}`]++;

    results.push({
      scientificName: e.scientificName,
      japaneseName: e.japaneseName,
      mycoBankId: e.mycoBankId,
      wikipediaJa: { exists: ja.exists, matchedTitle: ja.matchedTitle },
      wikipediaEn: { exists: en.exists, matchedTitle: en.matchedTitle },
      tier,
    });

    if ((i + 1) % 100 === 0 || i + 1 === total) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      const elapsedSec = Math.round((Date.now() - startMs) / 1000);
      const etaSec = Math.round((elapsedSec * (total - (i + 1))) / Math.max(1, i + 1));
      console.log(
        `[${i + 1}/${total}] ja=${stats.ja} en=${stats.en} tier0=${stats.tier0} tier1=${stats.tier1} tier2=${stats.tier2} | elapsed=${elapsedSec}s ETA=${etaSec}s`,
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
