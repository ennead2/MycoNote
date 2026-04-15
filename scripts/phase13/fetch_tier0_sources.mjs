/**
 * Phase 13-C: manifest.json の hasCombined=false エントリに対し、
 * .cache/phase13/combined/<slug>.json を生成する。
 *
 * 先に `node scripts/phase13/generate_articles.mjs --prepare` を実行して
 * manifest.json を生成しておくこと。
 *
 * Usage:
 *   node scripts/phase13/fetch_tier0_sources.mjs [--concurrency=N]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fetchDaikinrinPage } from './daikinrin.mjs';
import { fetchWikipediaJa, fetchWikipediaEn } from './wikipedia.mjs';
import { fetchMhlwEntry } from './mhlw.mjs';
import { fetchRinyaOverview } from './rinya.mjs';
import { fetchTraitCircus } from './trait-circus.mjs';
import { combineSources } from './fetch_sources.mjs';

const MANIFEST_PATH = '.cache/phase13/prompts/manifest.json';
const OUT_DIR = '.cache/phase13/combined';

async function fetchFor({ scientificName, japaneseName }) {
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
    fetchWikipediaEn({ scientificName }).catch(() => null),
    fetchMhlwEntry(scientificName).catch(() => null),
    fetchRinyaOverview().catch(() => null),
    fetchTraitCircus(scientificName).catch(() => null),
  ]);
  const jaName = daikinrin?.japaneseName ?? mhlw?.japaneseName ?? japaneseName;
  const wikipediaJa = await fetchWikipediaJa({ japaneseName: jaName, scientificName })
    .catch(() => null);
  return combineSources({
    scientificName,
    daikinrin,
    wikipediaJa,
    wikipediaEn,
    mhlw,
    rinya,
    traitCircus,
  });
}

function summarize(combined) {
  const s = combined.sources ?? {};
  return [
    `daikinrin=${s.daikinrin ? '✓' : '-'}`,
    `wikiJa=${s.wikipediaJa ? '✓' : '-'}`,
    `wikiEn=${s.wikipediaEn ? '✓' : '-'}`,
    `mhlw=${s.mhlw ? '✓' : '-'}`,
    `rinya=${s.rinya ? '✓' : '-'}`,
    `traitCircus=${s.traitCircus ? '✓' : '-'}`,
  ].join(' ');
}

async function runPool(items, worker, concurrency) {
  const queue = [...items];
  const results = [];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const concurrencyArg = process.argv.find(a => a.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 3;

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const missing = manifest.filter(m => !m.hasCombined);
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`target: ${missing.length} species (concurrency=${concurrency})`);

  let done = 0;
  await runPool(missing, async (m) => {
    const out = `${OUT_DIR}/${m.slug}.json`;
    if (existsSync(out)) {
      console.log(`[${++done}/${missing.length}] SKIP ${m.scientificName} (already cached)`);
      return;
    }
    try {
      const combined = await fetchFor({ scientificName: m.scientificName, japaneseName: m.japaneseName });
      writeFileSync(out, JSON.stringify(combined, null, 2), 'utf8');
      console.log(`[${++done}/${missing.length}] OK ${m.scientificName} (${m.japaneseName}) ${summarize(combined)}`);
    } catch (err) {
      console.error(`[${++done}/${missing.length}] FAIL ${m.scientificName}: ${err.message}`);
    }
  }, concurrency);

  console.log('done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
