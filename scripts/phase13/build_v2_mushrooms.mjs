/**
 * Phase 13-F / 14: v2 mushrooms.json 構築スクリプト
 *
 * 入力:
 *   - generated/articles/approved/<slug>.json
 *   - data/species-ranking.json (signals.toxicity / genus / synonyms の正典)
 *   - data/tier0-species.json + data/tier1-species.json (japaneseName / override の正典)
 *
 * 出力:
 *   - src/data/mushrooms.json
 *   - data/v2-build-report.json
 *
 * モード:
 *   - デフォルト (Phase 13-F): approved/ 全件を使って mushrooms.json を完全再構築
 *   - --append (Phase 14): 既存 mushrooms.json を保持し、新規 id のみ追加
 *
 * Usage:
 *   node scripts/phase13/build_v2_mushrooms.mjs            # 完全再構築
 *   node scripts/phase13/build_v2_mushrooms.mjs --append   # 既存保持 + 新規のみ追加
 *   node scripts/phase13/build_v2_mushrooms.mjs --dry-run  # 書き込まない
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APPROVED_DIR = 'generated/articles/approved';
const RANKING_PATH = 'data/species-ranking.json';
const TIER0_PATH = 'data/tier0-species.json';
const TIER1_PATH = 'data/tier1-species.json';
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
  unknown: 'unknown',
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
  // tier0/tier1 エントリに直接 safety が書かれていれば fallback として使う
  // (ranking.json に未登録の手動追加種向け — 例: Sarcomyxa edulis, Trichaleurina tenuispora)
  const rawSafety = ranking?.signals?.toxicity ?? ranking?.toxicity ?? tier0.safety;
  const safety = normalizeSafety(rawSafety);

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
  const tier1 = existsSync(TIER1_PATH) ? JSON.parse(readFileSync(TIER1_PATH, 'utf8')) : { species: [] };
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));

  // tier=0 / tier=1 を拾う。同一 slug があれば tier=0 優先（先勝ち）。
  // キーは slug に正規化（scientificName にハイフンが含まれるケースを吸収: 例 "Trichoderma cornu-damae"）
  const rankingByScientific = new Map();
  for (const s of ranking.species ?? []) {
    if (s.tier !== 0 && s.tier !== 1) continue;
    const slug = scientificToSlug(s.scientificName);
    if (rankingByScientific.has(slug)) continue;
    rankingByScientific.set(slug, s);
  }

  // tier0 + tier1 のキュレーションを統合。tier0 優先。
  const tier0ByScientific = new Map();
  for (const t of tier0.species ?? []) {
    tier0ByScientific.set(scientificToSlug(t.scientificName), t);
  }
  for (const t of tier1.species ?? []) {
    const slug = scientificToSlug(t.scientificName);
    if (tier0ByScientific.has(slug)) continue;
    tier0ByScientific.set(slug, t);
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
    const slug = scientificToSlug(scientific);
    const approved = loader(filename);
    const ranking = rankingByScientific.get(slug);
    const tier0 = tier0ByScientific.get(slug);

    if (!tier0) {
      skipped.push({ scientificName: scientific, reason: 'tier0/tier1 entry missing' });
      continue;
    }
    if (!ranking && !tier0.safety) {
      skipped.push({ scientificName: scientific, reason: 'ranking-missing (and no tier inline safety)' });
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

/**
 * Append モード: 既存 mushrooms.json を読み、approved/ 全件のうち新規 id のみ追加。
 * tier0 既存エントリの画像メタデータ (image_local / images_remote) を保持するのが目的。
 * 合成後は resolveSimilarSpeciesIds を全件に対して再実行し、tier0↔tier1 相互参照を解決。
 */
export function appendBuild({ existingMushrooms, approvedFiles, rankingByScientific, tier0ByScientific, loader = loadApprovedFile }) {
  const existingIds = new Set(existingMushrooms.map((m) => m.id));
  const newApproved = [];
  const skipped = [];

  for (const filename of approvedFiles) {
    const scientific = approvedFileToScientific(filename);
    const id = scientificToSlug(scientific);
    if (existingIds.has(id)) continue; // 既存 id は触らない

    const approved = loader(filename);
    const ranking = rankingByScientific.get(id);
    const tier0 = tier0ByScientific.get(id);
    if (!tier0) {
      skipped.push({ scientificName: scientific, reason: 'tier0/tier1 entry missing' });
      continue;
    }
    if (!ranking && !tier0.safety) {
      skipped.push({ scientificName: scientific, reason: 'ranking-missing (and no tier inline safety)' });
      continue;
    }
    try {
      newApproved.push(buildMushroom({ approved, ranking, tier0 }));
    } catch (e) {
      skipped.push({ scientificName: scientific, reason: `build-error: ${e.message}` });
    }
  }

  const merged = [...existingMushrooms, ...newApproved];
  return { mushrooms: resolveSimilarSpeciesIds(merged), skipped, addedCount: newApproved.length };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const append = process.argv.includes('--append');
  const { rankingByScientific, tier0ByScientific } = loadAllSources();
  const approvedFiles = listApprovedFiles();

  let mushrooms, skipped, addedCount = null;

  if (append) {
    if (!existsSync(OUT_PATH)) {
      console.error(`--append: ${OUT_PATH} が存在しません。先に完全再構築を実行してください。`);
      process.exit(1);
    }
    const existingMushrooms = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    const result = appendBuild({
      existingMushrooms,
      approvedFiles,
      rankingByScientific,
      tier0ByScientific,
    });
    mushrooms = result.mushrooms;
    skipped = result.skipped;
    addedCount = result.addedCount;
    console.log(`[append] existing ${existingMushrooms.length} + new ${addedCount} = ${mushrooms.length} (skipped ${skipped.length})`);
  } else {
    const result = buildAll({ approvedFiles, rankingByScientific, tier0ByScientific });
    mushrooms = result.mushrooms;
    skipped = result.skipped;
    console.log(`built ${mushrooms.length} mushrooms (skipped ${skipped.length})`);
  }

  const report = buildReport({ mushrooms, skipped });
  if (addedCount !== null) report.appendedCount = addedCount;

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
