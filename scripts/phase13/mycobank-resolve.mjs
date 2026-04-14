/**
 * 学名から MycoBank ID を解決する。
 * 戦略順: known-map → GBIF Backbone (species/match → species/{key})
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

const gbifMatchCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-match' });
const gbifSpeciesCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-species' });

export function resolveFromKnownMap(scientificName, knownMap) {
  if (knownMap[scientificName] !== undefined) return knownMap[scientificName];
  return null;
}

export function extractMycoBankFromGbifSpecies(species) {
  if (!species?.identifiers) return null;
  for (const ident of species.identifiers) {
    const type = (ident.type || '').toUpperCase();
    if (type !== 'MYCOBANK') continue;
    const raw = ident.identifier || '';
    // URL の場合、末尾の数値を取り出す
    const match = raw.match(/(\d+)(?!.*\d)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

async function fetchGbifMatch(scientificName) {
  const cached = await gbifMatchCache.get(scientificName);
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&kingdom=Fungi`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await gbifMatchCache.set(scientificName, json);
  return json;
}

async function fetchGbifSpecies(usageKey) {
  const cached = await gbifSpeciesCache.get(String(usageKey));
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/${usageKey}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await gbifSpeciesCache.set(String(usageKey), json);
  return json;
}

/**
 * @param {string} scientificName
 * @param {{ knownMap?: Record<string, number> }} opts
 * @returns {Promise<{ mycobankId: number | null, source: string }>}
 */
export async function resolveMycoBankId(scientificName, opts = {}) {
  const knownMap = opts.knownMap || {};
  const acceptedUsageKey = opts.acceptedUsageKey ?? null;

  // 1. known map
  const known = resolveFromKnownMap(scientificName, knownMap);
  if (known !== null) return { mycobankId: known, source: 'known-map' };

  // 2. acceptedUsageKey 直接ルート（match をスキップ）
  if (acceptedUsageKey) {
    const species = await fetchGbifSpecies(acceptedUsageKey);
    if (species) {
      const mb = extractMycoBankFromGbifSpecies(species);
      if (mb !== null) return { mycobankId: mb, source: 'gbif-accepted' };
    }
  }

  // 3. GBIF match → species（fallback）
  const match = await fetchGbifMatch(scientificName);
  if (match?.usageKey) {
    const species = await fetchGbifSpecies(match.usageKey);
    if (species) {
      const mb = extractMycoBankFromGbifSpecies(species);
      if (mb !== null) return { mycobankId: mb, source: 'gbif' };
    }
  }

  return { mycobankId: null, source: 'unresolved' };
}

/**
 * v1 mushrooms.json 等から { scientificName: mycobankId } マップを抽出。
 * v1 に MB# が無い場合はこの関数は空マップを返す（将来拡張用）。
 */
export function buildKnownMapFromV1(v1Mushrooms) {
  const map = {};
  for (const m of v1Mushrooms) {
    const sci = m.names?.scientific;
    const mb = m.mycobank_id ?? m.mycobankId;
    if (sci && typeof mb === 'number') map[sci] = mb;
  }
  return map;
}
