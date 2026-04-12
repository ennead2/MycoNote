/**
 * レビューツール用データ事前取得
 *
 * 全 279 種について Wikipedia ja/en summary を取得し、
 * ja にヒットしない場合は kinoco-zukan.net の本文を fallback として取り込む。
 *
 * 出力: scripts/temp/review-cache.json
 * {
 *   "<id>": {
 *     "wikipedia_ja": { "extract": "...", "url": "..." } | null,
 *     "wikipedia_en": { "extract": "...", "url": "..." } | null,
 *     "kinoco_zukan": { "text": "...", "url": "..." } | null,
 *     "fetched_at": "..."
 *   }
 * }
 *
 * Usage:
 *   node scripts/prefetch-review-data.mjs
 *   node scripts/prefetch-review-data.mjs --reset   # キャッシュ無視
 *   node scripts/prefetch-review-data.mjs --only=matsutake,shiitake
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const CACHE_FILE = join(ROOT, 'scripts/temp/review-cache.json');
const TEMP_DIR = join(ROOT, 'scripts/temp');

const ARGS = process.argv.slice(2);
const RESET = ARGS.includes('--reset');
const ONLY = ARGS.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',');

const UA = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; review tool)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
      if (res.status === 404) return null;
      if (res.ok) return await res.json();
      if (res.status === 429) { await sleep(3000); continue; }
    } catch (e) {
      if (i === retries - 1) return null;
      await sleep(1500);
    }
  }
  return null;
}

async function fetchText(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
    } catch (e) {
      if (i === retries - 1) return null;
      await sleep(1500);
    }
  }
  return null;
}

async function fetchWikipedia(lang, title) {
  const encoded = encodeURIComponent(title);
  const data = await fetchJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}?redirect=true`);
  if (!data || data.type === 'disambiguation' || !data.extract) return null;
  return {
    extract: data.extract,
    url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encoded}`,
    title: data.title,
  };
}

function romanizeId(id) {
  return id.replace(/_/g, '-');
}

async function fetchKinocoZukan(id) {
  const url = `https://kinoco-zukan.net/${romanizeId(id)}.php`;
  const html = await fetchText(url);
  if (!html) return null;
  // <p> 段落テキストをざっくり抽出（過去の gather-species-data.mjs と同じ方針）
  const matches = html.match(/<p[^>]*>([^<]+)<\/p>/g);
  if (!matches) return null;
  const text = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join('\n\n');
  if (text.length < 30) return null;
  return { text: text.slice(0, 2000), url };
}

async function processOne(m) {
  const out = {
    wikipedia_ja: null,
    wikipedia_en: null,
    kinoco_zukan: null,
    fetched_at: new Date().toISOString(),
  };

  // 和名で ja Wikipedia
  out.wikipedia_ja = await fetchWikipedia('ja', m.names.ja);
  await sleep(200);

  // ja ヒットなしなら学名で ja Wikipedia を再試行
  if (!out.wikipedia_ja) {
    out.wikipedia_ja = await fetchWikipedia('ja', m.names.scientific);
    await sleep(200);
  }

  // en Wikipedia は学名で取得（和名では基本ヒットしないので省略）
  out.wikipedia_en = await fetchWikipedia('en', m.names.scientific);
  await sleep(200);

  // ja が空のときのみ kinoco-zukan fallback
  if (!out.wikipedia_ja) {
    out.kinoco_zukan = await fetchKinocoZukan(m.id);
    await sleep(500);
  }

  return out;
}

async function main() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const cache = !RESET && existsSync(CACHE_FILE)
    ? JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    : {};

  const targets = ONLY
    ? mushrooms.filter(m => ONLY.includes(m.id))
    : mushrooms;

  console.log(`Prefetch: ${targets.length} species (cache hits: ${Object.keys(cache).length})`);

  let processed = 0;
  let jaHit = 0, enHit = 0, kinocoHit = 0, noSource = 0;

  for (const m of targets) {
    if (cache[m.id] && !RESET) {
      processed++;
      const c = cache[m.id];
      if (c.wikipedia_ja) jaHit++;
      if (c.wikipedia_en) enHit++;
      if (c.kinoco_zukan) kinocoHit++;
      if (!c.wikipedia_ja && !c.wikipedia_en && !c.kinoco_zukan) noSource++;
      continue;
    }

    const out = await processOne(m);
    cache[m.id] = out;

    const tags = [];
    if (out.wikipedia_ja) { tags.push('ja'); jaHit++; }
    if (out.wikipedia_en) { tags.push('en'); enHit++; }
    if (out.kinoco_zukan) { tags.push('kinoco'); kinocoHit++; }
    if (tags.length === 0) noSource++;
    console.log(`  ${(processed + 1).toString().padStart(3)}/${targets.length} ${m.id.padEnd(30)} [${tags.join(',') || '-'}]`);

    processed++;
    if (processed % 10 === 0) {
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
    }
  }

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');

  console.log('\n=== Summary ===');
  console.log(`Total:          ${processed}`);
  console.log(`Wikipedia ja:   ${jaHit}`);
  console.log(`Wikipedia en:   ${enHit}`);
  console.log(`kinoco-zukan:   ${kinocoHit}`);
  console.log(`No source:      ${noSource}`);
  console.log(`\nCache → ${CACHE_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
