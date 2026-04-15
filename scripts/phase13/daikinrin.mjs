/**
 * 大菌輪（Daikinrin）ページの URL 解決・fetch・パース。
 * License: 大菌輪は CC BY 4.0。帰属表示はクライアント側で処理。
 */

import { load } from 'cheerio';
import { createCache } from './cache.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://mycoscouter.coolblog.jp/daikinrin/Pages';
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');

const daikinrinCache = createCache({ dir: CACHE_DIR, namespace: 'daikinrin' });

export function buildPageUrl(scientificName, mycoBankId) {
  const parts = scientificName.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`scientific name must be binomial: got "${scientificName}"`);
  }
  const slug = scientificName.trim().replace(/\s+/g, '_');
  return `${BASE}/${slug}_${mycoBankId}.html`;
}

/**
 * 大菌輪ページの HTML を解析して構造化データを返す。
 * @param {string} html - 大菌輪の種ページ HTML
 * @returns {{
 *   scientificName: string,
 *   japaneseName: string | null,
 *   synonyms: string[],
 *   taxonomy: object,
 *   mycoBankId: number,
 *   observations: { domestic: number, overseas: number },
 *   externalLinks: { name: string, url: string }[]
 * }}
 */
export function parseDaikinrinPage(html) {
  const $ = load(html);

  const scientificName = extractScientificName($);
  const japaneseName = extractJapaneseName($);
  const mycoBankId = extractMycoBankId($);
  const synonyms = extractSynonyms($);
  const taxonomy = extractTaxonomy($);
  const observations = extractObservations($);
  const externalLinks = extractExternalLinks($);

  return { scientificName, japaneseName, synonyms, taxonomy, mycoBankId, observations, externalLinks };
}

function extractScientificName($) {
  const text = $('h1.scientific-name').first().text().trim();
  if (!text) throw new Error('scientificName not found: h1.scientific-name is empty');
  return text;
}

function extractJapaneseName($) {
  // h2.japanese-name は学名直後に配置される
  const text = $('h2.japanese-name').first().text().trim();
  if (!text || text === '（和名データなし）') return null;
  return text;
}

function extractMycoBankId($) {
  // <span class="mb-number">MB#247978</span>
  const mbText = $('span.mb-number').first().text().trim();
  const m = mbText.match(/MB#(\d+)/);
  if (m) return parseInt(m[1], 10);
  // フォールバック: canonical URL から取得
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const m2 = canonical.match(/_(\d+)\.html$/);
  if (m2) return parseInt(m2[1], 10);
  throw new Error('mycoBankId not found');
}

function extractSynonyms($) {
  const results = [];
  $('span.synonym-item').each((_, el) => {
    const text = $(el).text().trim();
    if (text) results.push(text);
  });
  return results;
}

// taxonomy-link の href suffix → フィールド名のマッピング
const RANK_MAP = {
  '_phylum.html': 'phylum',
  '_subphylum.html': 'subphylum',
  '_class.html': 'class',
  '_subclass.html': 'subclass',
  '_order.html': 'order',
  '_family.html': 'family',
  '_genus.html': 'genus',
};

function extractTaxonomy($) {
  const tax = {};
  $('a.taxonomy-link').each((_, el) => {
    const href = $(el).attr('href') || '';
    const rawText = $(el).text().trim();
    for (const [suffix, field] of Object.entries(RANK_MAP)) {
      if (href.endsWith(suffix)) {
        if (!tax[field]) {
          if (field === 'genus') {
            // "Morchella（アミガサタケ属）" → "Morchella" だけを取る
            const genusMatch = rawText.match(/^([A-Za-z]+)/);
            tax[field] = genusMatch ? genusMatch[1] : rawText;
          } else {
            tax[field] = rawText;
          }
        }
        break;
      }
    }
  });
  return tax;
}

function extractObservations($) {
  // .gbif-section 内の最初の .count-badge.jp と .count-badge.world を使う
  const gbifSection = $('.gbif-section').first();
  const badges = gbifSection.find('.count-badge');
  let domestic = 0;
  let overseas = 0;
  // "国内: <badge jp>N</badge>, 海外: <badge world>M</badge>" という順序
  badges.each((_, el) => {
    const $el = $(el);
    const val = parseInt($el.text().trim().replace(/,/g, ''), 10);
    if ($el.hasClass('jp') && domestic === 0) {
      domestic = isNaN(val) ? 0 : val;
    } else if ($el.hasClass('world') && overseas === 0) {
      overseas = isNaN(val) ? 0 : val;
    }
  });
  return { domestic, overseas };
}

function extractExternalLinks($) {
  const seen = new Map();
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim().replace(/\s+/g, ' ');
    // 大菌輪自身・空名・画像・フォント等を除外
    if (!name) return;
    if (href.includes('mycoscouter.coolblog.jp')) return;
    if (href.includes('fonts.googleapis.com')) return;
    // 既存エントリより名前が長ければ上書き（重複 URL の場合、意味のある名前を優先）
    const existing = seen.get(href);
    if (!existing || name.length > existing.name.length) {
      seen.set(href, { name, url: href });
    }
  });
  return [...seen.values()];
}

import { fetchDaikinrinPagesIndex, buildPagesIndex, lookupMycoBankId } from './daikinrin-pages.mjs';

let _pagesIndexPromise = null;
async function getPagesIndex() {
  if (!_pagesIndexPromise) {
    _pagesIndexPromise = fetchDaikinrinPagesIndex().then(buildPagesIndex);
  }
  return _pagesIndexPromise;
}

/**
 * 大菌輪の種ページを fetch + parse + キャッシュ。
 *
 * 旧 API は mycoBankId を呼び出し側から受け取っていたが、GBIF が MycoBank ID を
 * 持たない問題のため現在は内部で pages.json から解決する。
 *
 * @param {string} scientificName
 * @param {string | null} japaneseName 和名（pages.json で学名ヒットしない時の fallback key）
 * @returns {Promise<object | null>}
 */
export async function fetchDaikinrinPage(scientificName, japaneseName) {
  const index = await getPagesIndex();
  const mycoBankId = lookupMycoBankId(index, { scientificName, japaneseName });
  if (!mycoBankId) return null;

  const cacheKey = `${scientificName}_${mycoBankId}`;
  const cached = await daikinrinCache.get(cacheKey);
  if (cached) return cached;

  const url = buildPageUrl(scientificName, mycoBankId);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`daikinrin fetch failed: ${res.status} ${url}`);
  }
  const html = await res.text();
  const parsed = parseDaikinrinPage(html);
  const record = { url, fetchedAt: new Date().toISOString(), ...parsed };
  await daikinrinCache.set(cacheKey, record);
  return record;
}
