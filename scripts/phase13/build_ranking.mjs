/**
 * Phase 13-B オーケストレータ。
 * 日本産菌類集覧 + Tier 0 手動リストを入力として、全候補にシグナル収集 → スコア計算 → tier 分類 →
 * data/species-ranking.json を出力する。
 *
 * Phase 13-B' で追加: 全候補を GBIF accepted name に正規化し、synonyms fallback を適用。
 * tier0 指名も正規化、pool 不在なら強制追加。
 *
 * Usage:
 *   node scripts/phase13/build_ranking.mjs [--limit N] [--concurrency N] [--tier1 N] [--tier2 N]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCandidatePool, buildCandidatePoolNormalized } from './candidate-pool.mjs';
import { resolveMycoBankId, buildKnownMapFromV1 } from './mycobank-resolve.mjs';
import { checkWikipediaJaExists } from './wikipedia-exists.mjs';
import { checkInatPhotos } from './inat-photos.mjs';
import { fetchGbifObservations } from './gbif-observations.mjs';
import { classifyToxicity, buildV1ToxicityMap, buildMhlwSet } from './toxicity-classify.mjs';
import { computeScore, rankAndClassify } from './scoring.mjs';
import { normalizeName } from './gbif-normalize.mjs';

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

  const synonyms = candidate.synonyms || [];
  const acceptedUsageKey = candidate.acceptedUsageKey ?? null;

  const [mbRes, wikiRes, inatRes, gbifRes] = await Promise.all([
    safe(deps.resolveMycoBankId(candidate.scientificName, { ...(opts.mbOpts || {}), acceptedUsageKey })),
    safe(deps.checkWikipediaJaExists({
      japaneseName: candidate.japaneseName,
      japaneseNames: candidate.japaneseNames,
      scientificName: candidate.scientificName,
      synonyms,
    })),
    safe(deps.checkInatPhotos(candidate.scientificName, { synonyms })),
    safe(deps.fetchGbifObservations(candidate.scientificName, { acceptedUsageKey })),
  ]);
  const toxRes = deps.classifyToxicity(candidate.scientificName, opts.toxOpts || {});

  return {
    scientificName: candidate.scientificName,
    japaneseName: candidate.japaneseName,
    japaneseNames: candidate.japaneseNames,
    genus: candidate.genus,
    species: candidate.species,
    originalNames: candidate.originalNames,
    synonyms,
    acceptedUsageKey,
    normalizationStatus: candidate.status,
    signals: {
      mycobankId: mbRes?.mycobankId ?? null,
      mycobankSource: mbRes?.source ?? 'error',
      wikiJaExists: wikiRes?.jaExists ?? false,
      wikiMatchedVia: wikiRes?.matchedVia ?? null,
      inatHasPhotos: inatRes?.hasPhotos ?? false,
      inatTotalResults: inatRes?.totalResults ?? 0,
      inatMatchedName: inatRes?.matchedName ?? null,
      observationsDomestic: gbifRes?.domestic ?? 0,
      observationsOverseas: gbifRes?.overseas ?? 0,
      toxicity: toxRes.toxicity,
      toxicitySource: toxRes.source,
      hasWamei: !!candidate.japaneseName,
    },
  };
}

/**
 * tier0 doc を normalize し、accepted name の Set と、強制追加すべき候補配列を返す。
 */
export async function resolveTier0(tier0Doc, { normalizeName: norm, poolAcceptedSet, concurrency = 3, onProgress }) {
  const entries = tier0Doc.species || [];
  const limit = createLimiter(concurrency);
  const total = entries.length;
  let done = 0;

  const results = await Promise.all(entries.map(e => limit(async () => {
    const n = await norm(e.scientificName);
    done++;
    if (onProgress) onProgress(done, total);
    return { entry: e, norm: n };
  })));

  // accepted name をキーに dedupe（同一 accepted への複数 tier0 指名を統合）
  const byAccepted = new Map();
  for (const { entry, norm } of results) {
    const key = norm.acceptedName;
    if (!byAccepted.has(key)) {
      byAccepted.set(key, {
        acceptedName: key,
        acceptedUsageKey: norm.acceptedUsageKey,
        synonyms: [...norm.synonyms],
        originalNames: [entry.scientificName],
        japaneseNames: entry.japaneseName ? [entry.japaneseName] : [],
        rationales: entry.rationale ? [entry.rationale] : [],
        status: norm.status,
      });
    } else {
      const b = byAccepted.get(key);
      if (!b.originalNames.includes(entry.scientificName)) b.originalNames.push(entry.scientificName);
      if (entry.scientificName !== key && !b.synonyms.includes(entry.scientificName)) b.synonyms.push(entry.scientificName);
      if (entry.japaneseName && !b.japaneseNames.includes(entry.japaneseName)) b.japaneseNames.push(entry.japaneseName);
      if (entry.rationale && !b.rationales.includes(entry.rationale)) b.rationales.push(entry.rationale);
    }
  }

  const acceptedSet = new Set(byAccepted.keys());
  const missingFromPool = [];
  for (const b of byAccepted.values()) {
    if (!poolAcceptedSet.has(b.acceptedName)) {
      missingFromPool.push({
        scientificName: b.acceptedName,
        japaneseName: b.japaneseNames[0] || null,
        japaneseNames: b.japaneseNames,
        genus: b.acceptedName.split(' ')[0],
        species: b.acceptedName.split(' ').slice(1).join(' ') || null,
        originalNames: b.originalNames,
        synonyms: b.synonyms,
        acceptedUsageKey: b.acceptedUsageKey,
        status: b.status,
        tier0Forced: true,
      });
    }
  }

  return { acceptedSet, missingFromPool, details: byAccepted };
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

  // Step 1: 候補プールを accepted name で正規化
  console.error('[normalize] candidate pool...');
  const fullPool = await buildCandidatePoolNormalized(checklist, {
    normalizeName,
    concurrency,
    onProgress: (d, t) => {
      if (d % 100 === 0 || d === t) console.error(`  pool-norm ${d}/${t}`);
    },
  });
  const pool = limit > 0 ? fullPool.slice(0, limit) : fullPool;
  console.error(`[normalize] pool size: ${pool.length} (limit=${limit || 'none'})`);

  // Step 2: tier0 も正規化、欠落を強制追加
  console.error('[normalize] tier0...');
  const poolAcceptedSet = new Set(pool.map(p => p.scientificName));
  const { acceptedSet: tier0Set, missingFromPool, details: tier0Details } =
    await resolveTier0(tier0Doc, {
      normalizeName,
      poolAcceptedSet,
      concurrency,
      onProgress: (d, t) => {
        if (d % 20 === 0 || d === t) console.error(`  tier0-norm ${d}/${t}`);
      },
    });
  console.error(`[normalize] tier0 accepted: ${tier0Set.size}, force-added to pool: ${missingFromPool.length}`);

  // limit が効いている場合、欠落 tier0 も追加される（tier0 は必ず scoring 対象）
  const candidates = [...pool, ...missingFromPool];

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
    tier0Requested: tier0Set.size,
    tier0ForceAdded: missingFromPool.length,
    species: ranked,
  };
  await writeFile(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  console.error(`[done] wrote ${total} entries to ${outPath}`);
  console.error(`  tier0=${doc.tier0Count}, tier1=${doc.tier1Count}, tier2=${doc.tier2Count}, tier3=${doc.tier3Count}`);
  console.error(`  tier0Requested=${doc.tier0Requested}, tier0ForceAdded=${doc.tier0ForceAdded}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
