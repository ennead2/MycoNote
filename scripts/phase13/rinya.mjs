/**
 * 林野庁「特用林産物（きのこ）」(政府標準利用規約)
 * 単一ページなので種ごと fetch は不要。1ページまるごと cache。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load } from 'cheerio';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const URL_RINYA = 'https://www.rinya.maff.go.jp/j/tokuyou/kinoko/';

const cache = createCache({ dir: CACHE_DIR, namespace: 'rinya', ttlMs: 30 * 24 * 3600 * 1000 });

export function parseRinyaOverview(html) {
  const $ = load(html);
  $('script, style, nav, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { text, sourceUrl: URL_RINYA };
}

export async function fetchRinyaOverview() {
  const cached = await cache.get('overview');
  if (cached) return cached;

  const res = await fetch(URL_RINYA, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`rinya fetch failed: ${res.status}`);
  const html = await res.text();
  const parsed = parseRinyaOverview(html);
  const record = { ...parsed, fetchedAt: new Date().toISOString() };
  await cache.set('overview', record);
  return record;
}
