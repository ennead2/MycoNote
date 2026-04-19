#!/usr/bin/env node
/**
 * Phase 17 S10: 新 master JSON を全ソースから組み立てる。
 *
 * 入力:
 *  - data/phase17/article-map.json (S8)
 *  - .cache/phase13/daikinrin/<sci>_<mbId>.json (S4)
 *  - data/phase17/wikipedia-availability.json (S5)
 *  - data/phase17/inat-observations.json (S6)
 *  - data/phase17/ja-name-overrides.json
 *  - src/data/mushrooms.json (旧 approved)
 *  - ../hopeful-brattain-19fc23/generated/articles/*.json (旧 phase16)
 *  - (optional) data/phase17/trait-circus-lookup.json (S7、未完なら空で続行)
 *
 * 出力:
 *  - data/phase17/mushrooms-master.v1.json
 *  - data/phase17/mushrooms-master-stats.json
 *
 * 未完成データ (wikipedia-availability 等) がまだ走ってる時点でも走れるよう、
 * 欠損フィールドは null で埋めて続行 (dry-run モード)。
 *
 * 使い方:
 *   node scripts/phase17/build_master.mjs
 *   node scripts/phase17/build_master.mjs --limit 10    # smoke test
 *   node scripts/phase17/build_master.mjs --strict      # すべてのソースが揃ってないと exit
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';
import { parseScientificName } from './parse-scientific-name.mjs';
import { resolveSafety, validateSafetyAgainstMhlw } from './resolve_safety.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const ARTICLE_MAP = join(ROOT, 'data/phase17/article-map.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const INAT_OBS = join(ROOT, 'data/phase17/inat-observations.json');
const JA_OVERRIDES = join(ROOT, 'data/phase17/ja-name-overrides.json');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const PHASE16_ARTICLES_DIR = join(ROOT, '../hopeful-brattain-19fc23/generated/articles');
const TRAIT_LOOKUP = join(ROOT, 'data/phase17/trait-circus-lookup.json');

const OUT_MASTER = join(ROOT, 'data/phase17/mushrooms-master.v1.json');
const OUT_STATS = join(ROOT, 'data/phase17/mushrooms-master-stats.json');

const daikinrinCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--limit');
  return {
    limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity,
    strict: args.includes('--strict'),
  };
}

function scientificNameToSlug(sci) {
  return sci.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** 旧 approved mushrooms.json を和名で lookup できる Map に */
function buildApprovedIndex() {
  const rows = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf-8'));
  const byJa = new Map();
  for (const r of rows) {
    const ja = r.names?.ja;
    if (ja) byJa.set(ja, r);
  }
  return byJa;
}

/** 旧 phase16 article を学名 slug で lookup。存在チェックのみで content は lazy load */
function loadPhase16Article(scientificName) {
  const slug = scientificName.replace(/ /g, '_');
  const path = join(PHASE16_ARTICLES_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

/** sources 配列に ref:N (index+1) を自動付与。元配列が ref 付きならそのまま、無ければ index+1 を付与 */
function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((s, i) => ({
    ref: typeof s?.ref === 'number' ? s.ref : i + 1,
    name: s?.name ?? '',
    url: s?.url ?? '',
    license: s?.license ?? '',
  }));
}

/** article_origin に応じて本文 (description 等) を決定。sources も normalize して返す */
function mergeArticleBody(entry, approvedByJa) {
  const blank = {
    description: null,
    features: null,
    cooking_preservation: null,
    poisoning_first_aid: null,
    caution: null,
    similar_species: [],
    regions: [],
    tree_association: [],
    aliases: [],
    sources: [],
    article_notes: null,
  };
  if (entry.article_origin === 'approved') {
    const row = approvedByJa.get(entry.japaneseName);
    if (row) {
      return {
        description: row.description ?? null,
        features: row.features ?? null,
        cooking_preservation: row.cooking_preservation ?? null,
        poisoning_first_aid: row.poisoning_first_aid ?? null,
        caution: row.caution ?? null,
        similar_species: row.similar_species ?? [],
        regions: row.regions ?? [],
        tree_association: row.tree_association ?? [],
        aliases: row.names?.aliases ?? [],
        sources: normalizeSources(row.sources),
        article_notes: row.notes ?? null,
      };
    }
  } else if (entry.article_origin === 'phase16') {
    const art = loadPhase16Article(entry.scientificName);
    if (art) {
      return {
        description: art.description ?? null,
        features: art.features ?? null,
        cooking_preservation: art.cooking_preservation ?? null,
        poisoning_first_aid: art.poisoning_first_aid ?? null,
        caution: art.caution ?? null,
        similar_species: art.similar_species ?? [],
        regions: art.regions ?? [],
        tree_association: art.tree_association ?? [],
        aliases: art.names?.aliases ?? [],
        sources: normalizeSources(art.sources),
        article_notes: Array.isArray(art.notes) ? art.notes.join(' ') : (art.notes ?? null),
      };
    }
  }
  return blank;
}

/** 大菌輪 cache から 1 件 (学名 + mbId) を読む。無ければ null */
async function loadDaikinrin(sci, mbId) {
  if (mbId == null) return null;
  const key = `${sci}_${mbId}`;
  return await daikinrinCache.get(key);
}

async function main() {
  const { limit, strict } = parseArgs();
  mkdirSync(dirname(OUT_MASTER), { recursive: true });

  // 入力読み込み
  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const approvedByJa = buildApprovedIndex();

  const wikiAvail = loadJson(WIKI_AVAIL, []);
  const wikiMap = new Map();
  for (const w of wikiAvail) wikiMap.set(w.scientificName, w);

  const inatAvail = loadJson(INAT_OBS, []);
  const inatMap = new Map();
  for (const i of inatAvail) inatMap.set(i.scientificName, i);

  const overrides = loadJson(JA_OVERRIDES, []);
  const overrideByJa = new Map(overrides.map((o) => [o.japaneseName, o]));

  const traitLookup = loadJson(TRAIT_LOOKUP, {});

  // strict モードで未完データがあれば exit
  if (strict) {
    const problems = [];
    if (wikiAvail.length < articleMap.length - 50) problems.push(`wikipedia-availability: ${wikiAvail.length}/${articleMap.length}`);
    if (inatAvail.length < articleMap.length - 50) problems.push(`inat-observations: ${inatAvail.length}/${articleMap.length}`);
    if (problems.length > 0) {
      console.error('strict mode: some sources incomplete:');
      for (const p of problems) console.error('  ' + p);
      process.exit(2);
    }
  }

  const total = Math.min(articleMap.length, limit);
  console.log(`Master target: ${total} entries`);
  console.log(`Wikipedia availability loaded: ${wikiAvail.length}`);
  console.log(`iNat observations loaded: ${inatAvail.length}`);
  console.log(`Traits loaded: ${Object.keys(traitLookup).length}`);

  const master = [];
  const stats = {
    total: 0,
    byTier: { 0: 0, 1: 0, 2: 0, unknown: 0 },
    byOrigin: { approved: 0, phase16: 0, new: 0 },
    bySafety: {},
    daikinrinMiss: 0,
    wikipediaMiss: 0,
    inatMiss: 0,
    traitHits: 0,
    safetyValidationErrors: [],
  };

  for (let i = 0; i < total; i++) {
    const e = articleMap[i];
    const daikinrin = await loadDaikinrin(e.scientificName, e.mycoBankId);
    if (!daikinrin) stats.daikinrinMiss++;

    const wiki = wikiMap.get(e.scientificName);
    if (!wiki) stats.wikipediaMiss++;

    const inat = inatMap.get(e.scientificName);
    if (!inat) stats.inatMiss++;

    const override = overrideByJa.get(e.japaneseName) || null;

    // 学名 parse
    let parsedSci = null;
    try {
      parsedSci = parseScientificName(e.scientificName);
    } catch (err) {
      parsedSci = {
        scientificName: e.scientificName,
        scientificNameRaw: e.scientificName,
        infraspecificRank: null,
        infraspecificEpithet: null,
        authorship: null,
      };
    }

    // article body
    const body = mergeArticleBody(e, approvedByJa);

    // safety
    const synonymsFromDaikinrin = daikinrin?.synonyms || [];
    const safetyResult = resolveSafety({
      japaneseName: e.japaneseName,
      scientificName: e.scientificName,
      synonyms: synonymsFromDaikinrin,
    });
    // validate 旧 approved の safety と mhlw 矛盾がないか
    if (e.article_origin === 'approved') {
      const approvedRow = approvedByJa.get(e.japaneseName);
      if (approvedRow?.safety) {
        try {
          validateSafetyAgainstMhlw(approvedRow.safety, {
            japaneseName: e.japaneseName,
            scientificName: e.scientificName,
            synonyms: synonymsFromDaikinrin,
          });
        } catch (err) {
          stats.safetyValidationErrors.push({
            japaneseName: e.japaneseName,
            scientificName: e.scientificName,
            error: err.message,
          });
        }
      }
    }

    // traits
    const traits = traitLookup[e.scientificName] || null;
    if (traits) stats.traitHits++;

    // tier (wikipedia availability から or 未確定なら null)
    const tier = wiki?.tier ?? null;

    // 旧 approved の safety を優先採用、それ以外は resolve_safety
    let safety = safetyResult.safety;
    let safetyConfidence = safetyResult.confidence;
    if (e.article_origin === 'approved') {
      const approvedRow = approvedByJa.get(e.japaneseName);
      if (approvedRow?.safety) {
        safety = approvedRow.safety;
        safetyConfidence = 'approved_preserved';
      }
    } else if (e.article_origin === 'phase16') {
      const art = loadPhase16Article(e.scientificName);
      if (art?.safety) {
        safety = art.safety;
        safetyConfidence = 'phase16_preserved';
      }
    }

    // override 由来の synonyms/taxonomy (大菌輪から取れない種への fallback)
    const overrideEntry = overrideByJa.get(e.japaneseName);
    const synonyms = synonymsFromDaikinrin.length > 0
      ? synonymsFromDaikinrin
      : overrideEntry?.synonymsFromGbif || [];
    const authorshipFromOverride = overrideEntry?.gbifAuthorship || null;

    // 最終 master エントリ
    const master_entry = {
      id: scientificNameToSlug(e.scientificName),
      tier,
      names: {
        ja: e.japaneseName,
        scientific: parsedSci.scientificName,
        scientific_raw: parsedSci.scientificNameRaw,
        authorship: parsedSci.authorship || authorshipFromOverride,
        infraspecific_rank: parsedSci.infraspecificRank,
        infraspecific_epithet: parsedSci.infraspecificEpithet,
        aliases: body.aliases,
        scientific_synonyms: synonyms,
      },
      myco_bank_id: e.mycoBankId,
      source: e.source || 'daikinrin',
      article_origin: e.article_origin,
      taxonomy: daikinrin?.taxonomy || overrideEntry?.taxonomyFromGbif || null,
      habitat_tags: daikinrin?.habitat || null,
      season_tags: daikinrin?.season?.tags || null,
      season: daikinrin?.season?.months || [],
      features_raw: daikinrin?.featuresRaw || null,
      similar_suggestion: daikinrin?.similarSuggestion || [],
      external_links: daikinrin?.externalLinks || [],
      observations: {
        gbif: { domestic: daikinrin?.observations?.domestic ?? 0 },
        inat: { domestic: inat?.inatDomestic ?? 0 },
      },
      source_availability: {
        daikinrin: !!daikinrin,
        wikipedia_ja: wiki?.wikipediaJa?.exists ?? null,
        wikipedia_en: wiki?.wikipediaEn?.exists ?? null,
        mhlw: safetyResult.confidence === 'mhlw',
      },
      gbif_accepted_name: null, // S2+後続 pass で記録のみ
      safety,
      safety_confidence: safetyConfidence,
      // 本文 (AI 合成 or 流用)
      description: body.description,
      features: body.features,
      cooking_preservation: body.cooking_preservation,
      poisoning_first_aid: body.poisoning_first_aid,
      caution: body.caution,
      similar_species: body.similar_species,
      regions: body.regions,
      tree_association: body.tree_association,
      traits,
      sources: body.sources,
      notes: body.article_notes ? [body.article_notes] : [],
      override_note: override?.note ?? null,
    };

    master.push(master_entry);

    stats.total++;
    if (tier === 0 || tier === 1 || tier === 2) stats.byTier[tier]++;
    else stats.byTier.unknown++;
    stats.byOrigin[e.article_origin] = (stats.byOrigin[e.article_origin] || 0) + 1;
    stats.bySafety[safety] = (stats.bySafety[safety] || 0) + 1;
  }

  writeFileSync(OUT_MASTER, JSON.stringify(master, null, 2));
  writeFileSync(OUT_STATS, JSON.stringify(stats, null, 2));

  console.log('\n=== Master Build Stats ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nMaster: ${OUT_MASTER}`);
  console.log(`Stats: ${OUT_STATS}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
