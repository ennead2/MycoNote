#!/usr/bin/env node
/**
 * Phase 15 A1: 大菌輪の個別種ページから 7 階層 taxonomy (門/亜門/綱/亜綱/目/科/属) を取得し
 * latin + jp 日本語ラベル付きで `data/phase15/species-taxonomy.json` に保存する。
 *
 * 既存の scripts/phase13/daikinrin-pages.mjs と daikinrin.mjs を流用。
 *
 * 入力: src/data/mushrooms.json (113 種)
 * 出力: data/phase15/species-taxonomy.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import {
  fetchDaikinrinPagesIndex,
  buildPagesIndex,
  lookupEntry,
} from '../phase13/daikinrin-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MUSHROOMS = join(ROOT, 'src', 'data', 'mushrooms.json');
const OUT = join(ROOT, 'data', 'phase15', 'species-taxonomy.json');
const HTML_CACHE_DIR = join(ROOT, '.cache', 'phase15', 'daikinrin-html');

const BASE = 'https://mycoscouter.coolblog.jp/daikinrin/Pages';
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

const RANK_MAP = {
  '_phylum.html': 'phylum',
  '_subphylum.html': 'subphylum',
  '_class.html': 'class',
  '_subclass.html': 'subclass',
  '_order.html': 'order',
  '_family.html': 'family',
  '_genus.html': 'genus',
};

/**
 * "Basidiomycota（担子菌門）" → { latin: "Basidiomycota", jp: "担子菌門" }
 * 属ラベルは "Amanita（テングタケ属）" 形式、latin 部分は英字のみ取る。
 * jp がない場合 (和名未登録) は latin のみ返す。
 */
function splitLatinJp(rawText, rank) {
  const text = rawText.trim();
  // 全角 () も半角 () も許容
  const m = text.match(/^([A-Za-z][A-Za-z\-]*)\s*[（(]([^）)]+)[）)]\s*$/);
  if (m) {
    return { latin: m[1], jp: m[2].trim() };
  }
  // 括弧がない場合は latin のみ
  const latinOnly = text.match(/^([A-Za-z][A-Za-z\-]*)/);
  if (latinOnly) return { latin: latinOnly[1] };
  // 万が一パースできない場合は生テキストを latin に入れる（後で目視確認用）
  return { latin: text };
}

function extractTaxonomy($) {
  const tax = {};
  $('a.taxonomy-link').each((_, el) => {
    const href = $(el).attr('href') || '';
    const rawText = $(el).text().trim();
    for (const [suffix, field] of Object.entries(RANK_MAP)) {
      if (href.endsWith(suffix)) {
        if (!tax[field]) {
          tax[field] = splitLatinJp(rawText, field);
        }
        break;
      }
    }
  });
  return tax;
}

async function fetchHtml(scientificName, mycoBankId) {
  const filename = `${scientificName.replace(/\s+/g, '_')}_${mycoBankId}.html`;
  const cachePath = join(HTML_CACHE_DIR, filename);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf-8');
  }
  const url = `${BASE}/${filename}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  const html = await res.text();
  mkdirSync(HTML_CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, html, 'utf-8');
  return html;
}

async function main() {
  const rows = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
  console.log(`Targets: ${rows.length} species`);

  console.log('Fetching daikinrin pages.json index...');
  const entries = await fetchDaikinrinPagesIndex();
  const index = buildPagesIndex(entries);
  console.log(`Daikinrin index: ${entries.length} entries`);

  const results = [];
  const missing = [];

  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    const entry = lookupEntry(index, {
      scientificName: m.names.scientific,
      japaneseName: m.names.ja,
    });
    // synonyms 経由の fallback
    let matchedEntry = entry;
    if (!matchedEntry && m.names.scientific_synonyms) {
      for (const syn of m.names.scientific_synonyms) {
        const e = lookupEntry(index, { scientificName: syn });
        if (e) {
          matchedEntry = e;
          break;
        }
      }
    }
    if (!matchedEntry) {
      missing.push({ id: m.id, ja: m.names.ja, scientific: m.names.scientific });
      continue;
    }

    try {
      const html = await fetchHtml(matchedEntry.scientificName, matchedEntry.mycoBankId);
      const $ = load(html);
      const taxonomy = extractTaxonomy($);
      results.push({
        id: m.id,
        ja: m.names.ja,
        scientific: m.names.scientific,
        matched_daikinrin_name: matchedEntry.scientificName,
        mycobank_id: matchedEntry.mycoBankId,
        taxonomy,
      });
      process.stdout.write(
        `  [${String(i + 1).padStart(3)}/${rows.length}] ${m.names.ja} (${m.names.scientific}) — ${Object.keys(taxonomy).length} ranks\n`,
      );
    } catch (err) {
      missing.push({ id: m.id, ja: m.names.ja, scientific: m.names.scientific, error: String(err.message) });
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: 'https://mycoscouter.coolblog.jp/daikinrin/ (CC BY 4.0)',
        target_species: rows.length,
        matched_species: results.length,
        missing_species: missing,
        species: results,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`\nWrote ${OUT}`);
  console.log(`\nMatched: ${results.length} / ${rows.length}`);
  console.log(`Missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log('\nMissing:');
    for (const m of missing.slice(0, 10)) {
      console.log(`  - ${m.ja} (${m.scientific})${m.error ? ` [${m.error}]` : ''}`);
    }
  }

  // rank 別カバレッジ
  const ranks = ['phylum', 'subphylum', 'class', 'subclass', 'order', 'family', 'genus'];
  console.log('\nRank coverage:');
  for (const r of ranks) {
    const count = results.filter((s) => s.taxonomy?.[r]).length;
    const pct = ((count / results.length) * 100).toFixed(1);
    console.log(`  ${r.padEnd(10)} ${count}/${results.length} (${pct}%)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
