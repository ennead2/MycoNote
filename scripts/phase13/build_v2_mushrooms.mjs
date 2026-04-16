/**
 * Phase 13-F: v2 mushrooms.json 構築スクリプト
 *
 * 入力:
 *   - generated/articles/approved/<slug>.json × 60
 *   - data/species-ranking.json (signals.toxicity / genus / synonyms の正典)
 *   - data/tier0-species.json (japaneseName / ja_wiki_source_override の正典)
 *
 * 出力:
 *   - src/data/mushrooms.json (v2 schema 60 種)
 *   - data/v2-build-report.json
 *
 * Usage:
 *   node scripts/phase13/build_v2_mushrooms.mjs
 *   node scripts/phase13/build_v2_mushrooms.mjs --dry-run
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APPROVED_DIR = 'generated/articles/approved';
const RANKING_PATH = 'data/species-ranking.json';
const TIER0_PATH = 'data/tier0-species.json';
const OUT_PATH = 'src/data/mushrooms.json';
const REPORT_PATH = 'data/v2-build-report.json';

// ===== Pure helpers (testable) =====

export function scientificToSlug(sci) {
  return sci.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

const SAFETY_MAP = {
  edible: 'edible',
  edible_caution: 'caution',
  caution: 'caution',
  inedible: 'inedible',
  toxic: 'toxic',
  deadly_toxic: 'deadly',
  deadly: 'deadly',
};

export function normalizeSafety(toxicity) {
  if (!(toxicity in SAFETY_MAP)) {
    throw new Error(`unknown safety: ${toxicity}`);
  }
  return SAFETY_MAP[toxicity];
}

export function resolveJapaneseName(tier0Entry) {
  const override = tier0Entry?.ja_wiki_source_override?.title;
  if (override && typeof override === 'string') return override;
  return tier0Entry.japaneseName;
}

export function buildMushroom({ approved, ranking, tier0 }) {
  const scientific = tier0.scientificName;
  const id = scientificToSlug(scientific);
  const ja = resolveJapaneseName(tier0);
  const safety = normalizeSafety(ranking?.signals?.toxicity ?? ranking?.toxicity);

  const taxonomy = {};
  if (ranking?.taxonomy?.order) taxonomy.order = ranking.taxonomy.order;
  if (ranking?.taxonomy?.family) taxonomy.family = ranking.taxonomy.family;
  if (ranking?.genus) taxonomy.genus = ranking.genus;

  const m = {
    id,
    names: {
      ja,
      scientific,
    },
    safety,
    season: approved.season,
    habitat: approved.habitat,
    regions: approved.regions,
    description: approved.description,
    features: approved.features,
    cooking_preservation: approved.cooking_preservation,
    poisoning_first_aid: approved.poisoning_first_aid,
    caution: approved.caution,
    similar_species: approved.similar_species,
    sources: approved.sources,
    image_local: null,
    images_remote: [],
  };

  if (Object.keys(taxonomy).length > 0) m.taxonomy = taxonomy;
  if (approved.names?.aliases?.length) m.names.aliases = approved.names.aliases;
  if (ranking?.synonyms?.length) m.names.scientific_synonyms = ranking.synonyms;
  if (approved.tree_association?.length) m.tree_association = approved.tree_association;
  if (approved.notes) m.notes = approved.notes;

  return m;
}

/**
 * similar_species[].id を v2 内の matching slug で埋める。
 * scientific match を優先、次に ja name match。
 */
export function resolveSimilarSpeciesIds(mushrooms) {
  const byJa = new Map();
  const byScientific = new Map();
  for (const m of mushrooms) {
    byJa.set(m.names.ja, m.id);
    byScientific.set(m.names.scientific, m.id);
  }

  return mushrooms.map((m) => ({
    ...m,
    similar_species: m.similar_species.map((sim) => {
      let id;
      if (sim.scientific && byScientific.has(sim.scientific)) {
        id = byScientific.get(sim.scientific);
      } else if (byJa.has(sim.ja)) {
        id = byJa.get(sim.ja);
      }
      return id ? { ...sim, id } : sim;
    }),
  }));
}

// ===== I/O orchestration =====

/** approved/<filename>.json から scientific name を逆算 (e.g. "Amanita_muscaria" -> "Amanita muscaria") */
export function approvedFileToScientific(filename) {
  return filename.replace(/\.json$/, '').replace(/_/g, ' ');
}

function loadAllSources() {
  const tier0 = JSON.parse(readFileSync(TIER0_PATH, 'utf8'));
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));

  // tier=0 のみで dedupe（同一 scientificName が tier 違いで複数行ある場合への対策）
  const rankingByScientific = new Map();
  for (const s of ranking.species ?? []) {
    if (s.tier !== 0) continue;
    rankingByScientific.set(s.scientificName, s);
  }

  const tier0ByScientific = new Map();
  for (const t of tier0.species ?? []) {
    tier0ByScientific.set(t.scientificName, t);
  }

  return { rankingByScientific, tier0ByScientific };
}

function loadApprovedFile(filename) {
  const path = join(APPROVED_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listApprovedFiles() {
  return readdirSync(APPROVED_DIR).filter((f) => f.endsWith('.json')).sort();
}

/**
 * approved/ ディレクトリを正典として駆動。
 * approved/ にあるファイルだけが mushrooms.json に出力される。
 * tier0-species.json で reject された種は自然に除外される。
 */
export function buildAll({ approvedFiles, rankingByScientific, tier0ByScientific, loader = loadApprovedFile }) {
  const mushrooms = [];
  const skipped = [];

  for (const filename of approvedFiles) {
    const scientific = approvedFileToScientific(filename);
    const approved = loader(filename);
    const ranking = rankingByScientific.get(scientific);
    const tier0 = tier0ByScientific.get(scientific);

    if (!ranking) {
      skipped.push({ scientificName: scientific, reason: 'ranking-missing' });
      continue;
    }
    if (!tier0) {
      skipped.push({ scientificName: scientific, reason: 'tier0-missing' });
      continue;
    }
    try {
      mushrooms.push(buildMushroom({ approved, ranking, tier0 }));
    } catch (e) {
      skipped.push({ scientificName: scientific, reason: `build-error: ${e.message}` });
    }
  }

  return { mushrooms: resolveSimilarSpeciesIds(mushrooms), skipped };
}

function buildReport({ mushrooms, skipped }) {
  const safetyCount = {};
  let withImages = 0;
  let similarResolved = 0;
  let similarTotal = 0;

  for (const m of mushrooms) {
    safetyCount[m.safety] = (safetyCount[m.safety] ?? 0) + 1;
    if (m.image_local) withImages++;
    for (const s of m.similar_species) {
      similarTotal++;
      if (s.id) similarResolved++;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    total: mushrooms.length,
    safetyCount,
    similarResolutionRate: similarTotal > 0 ? similarResolved / similarTotal : null,
    similarResolved,
    similarTotal,
    withImages,
    skipped,
    skippedCount: skipped.length,
  };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { rankingByScientific, tier0ByScientific } = loadAllSources();
  const approvedFiles = listApprovedFiles();

  const { mushrooms, skipped } = buildAll({
    approvedFiles,
    rankingByScientific,
    tier0ByScientific,
  });

  const report = buildReport({ mushrooms, skipped });

  console.log(`built ${mushrooms.length} mushrooms (skipped ${skipped.length})`);
  console.log(`  safety: ${JSON.stringify(report.safetyCount)}`);
  console.log(`  similar resolved: ${report.similarResolved}/${report.similarTotal}`);

  if (skipped.length > 0) {
    console.log(`  skipped:`);
    for (const s of skipped) {
      console.log(`    - ${s.scientificName}: ${s.reason}`);
    }
  }

  if (dryRun) {
    console.log('(dry-run: no files written)');
    return;
  }

  writeFileSync(OUT_PATH, JSON.stringify(mushrooms, null, 2) + '\n', 'utf8');
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`wrote ${OUT_PATH}`);
  console.log(`wrote ${REPORT_PATH}`);
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
