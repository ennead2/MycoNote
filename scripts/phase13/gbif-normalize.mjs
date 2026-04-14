/**
 * 学名 → GBIF Backbone Taxonomy の accepted name + synonyms 解決。
 *
 * 返り値:
 *   {
 *     input,                 // 入力そのもの
 *     acceptedName,          // ACCEPTED: input と同じ、SYNONYM: acceptedUsage.canonicalName、UNKNOWN: input
 *     acceptedUsageKey,      // number | null
 *     synonyms: string[],    // acceptedName と input を除いた unique リスト
 *     status,                // 'ACCEPTED' | 'SYNONYM' | 'DOUBTFUL' | 'UNKNOWN'
 *   }
 *
 * エラー時は status='UNKNOWN' で throw せずに返す（呼び出し側の可用性を優先）。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

const defaultMatchCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-match' });
const defaultSpeciesCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-species' });
const defaultSynonymsCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-synonyms' });

/**
 * GBIF synonyms API の results から、種以下のランクで canonicalName を抽出。重複除去。
 */
export function extractSpeciesSynonyms(data) {
  if (!data?.results) return [];
  const names = data.results
    .filter(r => r.rank === 'SPECIES' || r.rank === 'VARIETY' || r.rank === 'SUBSPECIES')
    .map(r => r.canonicalName)
    .filter(Boolean);
  return [...new Set(names)];
}

async function fetchJsonSafe(fetchFn, url) {
  const res = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  return await res.json();
}

async function getOrFetchMatch(input, { fetchFn, matchCache }) {
  const cached = await matchCache.get(input);
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(input)}&kingdom=Fungi`;
  const json = await fetchJsonSafe(fetchFn, url);
  if (json) await matchCache.set(input, json);
  return json;
}

async function getOrFetchSpecies(usageKey, { fetchFn, speciesCache }) {
  const cached = await speciesCache.get(String(usageKey));
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/${usageKey}`;
  const json = await fetchJsonSafe(fetchFn, url);
  if (json) await speciesCache.set(String(usageKey), json);
  return json;
}

async function getOrFetchSynonyms(usageKey, { fetchFn, synonymsCache }) {
  const cached = await synonymsCache.get(String(usageKey));
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/${usageKey}/synonyms?limit=100`;
  const json = await fetchJsonSafe(fetchFn, url);
  if (json) await synonymsCache.set(String(usageKey), json);
  return json;
}

function unknownFallback(input, status = 'UNKNOWN') {
  return { input, acceptedName: input, acceptedUsageKey: null, synonyms: [], status };
}

/**
 * @param {string} scientificName
 * @param {{
 *   fetchFn?: typeof fetch,
 *   matchCache?: any,
 *   speciesCache?: any,
 *   synonymsCache?: any,
 * }} opts
 */
export async function normalizeName(scientificName, opts = {}) {
  const fetchFn = opts.fetchFn ?? fetch;
  const matchCache = opts.matchCache ?? defaultMatchCache;
  const speciesCache = opts.speciesCache ?? defaultSpeciesCache;
  const synonymsCache = opts.synonymsCache ?? defaultSynonymsCache;
  const input = scientificName;

  try {
    const match = await getOrFetchMatch(input, { fetchFn, matchCache });
    if (!match || !match.usageKey) return unknownFallback(input);

    const status = match.status || 'UNKNOWN';

    // ACCEPTED: 自分自身が正式名
    if (status === 'ACCEPTED') {
      const synJson = await getOrFetchSynonyms(match.usageKey, { fetchFn, synonymsCache });
      const synonyms = extractSpeciesSynonyms(synJson)
        .filter(n => n !== match.canonicalName);
      return {
        input,
        acceptedName: match.canonicalName || input,
        acceptedUsageKey: match.usageKey,
        synonyms,
        status: 'ACCEPTED',
      };
    }

    // SYNONYM: acceptedUsageKey を辿る
    if (status === 'SYNONYM' && match.acceptedUsageKey) {
      const accepted = await getOrFetchSpecies(match.acceptedUsageKey, { fetchFn, speciesCache });
      if (!accepted) return unknownFallback(input);
      const synJson = await getOrFetchSynonyms(match.acceptedUsageKey, { fetchFn, synonymsCache });
      const acceptedName = accepted.canonicalName || input;
      const raw = extractSpeciesSynonyms(synJson);
      const synonyms = [...new Set([input, ...raw])]
        .filter(n => n !== acceptedName);
      return {
        input,
        acceptedName,
        acceptedUsageKey: match.acceptedUsageKey,
        synonyms,
        status: 'SYNONYM',
      };
    }

    // DOUBTFUL / FUZZY / HIGHERRANK: canonicalName があればそれを使う
    if (match.canonicalName) {
      const synJson = match.usageKey
        ? await getOrFetchSynonyms(match.usageKey, { fetchFn, synonymsCache })
        : null;
      const synonyms = extractSpeciesSynonyms(synJson)
        .filter(n => n !== match.canonicalName);
      return {
        input,
        acceptedName: match.canonicalName,
        acceptedUsageKey: match.usageKey,
        synonyms,
        status: status === 'DOUBTFUL' ? 'DOUBTFUL' : 'UNKNOWN',
      };
    }

    return unknownFallback(input);
  } catch {
    return unknownFallback(input);
  }
}
