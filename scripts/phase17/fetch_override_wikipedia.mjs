#!/usr/bin/env node
/**
 * Phase 17 補完: override 4 種の Wikipedia JA/EN availability を追加取得して
 * wikipedia-availability.json に merge する。
 *
 * override 4 種は大菌輪 pages.json に和名フィールドがない (または学名すらない) ため
 * fetch_all_wikipedia_availability.mjs の処理対象外だった。これを後追いで埋める。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OVERRIDES = join(ROOT, 'data/phase17/ja-name-overrides.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');

const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; phase17 override wiki)';
const cache = createCache({ dir: join(ROOT, '.cache/phase17'), namespace: 'wikipedia-availability' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseExists(json) {
  const pages = json?.query?.pages;
  if (!pages) return false;
  const ids = Object.keys(pages);
  if (ids.length === 0) return false;
  return !!pages[ids[0]] && pages[ids[0]].missing === undefined;
}

async function check(lang, title) {
  const key = `${lang}:${title}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;
  const params = new URLSearchParams({
    action: 'query', titles: title, format: 'json', redirects: '1', origin: '*',
  });
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!r.ok) return false;
  const exists = parseExists(await r.json());
  await cache.set(key, exists);
  return exists;
}

async function main() {
  const overrides = JSON.parse(readFileSync(OVERRIDES, 'utf-8'));
  const wiki = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const existingScis = new Set(wiki.map((w) => w.scientificName));

  for (const o of overrides) {
    if (existingScis.has(o.scientificName)) {
      console.log(`[skip already in wiki] ${o.japaneseName}`);
      continue;
    }
    // ja: japaneseName → scientificName の順
    // en: scientificName → japaneseName の順
    let jaMatched = null;
    for (const title of [o.japaneseName, o.scientificName]) {
      await sleep(1000);
      if (await check('ja', title)) { jaMatched = title; break; }
    }
    let enMatched = null;
    for (const title of [o.scientificName, o.japaneseName]) {
      await sleep(1000);
      if (await check('en', title)) { enMatched = title; break; }
    }

    let tier = 2;
    if (jaMatched) tier = 0;
    else if (enMatched) tier = 1;

    wiki.push({
      scientificName: o.scientificName,
      japaneseName: o.japaneseName,
      mycoBankId: o.mycoBankId,
      wikipediaJa: { exists: !!jaMatched, matchedTitle: jaMatched },
      wikipediaEn: { exists: !!enMatched, matchedTitle: enMatched },
      tier,
    });
    console.log(`[added] ${o.japaneseName} → tier ${tier} (ja=${!!jaMatched} en=${!!enMatched})`);
  }

  writeFileSync(WIKI_AVAIL, JSON.stringify(wiki, null, 2));
  console.log(`Updated ${WIKI_AVAIL}. Total entries: ${wiki.length}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
