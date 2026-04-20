#!/usr/bin/env node
/**
 * Phase 17: tier0 385 種の Hero 画像を Wikipedia JA メイン画像から取得して
 * webp 変換 + public/images/mushrooms/ に保存する。
 *
 * 仕様 (user 指示):
 *  - Wikipedia JA のメイン画像 (infobox 画像) を hero として採用
 *  - webp 変換 (DETAIL_WIDTH=800px、既存 fetch_v2_photos と同じ設定)
 *  - 保存先: public/images/mushrooms/<id>.webp
 *  - 結果を data/phase17/tier0-hero-images.json に記録
 *
 * 既存旧 approved 99 件は image_local を継承しているが、user 指示で
 * Wikipedia JA メイン画像と違う場合があるため、tier0 全件を Wikipedia JA
 * で上書き取得する (既存 webp は overwrite)。
 *
 * Rate: Wikipedia API 1 req/sec、Commons 画像 download は別
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';
import { getWikipediaImage, downloadAndConvert } from '../phase13/fetch_v2_photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ARTICLE_MAP = join(ROOT, 'data/phase17/article-map.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const IMAGES_DIR = join(ROOT, 'public/images/mushrooms');
const OUTPUT = join(ROOT, 'data/phase17/tier0-hero-images.json');

const dkCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--limit');
  return {
    limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity,
    onlyMissing: args.includes('--only-missing'),
  };
}

function scientificNameToSlug(sci) {
  return sci.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const { limit, onlyMissing } = parseArgs();
  mkdirSync(IMAGES_DIR, { recursive: true });
  mkdirSync(dirname(OUTPUT), { recursive: true });

  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const wiki = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const wikiMap = new Map(wiki.map((w) => [w.scientificName, w]));

  // 既存出力 resume
  const existing = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf-8')) : {};

  const tier0 = articleMap.filter((e) => wikiMap.get(e.scientificName)?.tier === 0);
  const targets = tier0.slice(0, Math.min(tier0.length, limit));
  console.log(`tier0: ${tier0.length}, preparing ${targets.length}, resume=${Object.keys(existing).length}`);

  const result = { ...existing };
  const stats = { hit: 0, miss: 0, skip: 0, fail: 0 };
  let lastFetch = 0;

  for (let i = 0; i < targets.length; i++) {
    const e = targets[i];
    const sci = e.scientificName;
    const slug = scientificNameToSlug(sci);
    const localPath = join(IMAGES_DIR, `${slug}.webp`);
    const localRel = `/images/mushrooms/${slug}.webp`;

    // onlyMissing: 既に local あればスキップ
    if (onlyMissing && result[sci]?.image_local && existsSync(join(ROOT, 'public', result[sci].image_local.replace(/^\//, '')))) {
      stats.skip++;
      continue;
    }
    if (!onlyMissing && result[sci]?.image_local) {
      stats.skip++;
      continue;
    }

    // Wikipedia JA 優先の matchedTitle を使う (availability での redirect 先対応)
    const matchedTitle = wikiMap.get(sci)?.wikipediaJa?.matchedTitle || e.japaneseName;
    const dk = e.mycoBankId ? await dkCache.get(`${sci}_${e.mycoBankId}`) : null;
    const synonyms = dk?.synonyms || [];

    // rate limit
    const since = Date.now() - lastFetch;
    if (since < 1000) await sleep(1000 - since);
    lastFetch = Date.now();

    try {
      const wikiImg = await getWikipediaImage(matchedTitle, sci, synonyms);
      if (!wikiImg) {
        result[sci] = { image_local: null, image_source: null, matched_title: null };
        stats.miss++;
      } else {
        try {
          const bytes = await downloadAndConvert(wikiImg.url, localPath);
          result[sci] = {
            image_local: localRel,
            image_source: wikiImg.source,
            image_original_url: wikiImg.url,
            matched_title: matchedTitle,
            from: wikiImg.from,
            bytes,
          };
          stats.hit++;
        } catch (dlErr) {
          result[sci] = { image_local: null, image_source: wikiImg.source, error: dlErr.message };
          stats.fail++;
        }
      }
    } catch (err) {
      result[sci] = { image_local: null, error: err.message };
      stats.fail++;
    }

    if ((i + 1) % 10 === 0 || i + 1 === targets.length) {
      writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
      console.log(`[${i + 1}/${targets.length}] ${e.japaneseName} | hit=${stats.hit} miss=${stats.miss} skip=${stats.skip} fail=${stats.fail}`);
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log('\n=== Final ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Wrote: ${OUTPUT}`);
  console.log(`Images saved in: ${IMAGES_DIR}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
