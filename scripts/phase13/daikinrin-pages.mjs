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
