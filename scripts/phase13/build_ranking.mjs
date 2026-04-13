/**
 * Phase 13-B オーケストレータ。
 * 日本産菌類集覧 + Tier 0 手動リストを入力として、全候補にシグナル収集 → スコア計算 → tier 分類 →
 * data/species-ranking.json を出力する。
 *
 * Usage:
 *   node scripts/phase13/build_ranking.mjs [--limit N] [--concurrency N] [--tier1 N] [--tier2 N]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCandidatePool } from './candidate-pool.mjs';
import { resolveMycoBankId, buildKnownMapFromV1 } from './mycobank-resolve.mjs';
import { checkWikipediaJaExists } from './wikipedia-exists.mjs';
import { checkInatPhotos } from './inat-photos.mjs';
import { fetchGbifObservations } from './gbif-observations.mjs';
import { classifyToxicity, buildV1ToxicityMap, buildMhlwSet } from './toxicity-classify.mjs';
import { computeScore, rankAndClassify } from './scoring.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const runNext = () => {
    if (active >= concurrency || queue.length === 0) return;
    const { task, resolve, reject } = queue.shift();
    active++;
    Promise.resolve().then(task).then(v => { active--; resolve(v); runNext(); }, e => { active--; reject(e); runNext(); });
  };
  return (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    runNext();
  });
}

export async function enrichCandidate(candidate, deps, opts) {
  const safe = async (p) => {
    try { return await p; } catch { return null; }
  };

  const [mbRes, wikiRes, inatRes, gbifRes] = await Promise.all([
    safe(deps.resolveMycoBankId(candidate.scientificName, opts.mbOpts || {})),
    safe(deps.checkWikipediaJaExists(candidate)),
    safe(deps.checkInatPhotos(candidate.scientificName)),
    safe(deps.fetchGbifObservations(candidate.scientificName)),
  ]);
  const toxRes = deps.classifyToxicity(candidate.scientificName, opts.toxOpts || {});

  return {
    scientificName: candidate.scientificName,
    japaneseName: candidate.japaneseName,
    japaneseNames: candidate.japaneseNames,
    genus: candidate.genus,
    species: candidate.species,
    signals: {
      mycobankId: mbRes?.mycobankId ?? null,
      mycobankSource: mbRes?.source ?? 'error',
      wikiJaExists: wikiRes?.jaExists ?? false,
      inatHasPhotos: inatRes?.hasPhotos ?? false,
      inatTotalResults: inatRes?.totalResults ?? 0,
      observationsDomestic: gbifRes?.domestic ?? 0,
      observationsOverseas: gbifRes?.overseas ?? 0,
      toxicity: toxRes.toxicity,
      toxicitySource: toxRes.source,
      hasWamei: !!candidate.japaneseName,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag, def) => {
    const i = args.indexOf(flag);
    if (i < 0) return def;
    return args[i + 1];
  };
  const limit = parseInt(getArg('--limit', '0'), 10);
  const concurrency = parseInt(getArg('--concurrency', '5'), 10);
  const tier1Size = parseInt(getArg('--tier1', '100'), 10);
  const tier2Size = parseInt(getArg('--tier2', '300'), 10);

  // load inputs
  const checklistPath = join(__dirname, '../../data/jp-mycology-checklist.json');
  const v1Path = join(__dirname, '../../src/data/mushrooms.json');
  const tier0Path = join(__dirname, '../../data/tier0-species.json');

  const checklist = JSON.parse(await readFile(checklistPath, 'utf-8'));
  const v1 = JSON.parse(await readFile(v1Path, 'utf-8'));
  const tier0Doc = JSON.parse(await readFile(tier0Path, 'utf-8'));

  const pool = buildCandidatePool(checklist);
  const candidates = limit > 0 ? pool.slice(0, limit) : pool;
  const tier0Set = new Set(tier0Doc.species.map(e => e.scientificName));
  const knownMap = buildKnownMapFromV1(v1);
  const v1ToxMap = buildV1ToxicityMap(v1);
  const mhlwSet = buildMhlwSet();

  const deps = {
    resolveMycoBankId,
    checkWikipediaJaExists,
    checkInatPhotos,
    fetchGbifObservations,
    classifyToxicity,
  };
  const opts = {
    mbOpts: { knownMap },
    toxOpts: { v1Map: v1ToxMap, mhlwSet },
  };

  const limiter = createLimiter(concurrency);
  let done = 0;
  const total = candidates.length;
  const enriched = await Promise.all(candidates.map(c => limiter(async () => {
    const result = await enrichCandidate(c, deps, opts);
    done++;
    if (done % 10 === 0 || done === total) {
      console.error(`[progress] ${done}/${total} (${Math.round(done / total * 100)}%)`);
    }
    return result;
  })));

  for (const e of enriched) {
    e.score = computeScore(e.signals);
  }

  const ranked = rankAndClassify(enriched, { tier0Set, tier1Size, tier2Size });

  const outPath = join(__dirname, '../../data/species-ranking.json');
  const doc = {
    generatedAt: new Date().toISOString(),
    params: { total, tier1Size, tier2Size, concurrency, limit: limit || null },
    tier0Count: ranked.filter(r => r.tier === 0).length,
    tier1Count: ranked.filter(r => r.tier === 1).length,
    tier2Count: ranked.filter(r => r.tier === 2).length,
    tier3Count: ranked.filter(r => r.tier === 3).length,
    species: ranked,
  };
  await writeFile(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  console.error(`[done] wrote ${total} entries to ${outPath}`);
  console.error(`  tier0=${doc.tier0Count}, tier1=${doc.tier1Count}, tier2=${doc.tier2Count}, tier3=${doc.tier3Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
