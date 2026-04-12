/**
 * 日本産菌類集覧 和名リスト を JSON 化
 *
 * 日本菌学会 (www.mycology-jp.org) の「Katumoto-Wamei.xlsx」を読込み、
 * data/jp-mycology-checklist.json として保存する。
 *
 * ライセンス: CC BY 4.0 (日本菌学会)
 * 収録: 2008年までの日本産菌類 ~4400 種
 *
 * Usage:
 *   node scripts/import-jp-mycology-checklist.mjs
 *   node scripts/import-jp-mycology-checklist.mjs --download   # xlsx を再取得
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const XLSX_URL = 'https://www.mycology-jp.org/_userdata/Katumoto-Wamei.xlsx';
const XLSX_FILE = join(ROOT, 'scripts/temp/Katumoto-Wamei.xlsx');
const DATA_DIR = join(ROOT, 'data');
const OUT_FILE = join(DATA_DIR, 'jp-mycology-checklist.json');

const DOWNLOAD = process.argv.includes('--download');

async function download() {
  console.log(`Downloading ${XLSX_URL} ...`);
  const res = await fetch(XLSX_URL, {
    headers: { 'User-Agent': 'MycoNote/1.0 (https://github.com/ennead2/MycoNote)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!existsSync(dirname(XLSX_FILE))) mkdirSync(dirname(XLSX_FILE), { recursive: true });
  writeFileSync(XLSX_FILE, buf);
  console.log(`  saved: ${XLSX_FILE} (${buf.length} bytes)`);
}

function buildSpeciesName(genus, species, rank, rankSpecies) {
  if (!genus) return null;
  let name = genus;
  if (species) name += ' ' + species;
  if (rank && rankSpecies) {
    const prefix = rank === '変種' ? 'var.' : rank === '亜種' ? 'subsp.' : rank === '品種' ? 'f.' : rank;
    name += ` ${prefix} ${rankSpecies}`;
  }
  return name;
}

async function main() {
  if (DOWNLOAD || !existsSync(XLSX_FILE)) {
    await download();
  }

  console.log(`Parsing ${XLSX_FILE} ...`);
  const wb = XLSX.readFile(XLSX_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const header = rows[0];
  const idx = {
    id: header.indexOf('ID'),
    ja: header.indexOf('和名'),
    sci: header.indexOf('学名'),
    genus: header.indexOf('属名'),
    species: header.indexOf('種小名'),
    rank: header.indexOf('種内ランク1'),
    rankSpecies: header.indexOf('種内ランク1種小名'),
    page: header.indexOf('ページ'),
    note: header.indexOf('Note'),
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const ja = r[idx.ja];
    if (!ja) continue;

    const sciFromCol = r[idx.sci];
    const genus = r[idx.genus];
    const species = r[idx.species];
    const rank = r[idx.rank];
    const rankSpecies = r[idx.rankSpecies];

    // 学名列が空ならば 属+種小名 から組み立てる
    const scientific = sciFromCol || buildSpeciesName(genus, species, rank, rankSpecies);
    if (!scientific) continue;

    entries.push({
      id: r[idx.id],
      ja: String(ja).trim(),
      scientific: String(scientific).trim(),
      genus: genus ? String(genus).trim() : null,
      species: species ? String(species).trim() : null,
      rank: rank || null,
      note: r[idx.note] ? String(r[idx.note]).trim() : null,
    });
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(entries, null, 0) + '\n');

  console.log(`\n✓ Wrote ${entries.length} entries → ${OUT_FILE}`);
  console.log(`  file size: ${readFileSync(OUT_FILE).length} bytes`);

  // 簡易統計
  const uniqueGenera = new Set(entries.map(e => e.genus).filter(Boolean)).size;
  const withNote = entries.filter(e => e.note).length;
  console.log(`  unique genera: ${uniqueGenera}`);
  console.log(`  with note:     ${withNote}`);
  console.log(`\n  sample:`, JSON.stringify(entries[0]));
}

main().catch(e => { console.error(e); process.exit(1); });
