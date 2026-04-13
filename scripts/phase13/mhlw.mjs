/**
 * 厚労省「自然毒のリスクプロファイル」(政府標準利用規約)
 * 対象 19種の毒きのこ。詳細は HTML/PDF 混在対応。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load } from 'cheerio';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const INDEX_URL = 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/poison/index.html';

const indexCache = createCache({ dir: CACHE_DIR, namespace: 'mhlw-index', ttlMs: 7 * 24 * 3600 * 1000 });
const detailCache = createCache({ dir: CACHE_DIR, namespace: 'mhlw-detail' });

export const MHLW_TARGET_SPECIES = [
  { japaneseName: 'カエンタケ', scientificName: 'Trichoderma cornu-damae' },
  { japaneseName: 'カキシメジ', scientificName: 'Tricholoma ustale' },
  { japaneseName: 'クサウラベニタケ', scientificName: 'Entoloma rhodopolium' },
  { japaneseName: 'シロタマゴテングタケ', scientificName: 'Amanita verna' },
  { japaneseName: 'スギヒラタケ', scientificName: 'Pleurocybella porrigens' },
  { japaneseName: 'タマゴタケモドキ', scientificName: 'Amanita subjunquillea' },
  { japaneseName: 'ツキヨタケ', scientificName: 'Omphalotus guepiniformis' },
  { japaneseName: 'テングタケ', scientificName: 'Amanita pantherina' },
  { japaneseName: 'ドクササコ', scientificName: 'Paralepistopsis acromelalga' },
  { japaneseName: 'ドクツルタケ', scientificName: 'Amanita virosa' },
  { japaneseName: 'ドクヤマドリ', scientificName: 'Boletus venenatus' },
  { japaneseName: 'ニガクリダケ', scientificName: 'Hypholoma fasciculare' },
  { japaneseName: 'ニセクロハツ', scientificName: 'Russula subnigricans' },
  { japaneseName: 'ニセショウロ', scientificName: 'Scleroderma citrinum' },
  { japaneseName: 'ネズミシメジ', scientificName: 'Tricholoma virgatum' },
  { japaneseName: 'ハイイロシメジ', scientificName: 'Clitocybe nebularis' },
  { japaneseName: 'ヒカゲシビレタケ', scientificName: 'Psilocybe argentipes' },
  { japaneseName: 'ヒメアジロガサ', scientificName: 'Galerina fasciculata' },
  { japaneseName: 'ベニテングタケ', scientificName: 'Amanita muscaria' },
];

export function parseMhlwIndex(html) {
  const $ = load(html);
  const entries = [];

  // 表の各行を処理
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 2) return;

    // 第1列: 和名
    const japaneseName = $(cells[0]).text().trim();

    // target に該当するか確認
    const target = MHLW_TARGET_SPECIES.find(t => t.japaneseName === japaneseName);
    if (!target) return;

    // 第2列: リンク
    const links = $(cells[1]).find('a');
    links.each((_, a) => {
      const href = $(a).attr('href');
      const linkText = $(a).text().trim();
      if (!href) return;
      if (!/\.(pdf|html)$/i.test(href)) return;

      entries.push({
        japaneseName: target.japaneseName,
        scientificName: target.scientificName,
        url: new URL(href, INDEX_URL).href,
        linkText: linkText,
      });
    });
  });

  return entries;
}

export async function fetchMhlwIndex() {
  const cached = await indexCache.get('index');
  if (cached) return cached;
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`mhlw index fetch failed: ${res.status}`);
  const html = await res.text();
  const parsed = parseMhlwIndex(html);
  await indexCache.set('index', parsed);
  return parsed;
}

export async function fetchMhlwEntry(scientificName) {
  const index = await fetchMhlwIndex();
  const entry = index.find(e => e.scientificName === scientificName);
  if (!entry) return null;

  const cached = await detailCache.get(scientificName);
  if (cached) return cached;

  const res = await fetch(entry.url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') || '';
  const record = { ...entry, contentType, fetchedAt: new Date().toISOString() };
  if (contentType.includes('html')) {
    const html = await res.text();
    const $ = load(html);
    record.text = $('body').text().replace(/\s+/g, ' ').trim();
  } else {
    record.text = null;
  }
  await detailCache.set(scientificName, record);
  return record;
}
