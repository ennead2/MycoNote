#!/usr/bin/env node
/**
 * Phase 17 S15: master.v1.json を既存図鑑 UI (src/data/mushrooms.json) と
 * 互換の schema に変換して data/phase17/mushrooms-v3.json を出力する。
 *
 * 変換ルール:
 *  - tier0 × description != null のみ抽出 (記事合成済)
 *  - taxonomy: 文字列 "Basidiomycota（担子菌門）" → {latin, jp}
 *  - habitat: 旧 approved/phase16 の habitat 継承、new は habitat_tags から生成
 *  - traits: trait-labels.json の allowed key で Record<key, count> 形式に変換
 *  - similar_species[].id: tier0 内の他種 slug とマッチして補完
 *  - Phase 17 拡張フィールド (tier/observations/sources.ref 等) はそのまま保持
 *
 * 出力: data/phase17/mushrooms-v3.json
 * 次のステップ (S15 最終): src/data/mushrooms.json へ置換
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const MASTER = join(ROOT, 'data/phase17/mushrooms-master.v1.json');
const OLD_MUSHROOMS = join(ROOT, 'src/data/mushrooms.json');
const TRAIT_LABELS = join(ROOT, 'src/data/trait-labels.json');
const PHASE16_DIR = join(ROOT, '../hopeful-brattain-19fc23/generated/articles');
const OUT = join(ROOT, 'data/phase17/mushrooms-v3.json');

// Phase 17 独自タグのうち habitat 生成に使うカテゴリ (既存 mushrooms.json 形式への平坦化)
const HABITAT_TAG_CATEGORIES = ['場所', '基質'];
const HABITAT_EXCLUDE_TAGS = new Set([
  // 論文引用や単なる属性は除外
  '腐生性', 'mycorrhizal', '地上',
]);

function parseTaxonomyString(s) {
  if (typeof s !== 'string') return null;
  // "Basidiomycota（担子菌門）" → { latin: "Basidiomycota", jp: "担子菌門" }
  const m = s.match(/^(.+?)（(.+?)）\s*$/);
  if (m) return { latin: m[1].trim(), jp: m[2].trim() };
  // 「 fallback」 "Morchella" 属など jp なし
  return { latin: s.trim(), jp: '' };
}

function convertTaxonomy(tax) {
  if (!tax) return null;
  const out = {};
  for (const [k, v] of Object.entries(tax)) {
    if (typeof v === 'string') out[k] = parseTaxonomyString(v);
    else if (v && typeof v === 'object' && 'latin' in v) out[k] = v; // 既に {latin, jp}
  }
  return out;
}

function convertHabitatFromTags(habitatTags) {
  if (!habitatTags || typeof habitatTags !== 'object') return [];
  const out = [];
  for (const cat of HABITAT_TAG_CATEGORIES) {
    const values = habitatTags[cat] || [];
    for (const v of values) {
      if (HABITAT_EXCLUDE_TAGS.has(v)) continue;
      if (!out.includes(v)) out.push(v);
    }
  }
  return out;
}

function slugFromScientific(sci) {
  return sci.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function loadAllowedTraitKeys() {
  if (!existsSync(TRAIT_LABELS)) return null;
  const labels = JSON.parse(readFileSync(TRAIT_LABELS, 'utf-8'));
  const s = new Set();
  for (const el of labels.elements) {
    for (const attr of el.attributes) {
      for (const v of attr.values) s.add(v.key);
    }
  }
  return s;
}

function convertTraits(masterTraits, allowedKeys) {
  if (!masterTraits || !Array.isArray(masterTraits.traits)) return undefined;
  if (!allowedKeys) return undefined;
  const counts = {};
  for (const t of masterTraits.traits) {
    if (!allowedKeys.has(t.trait)) continue;
    counts[t.trait] = (counts[t.trait] || 0) + 1;
  }
  return Object.keys(counts).length > 0 ? counts : undefined;
}

/** 旧 approved mushrooms.json から既存 traits / habitat / image_local を拾う */
function loadLegacyExtras() {
  if (!existsSync(OLD_MUSHROOMS)) return new Map();
  const rows = JSON.parse(readFileSync(OLD_MUSHROOMS, 'utf-8'));
  const map = new Map();
  for (const r of rows) {
    const ja = r.names?.ja;
    if (ja) map.set(ja, {
      traits: r.traits,
      habitat: r.habitat,
      image_local: r.image_local,
    });
  }
  return map;
}

/** phase16 article から habitat を拾う */
function loadPhase16Habitat(sci) {
  const p = join(PHASE16_DIR, sci.replace(/ /g, '_') + '.json');
  if (!existsSync(p)) return null;
  try {
    const a = JSON.parse(readFileSync(p, 'utf-8'));
    return a.habitat ?? null;
  } catch { return null; }
}

function main() {
  const master = JSON.parse(readFileSync(MASTER, 'utf-8'));
  const allowedTraitKeys = loadAllowedTraitKeys();
  const legacyByJa = loadLegacyExtras();

  // tier0 × 記事合成済のみ
  const tier0 = master.filter((e) => e.tier === 0 && e.description);
  console.log(`tier0 with description: ${tier0.length}`);

  // similar_species の id 補完用マップ
  const jaToId = new Map();
  for (const e of tier0) jaToId.set(e.names.ja, e.id);

  const converted = tier0.map((e) => {
    const legacy = legacyByJa.get(e.names.ja) || {};
    const phase16Hab = e.article_origin === 'phase16' ? loadPhase16Habitat(e.names.scientific) : null;

    // habitat: 優先順 = 旧 approved > phase16 > master.habitat_tags から生成
    let habitat;
    if (e.article_origin === 'approved' && Array.isArray(legacy.habitat) && legacy.habitat.length > 0) {
      habitat = legacy.habitat;
    } else if (e.article_origin === 'phase16' && Array.isArray(phase16Hab) && phase16Hab.length > 0) {
      habitat = phase16Hab;
    } else {
      habitat = convertHabitatFromTags(e.habitat_tags);
    }

    // traits: 旧 approved で既に Record<key,count> があればそれ、なければ master.traits から変換
    let traits;
    if (legacy.traits && typeof legacy.traits === 'object' && !Array.isArray(legacy.traits)) {
      traits = legacy.traits;
    } else {
      traits = convertTraits(e.traits, allowedTraitKeys);
    }

    // similar_species: id 補完
    const similarSpecies = (e.similar_species || []).map((s) => {
      const id = jaToId.get(s.ja);
      return id ? { ja: s.ja, note: s.note, id } : { ja: s.ja, note: s.note };
    });

    // image_local: approved 既存を継承
    const imageLocal = legacy.image_local ?? e.image_local ?? null;

    // 既存 schema 互換のオブジェクト生成 (Phase 17 拡張は tier/observations 等として保持)
    const out = {
      id: e.id,
      tier: e.tier,
      names: {
        ja: e.names.ja,
        scientific: e.names.scientific,
        aliases: e.names.aliases || [],
        scientific_synonyms: e.names.scientific_synonyms || [],
      },
      safety: e.safety,
      season: e.season || [],
      habitat,
      regions: e.regions || [],
      description: e.description,
      features: e.features,
      cooking_preservation: e.cooking_preservation,
      poisoning_first_aid: e.poisoning_first_aid,
      caution: e.caution,
      similar_species: similarSpecies,
      sources: e.sources || [],
      image_local: imageLocal,
      images_remote: e.images_remote || [],
      taxonomy: convertTaxonomy(e.taxonomy),
      tree_association: e.tree_association || [],
      notes: Array.isArray(e.notes) ? e.notes.join(' ') : (e.notes || ''),
      images_remote_credits: e.images_remote_credits || [],
      // Phase 17 拡張フィールド (UI 互換性保持のため既存と同名、追加の参考情報は保持)
      myco_bank_id: e.myco_bank_id,
      observations: e.observations,
      article_origin: e.article_origin,
      source_availability: e.source_availability,
    };
    if (traits) out.traits = traits;
    return out;
  });

  // 統計
  const stats = {
    total: converted.length,
    withHabitat: converted.filter((e) => e.habitat.length > 0).length,
    withTraits: converted.filter((e) => e.traits).length,
    withImages: converted.filter((e) => e.images_remote.length > 0).length,
    withImageLocal: converted.filter((e) => e.image_local).length,
    taxonomyParsed: converted.filter((e) => e.taxonomy?.phylum?.latin).length,
    similarWithId: converted.reduce((acc, e) => acc + (e.similar_species || []).filter((s) => s.id).length, 0),
    similarTotal: converted.reduce((acc, e) => acc + (e.similar_species || []).length, 0),
    bySafety: {},
  };
  for (const e of converted) stats.bySafety[e.safety] = (stats.bySafety[e.safety] || 0) + 1;

  writeFileSync(OUT, JSON.stringify(converted, null, 2));

  console.log('\n=== Figurebook JSON stats ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nWrote ${OUT} (${(readFileSync(OUT).byteLength / 1024).toFixed(1)} KB)`);
}

main();
