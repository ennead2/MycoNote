/**
 * Wikipedia ja/en の記事存在チェッカー（本文取得なし、軽量）。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const cache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-exists' });

export function parseWikipediaExistsResponse(json) {
  const pages = json?.query?.pages;
  if (!pages) return false;
  const ids = Object.keys(pages);
  if (ids.length === 0) return false;
  const page = pages[ids[0]];
  return !!page && page.missing === undefined;
}

async function checkTitle(lang, title) {
  const key = `${lang}:${title}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    format: 'json',
    redirects: '1',
    origin: '*',
  });
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    await cache.set(key, false);
    return false;
  }
  const json = await res.json();
  const exists = parseWikipediaExistsResponse(json);
  await cache.set(key, exists);
  return exists;
}

/**
 * @param {{ japaneseName?: string, scientificName: string }} args
 * @returns {Promise<{ jaExists: boolean, matchedTitle: string | null }>}
 */
export async function checkWikipediaJaExists({ japaneseName, scientificName }) {
  if (japaneseName) {
    const hit = await checkTitle('ja', japaneseName);
    if (hit) return { jaExists: true, matchedTitle: japaneseName };
  }
  const hit = await checkTitle('ja', scientificName);
  return { jaExists: hit, matchedTitle: hit ? scientificName : null };
}
