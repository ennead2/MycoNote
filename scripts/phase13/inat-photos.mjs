/**
 * iNaturalist で学名に紐付く Research Grade 観察写真の件数を取得する軽量チェッカー。
 * synonyms fallback 対応: accepted → synonyms[] の順に試行、最初に hasPhotos=true の taxon を採用。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const cache = createCache({ dir: CACHE_DIR, namespace: 'inat-photos' });

export function parseInatObservationsResponse(json) {
  const total = typeof json?.total_results === 'number' ? json.total_results : 0;
  const first = Array.isArray(json?.results) ? json.results[0] : null;
  const hasPhotos = total > 0 && !!first && Array.isArray(first.photos) && first.photos.length > 0;
  return { totalResults: total, hasPhotos };
}

async function fetchOneByName(scientificName) {
  const cached = await cache.get(scientificName);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    taxon_name: scientificName,
    quality_grade: 'research',
    photos: 'true',
    per_page: '1',
    order: 'desc',
    order_by: 'created_at',
  });
  const url = `https://api.inaturalist.org/v1/observations?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    const empty = { totalResults: 0, hasPhotos: false };
    await cache.set(scientificName, empty);
    return empty;
  }
  const json = await res.json();
  const parsed = parseInatObservationsResponse(json);
  await cache.set(scientificName, parsed);
  return parsed;
}

/**
 * @param {string} scientificName
 * @param {{ synonyms?: string[] }} opts
 * @returns {Promise<{ totalResults: number, hasPhotos: boolean, matchedName: string | null }>}
 */
export async function checkInatPhotos(scientificName, opts = {}) {
  const synonyms = Array.isArray(opts.synonyms) ? opts.synonyms : [];
  const tried = new Set();
  const candidates = [scientificName, ...synonyms].filter(Boolean);

  let best = { totalResults: 0, hasPhotos: false, matchedName: null };
  for (const name of candidates) {
    if (tried.has(name)) continue;
    tried.add(name);
    const r = await fetchOneByName(name);
    if (r.hasPhotos) {
      return { totalResults: r.totalResults, hasPhotos: true, matchedName: name };
    }
    if (r.totalResults > best.totalResults) {
      best = { totalResults: r.totalResults, hasPhotos: false, matchedName: name };
    }
  }
  return best;
}
