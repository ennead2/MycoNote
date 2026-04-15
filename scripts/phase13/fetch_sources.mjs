/**
 * Phase 13 データソース収集 CLI。
 * Usage:
 *   node scripts/phase13/fetch_sources.mjs --name "Morchella esculenta" --mycobank 247978
 *   node scripts/phase13/fetch_sources.mjs --name "Morchella esculenta" --mycobank 247978 --out result.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchDaikinrinPage } from './daikinrin.mjs';
import { fetchWikipediaJa, fetchWikipediaEn } from './wikipedia.mjs';
import { fetchMhlwEntry } from './mhlw.mjs';
import { fetchRinyaOverview } from './rinya.mjs';
import { fetchTraitCircus } from './trait-circus.mjs';

// japaneseName は daikinrin 優先、欠落時は mhlw（毒きのこ index）から補う。
// daikinrin が落ちた種でも wikipediaJa が和名でヒットできるようにするため。
export function resolveJapaneseName({ daikinrin, mhlw }) {
  return daikinrin?.japaneseName ?? mhlw?.japaneseName ?? null;
}

export function combineSources({
  scientificName,
  daikinrin,
  wikipediaJa,
  wikipediaEn,
  mhlw,
  rinya,
  traitCircus,
}) {
  return {
    scientificName,
    japaneseName: resolveJapaneseName({ daikinrin, mhlw }),
    taxonomy: daikinrin?.taxonomy ?? {},
    synonyms: daikinrin?.synonyms ?? [],
    mycoBankId: daikinrin?.mycoBankId ?? null,
    observations: daikinrin?.observations ?? { domestic: 0, overseas: 0 },
    externalLinks: daikinrin?.externalLinks ?? [],
    sources: {
      daikinrin,
      wikipediaJa,
      wikipediaEn,
      mhlw,
      rinya,
      traitCircus,
    },
    combinedAt: new Date().toISOString(),
  };
}

export async function fetchAllSources({ scientificName, mycoBankId }) {
  // wikipediaJa 以外の 5 ソースを並列。wikipediaJa は japaneseName chain に依存するので後続。
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    // pages.json 経由で学名から MycoBank ID を引くため japaneseName は不要（null でよい）
    fetchDaikinrinPage(scientificName, null).catch(e => { console.error('daikinrin:', e.message); return null; }),
    fetchWikipediaEn({ scientificName }).catch(e => { console.error('wikipediaEn:', e.message); return null; }),
    fetchMhlwEntry(scientificName).catch(e => { console.error('mhlw:', e.message); return null; }),
    fetchRinyaOverview().catch(e => { console.error('rinya:', e.message); return null; }),
    fetchTraitCircus(scientificName).catch(e => { console.error('traitCircus:', e.message); return null; }),
  ]);

  const japaneseName = resolveJapaneseName({ daikinrin, mhlw });
  const wikipediaJa = await fetchWikipediaJa({ japaneseName, scientificName })
    .catch(e => { console.error('wikipediaJa:', e.message); return null; });

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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') args.name = argv[++i];
    else if (a === '--mycobank') args.mycobank = parseInt(argv[++i], 10);
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || !args.mycobank) {
    console.error('Usage: node fetch_sources.mjs --name "<scientific name>" --mycobank <id> [--out file.json]');
    process.exit(1);
  }
  const result = await fetchAllSources({
    scientificName: args.name,
    mycoBankId: args.mycobank,
  });
  const json = JSON.stringify(result, null, 2);
  if (args.out) {
    const dir = dirname(args.out);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(args.out, json);
    console.error(`Wrote ${args.out}`);
  } else {
    process.stdout.write(json);
  }
}

// Windows-safe entry-point detection: pathToFileURL handles drive letters and slashes
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
