/**
 * Wikipedia ja/en 取得。MediaWiki API 利用。
 * License: CC BY-SA 4.0 / GFDL dual. 帰属表示必須。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion; contact: ennead2)';

const jaCache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-ja' });
const enCache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-en' });

function buildApiUrl(lang, title) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    explaintext: '1',
    inprop: 'url',
    titles: title,
    format: 'json',
    redirects: '1',
    origin: '*',
  });
  return `${base}?${params.toString()}`;
}

export function parseWikipediaResponse(json) {
  const pages = json?.query?.pages;
  if (!pages) return null;
  const firstKey = Object.keys(pages)[0];
  const page = pages[firstKey];
  if (!page || page.missing !== undefined) return null;
  if (!page.extract || page.extract.length === 0) return null;
  return {
    title: page.title,
    extract: page.extract,
    url: page.fullurl || null,
    pageid: page.pageid,
  };
}

async function fetchLang(lang, title, cache) {
  const cached = await cache.get(title);
  if (cached) return cached;

  const res = await fetch(buildApiUrl(lang, title), { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`wikipedia ${lang} fetch failed: ${res.status}`);
  const json = await res.json();
  const parsed = parseWikipediaResponse(json);
  if (!parsed) return null;
  const record = { ...parsed, lang, fetchedAt: new Date().toISOString() };
  await cache.set(title, record);
  return record;
}

export async function fetchWikipediaJa({ japaneseName, scientificName }) {
  if (japaneseName) {
    const hit = await fetchLang('ja', japaneseName, jaCache);
    if (hit) return hit;
  }
  return await fetchLang('ja', scientificName, jaCache);
}

export async function fetchWikipediaEn({ scientificName }) {
  return await fetchLang('en', scientificName, enCache);
}
