/**
 * GBIF occurrence API で国内・海外観察数を取得。
 * 注: GBIF usageKey は resolveMycoBankId から取得済みのものを再利用するのが理想だが、
 *     独立ユニットとして taxonKey を自前で解決する。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const obsCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-occurrence-count' });
const matchCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-match' });

export function parseOccurrenceCount(json) {
  const v = json?.count;
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getUsageKey(scientificName) {
  const cached = await matchCache.get(scientificName);
  if (cached?.usageKey !== undefined) return cached.usageKey;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&kingdom=Fungi`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await matchCache.set(scientificName, json);
  return json.usageKey ?? null;
}

async function countOccurrences(usageKey, country) {
  const key = `${usageKey}:${country || 'all'}`;
  const cached = await obsCache.get(key);
  if (cached !== null) return cached;
  const params = new URLSearchParams({ taxonKey: String(usageKey), limit: '0' });
  if (country) params.set('country', country);
  const url = `https://api.gbif.org/v1/occurrence/search?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    await obsCache.set(key, 0);
    return 0;
  }
  const json = await res.json();
  const count = parseOccurrenceCount(json);
  await obsCache.set(key, count);
  return count;
}

/**
 * @param {string} scientificName
 * @returns {Promise<{ domestic: number, overseas: number }>}
 */
export async function fetchGbifObservations(scientificName) {
  const usageKey = await getUsageKey(scientificName);
  if (!usageKey) return { domestic: 0, overseas: 0 };
  const total = await countOccurrences(usageKey, null);
  const domestic = await countOccurrences(usageKey, 'JP');
  return { domestic, overseas: Math.max(0, total - domestic) };
}
