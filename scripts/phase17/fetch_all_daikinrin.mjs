#!/usr/bin/env node
/**
 * Phase 17 S4: 大菌輪 pages.json の和名付き 4204 件について、個別 HTML を
 * 1 req/sec で fetch + 新 schema (habitat/season/featuresRaw/similarSuggestion 含む) で cache。
 *
 * 機能:
 *  - resume: 既に新 schema でキャッシュ済のものはスキップ
 *  - exponential backoff: 429 / 5xx / network error を 3 回までリトライ
 *  - 失敗ログ: data/phase17/fetch-failures.json
 *  - 進捗: 100 件ごとに統計を stdout
 *  - 最終レポート: data/phase17/fetch-report.json
 *
 * 前提:
 *  - 旧 cache (.cache/phase13/daikinrin/) は旧 schema だが、新 schema を検出
 *    できない旧エントリは強制再 fetch する (schema validation)
 *
 * 使い方:
 *   node scripts/phase17/fetch_all_daikinrin.mjs               # 通常実行
 *   node scripts/phase17/fetch_all_daikinrin.mjs --limit 10     # 最初の 10 件だけ (smoke test)
 *   node scripts/phase17/fetch_all_daikinrin.mjs --rebuild      # cache を無視して全件再 fetch
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPageUrl,
  parseDaikinrinPage,
} from '../phase13/daikinrin.mjs';
import { fetchDaikinrinPagesIndex } from '../phase13/daikinrin-pages.mjs';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const PAGES_CACHE = join(ROOT, '.cache/phase13/daikinrin-pages.json');
const DAIKINRIN_CACHE_DIR = join(ROOT, '.cache/phase13/daikinrin');
const OUTPUT_DIR = join(ROOT, 'data/phase17');
const FAILURES_PATH = join(OUTPUT_DIR, 'fetch-failures.json');
const REPORT_PATH = join(OUTPUT_DIR, 'fetch-report.json');

const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; phase17 ingestion)';
const BASE_INTERVAL_MS = 1000; // 1 req/sec
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000; // 初回 backoff 2s, 次 4s, 次 8s

const daikinrinCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function parseArgs() {
  const args = process.argv.slice(2);
  const limit = (() => {
    const i = args.indexOf('--limit');
    return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
  })();
  const rebuild = args.includes('--rebuild');
  return { limit, rebuild };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * キャッシュ値が新 schema (habitat/season/featuresRaw/similarSuggestion を含む) か判定。
 * 含まなければ旧 schema → 再 fetch 対象。
 */
function isNewSchemaCache(cached) {
  return (
    cached &&
    typeof cached === 'object' &&
    'habitat' in cached &&
    'season' in cached &&
    'featuresRaw' in cached &&
    'similarSuggestion' in cached
  );
}

async function fetchWithBackoff(scientificName, mycoBankId) {
  const url = buildPageUrl(scientificName, mycoBankId);
  let lastErr = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        const html = await res.text();
        return { html, url };
      }
      if (res.status === 404) {
        return { notFound: true, url };
      }
      // 429 / 5xx は retry
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} on ${url}`);
        const wait = BACKOFF_BASE_MS * 2 ** attempt;
        await sleep(wait);
        continue;
      }
      // その他の client error (400/403 等) は retry しない
      return { error: `HTTP ${res.status}`, url };
    } catch (e) {
      lastErr = e;
      const wait = BACKOFF_BASE_MS * 2 ** attempt;
      await sleep(wait);
    }
  }
  return { error: lastErr?.message || 'max retries exceeded', url };
}

function removeOldCacheFiles() {
  // 旧 schema のキャッシュを検出して削除
  if (!existsSync(DAIKINRIN_CACHE_DIR)) return 0;
  const files = readdirSync(DAIKINRIN_CACHE_DIR).filter((f) => f.endsWith('.json'));
  let removed = 0;
  for (const f of files) {
    const p = join(DAIKINRIN_CACHE_DIR, f);
    try {
      const raw = readFileSync(p, 'utf-8');
      const entry = JSON.parse(raw);
      if (!isNewSchemaCache(entry?.data)) {
        unlinkSync(p);
        removed++;
      }
    } catch {
      // 壊れたファイルは削除
      try {
        unlinkSync(p);
        removed++;
      } catch {}
    }
  }
  return removed;
}

async function main() {
  const { limit, rebuild } = parseArgs();

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // pages.json: worktree 内にキャッシュなしなら自動 fetch (軽い 1 req)
  const entries = await fetchDaikinrinPagesIndex();
  const withJa = entries.filter((e) => e.japaneseName);
  const total = Math.min(withJa.length, limit);
  console.log(`Total ja-named entries: ${withJa.length}. Target: ${total}`);

  if (rebuild) {
    console.log('--rebuild: dropping all daikinrin cache files');
    if (existsSync(DAIKINRIN_CACHE_DIR)) {
      for (const f of readdirSync(DAIKINRIN_CACHE_DIR)) {
        unlinkSync(join(DAIKINRIN_CACHE_DIR, f));
      }
    }
  } else {
    const removed = removeOldCacheFiles();
    if (removed > 0) console.log(`Removed ${removed} old-schema cache files.`);
  }

  const stats = {
    totalTarget: total,
    fetched: 0,
    cached: 0,
    notFound: 0,
    failed: 0,
    habitatHit: 0,
    seasonHit: 0,
    synonymsHit: 0,
    featuresRawHit: 0,
    similarSuggestionHit: 0,
  };
  const failures = [];

  const startMs = Date.now();
  for (let i = 0; i < total; i++) {
    const entry = withJa[i];
    const cacheKey = `${entry.scientificName}_${entry.mycoBankId}`;

    // resume: 新 schema でキャッシュ済ならスキップ
    const cachedRaw = await daikinrinCache.get(cacheKey);
    if (cachedRaw && isNewSchemaCache(cachedRaw)) {
      stats.cached++;
      updateFieldStats(stats, cachedRaw);
      maybeLogProgress(i + 1, total, stats, startMs);
      continue;
    }

    // fetch (rate-limited)
    await sleep(BASE_INTERVAL_MS);
    const r = await fetchWithBackoff(entry.scientificName, entry.mycoBankId);

    if (r.notFound) {
      stats.notFound++;
      failures.push({
        scientificName: entry.scientificName,
        japaneseName: entry.japaneseName,
        mycoBankId: entry.mycoBankId,
        reason: '404 not found',
        url: r.url,
      });
      maybeLogProgress(i + 1, total, stats, startMs);
      continue;
    }
    if (r.error) {
      stats.failed++;
      failures.push({
        scientificName: entry.scientificName,
        japaneseName: entry.japaneseName,
        mycoBankId: entry.mycoBankId,
        reason: r.error,
        url: r.url,
      });
      maybeLogProgress(i + 1, total, stats, startMs);
      continue;
    }

    // parse + cache
    try {
      const parsed = parseDaikinrinPage(r.html);
      const record = {
        url: r.url,
        fetchedAt: new Date().toISOString(),
        ...parsed,
      };
      await daikinrinCache.set(cacheKey, record);
      stats.fetched++;
      updateFieldStats(stats, record);
    } catch (e) {
      stats.failed++;
      failures.push({
        scientificName: entry.scientificName,
        japaneseName: entry.japaneseName,
        mycoBankId: entry.mycoBankId,
        reason: `parse error: ${e.message}`,
        url: r.url,
      });
    }

    // 失敗ログを定期的に書き出し
    if ((i + 1) % 100 === 0) {
      writeFileSync(FAILURES_PATH, JSON.stringify(failures, null, 2));
    }
    maybeLogProgress(i + 1, total, stats, startMs);
  }

  // 最終レポート
  writeFileSync(FAILURES_PATH, JSON.stringify(failures, null, 2));
  const durationSec = Math.round((Date.now() - startMs) / 1000);
  const report = {
    ...stats,
    durationSec,
    finishedAt: new Date().toISOString(),
    hitRates: {
      habitat: pct(stats.habitatHit, stats.fetched + stats.cached),
      season: pct(stats.seasonHit, stats.fetched + stats.cached),
      synonyms: pct(stats.synonymsHit, stats.fetched + stats.cached),
      featuresRaw: pct(stats.featuresRawHit, stats.fetched + stats.cached),
      similarSuggestion: pct(stats.similarSuggestionHit, stats.fetched + stats.cached),
    },
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== Final Report ===');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Failures written to ${FAILURES_PATH}`);
  console.log(`Report written to ${REPORT_PATH}`);
}

function updateFieldStats(stats, record) {
  if (record.habitat && Object.keys(record.habitat).length > 0) stats.habitatHit++;
  if (record.season && (record.season.tags || []).length > 0) stats.seasonHit++;
  if (Array.isArray(record.synonyms) && record.synonyms.length > 0) stats.synonymsHit++;
  if (record.featuresRaw && Object.keys(record.featuresRaw).length > 0) stats.featuresRawHit++;
  if (Array.isArray(record.similarSuggestion) && record.similarSuggestion.length > 0)
    stats.similarSuggestionHit++;
}

function pct(n, d) {
  return d > 0 ? ((n / d) * 100).toFixed(1) + '%' : 'n/a';
}

function maybeLogProgress(done, total, stats, startMs) {
  if (done % 100 !== 0 && done !== total) return;
  const elapsedSec = Math.round((Date.now() - startMs) / 1000);
  const etaSec = done > 0 ? Math.round((elapsedSec * (total - done)) / done) : 0;
  console.log(
    `[${done}/${total}] fetched=${stats.fetched} cached=${stats.cached} notFound=${stats.notFound} failed=${stats.failed} | elapsed=${elapsedSec}s ETA=${etaSec}s`,
  );
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
