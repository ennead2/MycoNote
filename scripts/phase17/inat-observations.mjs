/**
 * iNaturalist の国内観察数 (place_id=6803, Japan) を学名ベースで取得する fetcher。
 *
 * Phase 17 議題 1 での user 判断:
 *  - 観察数は GBIF と iNat を合算、国内のみ (place_id=6803)、全 quality grade (casual 含む)
 *
 * 挙動:
 *  - accepted 学名と synonyms[] を順に taxon_name クエリで試行
 *  - 各ヒット件数を合算（シノニム同士は iNat 側で taxon merge されるのが通例で、
 *    多くの場合片方のみ正数だが、独立ヒットもあり得るので合算する）
 *  - 失敗 (非 200) は 0 として扱う
 *
 * Phase 13 の inat-photos とは独立。こちらは全 grade かつ photos filter なし。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase17');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; observations)';
const JAPAN_PLACE_ID = 6803;

const cache = createCache({ dir: CACHE_DIR, namespace: 'inat-observations' });

/**
 * iNat observations API レスポンスから `total_results` を安全に取り出す。
 * @param {unknown} json
 * @returns {number}
 */
export function parseTotalResults(json) {
  if (json && typeof json === 'object' && 'total_results' in json) {
    const n = /** @type {{ total_results: unknown }} */ (json).total_results;
    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * 単一学名での国内観察数を取得（キャッシュ有効）。
 * @param {string} scientificName
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<number>}
 */
export async function fetchDomesticCountOnce(scientificName, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const cached = await cache.get(scientificName);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    taxon_name: scientificName,
    place_id: String(JAPAN_PLACE_ID),
    per_page: '1',
  });
  const url = `https://api.inaturalist.org/v1/observations?${params}`;

  let count = 0;
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      const json = await res.json();
      count = parseTotalResults(json);
    }
  } catch {
    count = 0;
  }

  await cache.set(scientificName, count);
  return count;
}

/**
 * 学名 + synonyms[] の全候補で国内観察数を合算。
 *
 * @param {string} scientificName
 * @param {{ synonyms?: string[], fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ totalDomestic: number, matches: { name: string, count: number }[] }>}
 */
export async function fetchInatDomesticCount(scientificName, opts = {}) {
  const synonyms = Array.isArray(opts.synonyms) ? opts.synonyms : [];
  const tried = new Set();
  const candidates = [scientificName, ...synonyms].filter(Boolean);

  const matches = [];
  let total = 0;
  for (const name of candidates) {
    if (tried.has(name)) continue;
    tried.add(name);
    const count = await fetchDomesticCountOnce(name, opts);
    if (count > 0) {
      total += count;
      matches.push({ name, count });
    }
  }
  return { totalDomestic: total, matches };
}
