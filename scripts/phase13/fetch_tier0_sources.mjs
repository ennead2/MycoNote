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

async function fetchFor({ scientificName, japaneseName, jaWikiSourceOverride }) {
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
    fetchWikipediaEn({ scientificName }).catch(() => null),
    fetchMhlwEntry(scientificName).catch(() => null),
    fetchRinyaOverview().catch(() => null),
    fetchTraitCircus(scientificName).catch(() => null),
  ]);
  const jaName = daikinrin?.japaneseName ?? mhlw?.japaneseName ?? japaneseName;
  let wikipediaJa;
  if (jaWikiSourceOverride?.title) {
    wikipediaJa = await fetchWikipediaJa({ japaneseName: jaWikiSourceOverride.title, scientificName: null })
      .catch(() => null);
  } else {
    wikipediaJa = await fetchWikipediaJa({ japaneseName: jaName, scientificName })
      .catch(() => null);
  }
  return combineSources({
    scientificName,
    daikinrin,
    wikipediaJa,
    wikipediaEn,
    mhlw,
    rinya,
    traitCircus,
    extractHint: jaWikiSourceOverride?.extract_hint ?? null,
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

async function runResolveCanonical(manifest, concurrency) {
  const diffs = [];
  await runPool(manifest, async (m) => {
    const dk = await fetchDaikinrinPage(m.scientificName, m.japaneseName).catch(() => null);
    if (!dk?.url) return;
    const match = dk.url.match(/\/Pages\/([A-Z][a-z]+_[a-z]+(?:_[a-z]+)*)_\d+\.html/);
    if (!match) return;
    const canonical = match[1].replace(/_/g, ' ');
    if (canonical !== m.scientificName) {
      diffs.push({
        slug: m.slug,
        target: m.scientificName,
        canonical,
        daikinrin_japaneseName: dk.japaneseName ?? null,
        daikinrin_url: dk.url,
      });
    }
  }, concurrency);

  const outPath = '.cache/phase13/canonical-diff.json';
  writeFileSync(outPath, JSON.stringify(diffs, null, 2), 'utf8');
  console.log(`canonical-diff written to ${outPath}: ${diffs.length} mismatches`);
  for (const d of diffs) {
    console.log(`  ${d.slug}: "${d.target}" → "${d.canonical}" (ja=${d.daikinrin_japaneseName})`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 3;
  const resolveCanonical = args.includes('--resolve-canonical');

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

  if (resolveCanonical) {
    return runResolveCanonical(manifest, concurrency);
  }

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
      const combined = await fetchFor({
        scientificName: m.scientificName,
        japaneseName: m.japaneseName,
        jaWikiSourceOverride: m.jaWikiSourceOverride,
      });
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
