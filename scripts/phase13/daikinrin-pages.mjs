/**
 * 大菌輪の公式インデックス pages.json の fetch + parse + キャッシュ + ルックアップ。
 *
 * 旧 fetcher は MycoBank ID が必要だが GBIF に登録されていないため 0 件解決だった。
 * このモジュールは大菌輪公式の全種インデックスを起点に ID を解決する。
 *
 * pages.json の 1 エントリ:
 *   { "file": "Lentinula_edodes_316467.html", "japanese_name": "シイタケ", "GBIF_kokunai": 150, "GBIF_kaigai": 1150 }
 *
 * file フィールドは <Scientific_Name>_<MycoBankId>.html 形式で ID が埋め込み済み。
 * 属レベルエントリ（<Genus>_genus.html）は MycoBank ID を持たないためスキップする。
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const PAGES_CACHE_PATH = join(CACHE_DIR, 'daikinrin-pages.json');

const PAGES_URL = 'https://mycoscouter.coolblog.jp/daikinrin/pages.json';
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

// <ScientificName>_<mycoBankId>.html を解析する正規表現。
// 学名部分はアンダースコア区切り、末尾アンダースコア + 数値 + .html。
const FILENAME_RE = /^(.+)_(\d+)\.html$/;

/**
 * pages.json の raw 配列を parse して種レベル entries に変換。
 * @param {{ file: string, japanese_name: string | null, GBIF_kokunai?: number, GBIF_kaigai?: number }[]} raw
 * @returns {{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]}
 */
export function parsePagesJson(raw) {
  const entries = [];
  for (const row of raw) {
    if (!row?.file) continue;
    const m = FILENAME_RE.exec(row.file);
    if (!m) continue; // <Genus>_genus.html 等の非種エントリは除外
    const scientificName = m[1].replace(/_/g, ' ');
    const mycoBankId = parseInt(m[2], 10);
    if (!Number.isFinite(mycoBankId)) continue;
    entries.push({
      scientificName,
      japaneseName: row.japanese_name || null,
      mycoBankId,
    });
  }
  return entries;
}

/**
 * entries 配列から (学名 → entry, 和名 → entry) のマップを構築。
 * 値は entry 全体（scientificName, japaneseName, mycoBankId）を持つので、
 * 利用側は大菌輪の正典学名と ID の両方を取得できる。
 * @param {{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]} entries
 * @returns {{ byScientific: Map<string, object>, byJapanese: Map<string, object> }}
 */
export function buildPagesIndex(entries) {
  const byScientific = new Map();
  const byJapanese = new Map();
  for (const e of entries) {
    if (e.scientificName) byScientific.set(e.scientificName.toLowerCase(), e);
    if (e.japaneseName) byJapanese.set(e.japaneseName, e);
  }
  return { byScientific, byJapanese };
}

/**
 * 学名 → 和名 の順でエントリ全体を引く。両方失敗で null。
 * 戻り値は大菌輪側の正典エントリ（学名 / 和名 / MycoBankId）。
 * URL 組み立てには入力 scientificName ではなく戻り値の scientificName を使う必要がある
 * （大菌輪が旧学名を accepted として使うケースがあるため）。
 * @param {{ byScientific: Map<string, object>, byJapanese: Map<string, object> }} index
 * @param {{ scientificName?: string | null, japaneseName?: string | null }} key
 * @returns {{ scientificName: string, japaneseName: string | null, mycoBankId: number } | null}
 */
export function lookupEntry(index, { scientificName, japaneseName }) {
  if (scientificName) {
    const e = index.byScientific.get(scientificName.toLowerCase());
    if (e) return e;
  }
  if (japaneseName) {
    const e = index.byJapanese.get(japaneseName);
    if (e) return e;
  }
  return null;
}

/**
 * lookupEntry の薄いラッパー。MycoBank ID だけを引きたい旧用途向け。
 * @returns {number | null}
 */
export function lookupMycoBankId(index, key) {
  const e = lookupEntry(index, key);
  return e ? e.mycoBankId : null;
}

/**
 * 大菌輪 pages.json をネットから fetch（または fresh=false かつキャッシュがあればそこから返す）。
 * @param {{ fresh?: boolean }} [opts]
 * @returns {Promise<{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]>}
 */
export async function fetchDaikinrinPagesIndex({ fresh = false } = {}) {
  if (!fresh && existsSync(PAGES_CACHE_PATH)) {
    const cached = JSON.parse(readFileSync(PAGES_CACHE_PATH, 'utf8'));
    if (cached?.entries) return cached.entries;
  }
  const res = await fetch(PAGES_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`daikinrin pages.json fetch failed: ${res.status}`);
  const raw = await res.json();
  const entries = parsePagesJson(raw);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(PAGES_CACHE_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), entries }, null, 2));
  return entries;
}
