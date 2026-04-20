#!/usr/bin/env node
/**
 * Phase 17: tier0 385 種の大菌輪 HTML から genus 日本語名を再抽出。
 *
 * 既存 extractTaxonomy (scripts/phase13/daikinrin.mjs:99-120) は genus を
 * latin のみ取る実装だったため、taxonomy.genus に jp 表記が欠落。
 * ここでは各 tier0 の大菌輪ページを fetch (1 req/sec) し、
 *   <a class="taxonomy-link" href="..._genus.html">Amanita（テングタケ属）</a>
 * の full text から「Amanita」と「テングタケ属」を分離。
 *
 * 出力: data/phase17/tier0-genus-jp.json
 *   { "<scientificName>": { genus_latin, genus_jp, matched_text } }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { buildPageUrl } from '../phase13/daikinrin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ARTICLE_MAP = join(ROOT, 'data/phase17/article-map.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const OUTPUT = join(ROOT, 'data/phase17/tier0-genus-jp.json');

const USER_AGENT = 'MycoNote/1.0 (phase17 genus jp extraction)';

function parseArgs() {
  const i = process.argv.indexOf('--limit');
  return { limit: i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function extractGenusJp(html) {
  const $ = load(html);
  let found = null;
  $('a.taxonomy-link').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.endsWith('_genus.html')) return;
    const text = $(el).text().trim();
    // "Amanita（テングタケ属）" → latin="Amanita", jp="テングタケ属"
    const m = text.match(/^([A-Za-z]+)（(.+?)）/);
    if (m) found = { genus_latin: m[1], genus_jp: m[2], matched_text: text };
    else found = { genus_latin: text, genus_jp: '', matched_text: text };
  });
  return found;
}

async function main() {
  const { limit } = parseArgs();
  mkdirSync(dirname(OUTPUT), { recursive: true });

  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const wiki = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const wikiMap = new Map(wiki.map((w) => [w.scientificName, w]));

  const existing = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf-8')) : {};
  const tier0 = articleMap.filter((e) => wikiMap.get(e.scientificName)?.tier === 0);
  const targets = tier0.slice(0, Math.min(tier0.length, limit));
  console.log(`tier0: ${tier0.length}, target: ${targets.length}, resume: ${Object.keys(existing).length}`);

  const result = { ...existing };
  const stats = { hit: 0, miss: 0, skip: 0, fail: 0 };
  let lastFetch = 0;

  for (let i = 0; i < targets.length; i++) {
    const e = targets[i];
    if (result[e.scientificName]) { stats.skip++; continue; }
    if (!e.mycoBankId) { stats.miss++; result[e.scientificName] = null; continue; }

    const url = buildPageUrl(e.scientificName, e.mycoBankId);
    const since = Date.now() - lastFetch;
    if (since < 1000) await sleep(1000 - since);
    lastFetch = Date.now();

    try {
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!r.ok) { stats.fail++; result[e.scientificName] = null; continue; }
      const html = await r.text();
      const extracted = extractGenusJp(html);
      result[e.scientificName] = extracted;
      if (extracted?.genus_jp) stats.hit++; else stats.miss++;
    } catch (err) {
      console.warn(`  [err] ${e.japaneseName}: ${err.message}`);
      stats.fail++;
      result[e.scientificName] = null;
    }

    if ((i + 1) % 20 === 0 || i + 1 === targets.length) {
      writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
      console.log(`[${i + 1}/${targets.length}] ${e.japaneseName} | hit=${stats.hit} miss=${stats.miss} fail=${stats.fail} skip=${stats.skip}`);
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log('\n=== Final ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Wrote: ${OUTPUT}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
