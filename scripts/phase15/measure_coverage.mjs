#!/usr/bin/env node
/**
 * Phase 15 S1: 肉眼観察可能な形質 (10 要素 × 厳選属性) に絞って
 * 113 種のカバレッジを計測する。
 *
 * 入力:
 *   - data/phase15/species-traits-raw.json (fetch_species_traits.py 出力)
 *   - data/phase15/daikinrin-hierarchy.json (大菌輪 hierarchy.php キャッシュ)
 *
 * 出力:
 *   - data/phase15/species-traits-visible.json (絞り込み済み)
 *   - data/phase15/coverage-report.json (計測レポート)
 *   - stdout に人間可読サマリー
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const RAW_JSON = join(ROOT, 'data', 'phase15', 'species-traits-raw.json');
const HIERARCHY_JSON = join(ROOT, 'data', 'phase15', 'daikinrin-hierarchy.json');
const VISIBLE_JSON = join(ROOT, 'data', 'phase15', 'species-traits-visible.json');
const REPORT_JSON = join(ROOT, 'data', 'phase15', 'coverage-report.json');

/**
 * 肉眼観察可能な要素 × 属性。trait_key は `${element_en}_${attribute_en}_${value_en}` の形式。
 * attribute の判定は大菌輪 hierarchy の attribute_en を使う。
 *
 * v3 (2026-04-18 final): Trait Circus 実データ検証後の最終形。
 *   - 味 / 臭い (taste/odor) は Trait Circus にほぼ存在しない (taste: 0 件, odor: 1 件のみ)
 *     → 識別 UI からは除外。将来 AI 合成で補完する場合は別 pipeline で追加
 *   - 管孔 (tube) は実データで hymenophore に完全置換されているため削除
 *   - 革質・硬質種は pileus より fruiting body で記述されるため fruiting body を残置
 */
const VISIBLE_SCHEMA = [
  { element_en: 'pileus', attrs: ['color', 'shape', 'surface', 'texture'] },
  { element_en: 'stipe', attrs: ['color', 'shape', 'surface', 'texture'] },
  { element_en: 'lamellae', attrs: ['color', 'shape', 'development'] },
  { element_en: 'hymenophore', attrs: ['color', 'shape', 'surface'] },
  { element_en: 'context', attrs: ['color', 'texture'] },
  { element_en: 'fruiting body', attrs: ['color', 'shape', 'texture'] },
  { element_en: 'spore print', attrs: ['color'] },
  { element_en: 'annulus', attrs: ['presence', 'color'] },
  { element_en: 'volva', attrs: ['presence', 'color'] },
];

/**
 * hierarchy.json を走査して、VISIBLE_SCHEMA にマッチする trait_key のセットと
 * key → {element_jp, attribute_jp, value_jp} の辞書を構築する。
 */
function buildVisibleKeyIndex(hierarchy) {
  const allowedKeys = new Set();
  const keyLabel = {};
  // hierarchy.json の構造: { hierarchy: { "<element_jp>": { element_en, attributes: { "<attr_jp>": { attribute_en, values: [{value_jp, value_en, trait_key}] } } } } }
  for (const [elementJp, el] of Object.entries(hierarchy.hierarchy)) {
    const elementEn = el.element_en;
    const match = VISIBLE_SCHEMA.find((s) => s.element_en === elementEn);
    if (!match) continue;
    for (const [attrJp, attr] of Object.entries(el.attributes || {})) {
      const attrEn = attr.attribute_en;
      if (!match.attrs.includes(attrEn)) continue;
      for (const v of attr.values || []) {
        allowedKeys.add(v.trait_key);
        keyLabel[v.trait_key] = {
          element_jp: elementJp,
          element_en: elementEn,
          attribute_jp: attrJp,
          attribute_en: attrEn,
          value_jp: v.value_jp,
          value_en: v.value_en,
          total_species: v.species_count,
        };
      }
    }
  }
  return { allowedKeys, keyLabel };
}

function median(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function main() {
  const raw = JSON.parse(readFileSync(RAW_JSON, 'utf-8'));
  const hierarchy = JSON.parse(readFileSync(HIERARCHY_JSON, 'utf-8'));
  const { allowedKeys, keyLabel } = buildVisibleKeyIndex(hierarchy);

  console.log(`Visible trait keys: ${allowedKeys.size}`);
  console.log(`Target species (raw): ${raw.species.length}`);
  console.log('');

  // 種別に絞り込み
  const visible = raw.species.map((s) => {
    const keys = new Set();
    for (const t of s.traits) {
      if (allowedKeys.has(t.trait)) keys.add(t.trait);
    }
    return {
      id: s.id,
      ja: s.ja,
      scientific: s.scientific,
      matched_via: s.matched_via,
      matched_current_name: s.matched_current_name,
      visible_trait_count: keys.size,
      visible_traits: [...keys].sort(),
    };
  });

  // 要素別 埋まり率（1 種あたり「その要素に属する trait_key を 1 つ以上持つか」で計測）
  const elementCoverage = {};
  for (const schema of VISIBLE_SCHEMA) {
    const elementKeys = [...allowedKeys].filter((k) =>
      k.startsWith(schema.element_en + '_'),
    );
    const hasAny = visible.filter((v) =>
      v.visible_traits.some((tk) => elementKeys.includes(tk)),
    ).length;
    elementCoverage[schema.element_en] = {
      element_jp: Object.entries(hierarchy.hierarchy).find(
        ([, e]) => e.element_en === schema.element_en,
      )?.[0],
      allowed_keys: elementKeys.length,
      species_with_any: hasAny,
      coverage_pct: visible.length === 0 ? 0 : (hasAny / visible.length) * 100,
    };
  }

  // 種ごとの trait_count 統計
  const traitCounts = visible.map((v) => v.visible_trait_count);
  const zeroSpecies = visible.filter((v) => v.visible_trait_count === 0);
  const lowSpecies = visible.filter(
    (v) => v.visible_trait_count > 0 && v.visible_trait_count < 10,
  );
  const goodSpecies = visible.filter((v) => v.visible_trait_count >= 20);

  // 出力 1: species-traits-visible.json
  writeFileSync(
    VISIBLE_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        visible_trait_keys_total: allowedKeys.size,
        species: visible,
      },
      null,
      2,
    ),
    'utf-8',
  );

  // 出力 2: coverage-report.json
  const report = {
    generated_at: new Date().toISOString(),
    source: {
      raw_json: 'data/phase15/species-traits-raw.json',
      hierarchy_json: 'data/phase15/daikinrin-hierarchy.json',
    },
    schema: VISIBLE_SCHEMA,
    visible_keys_total: allowedKeys.size,
    species: {
      target: raw.target_species,
      matched_trait_circus: raw.matched_species,
      missing_trait_circus: raw.missing_species_count,
      missing_list: raw.missing_species,
    },
    visible_trait_counts: {
      mean: Number(mean(traitCounts).toFixed(1)),
      median: median(traitCounts),
      min: Math.min(...traitCounts, 0),
      max: Math.max(...traitCounts, 0),
      zero_species: zeroSpecies.map((s) => ({ id: s.id, ja: s.ja, scientific: s.scientific })),
      low_species: lowSpecies.map((s) => ({
        id: s.id,
        ja: s.ja,
        scientific: s.scientific,
        count: s.visible_trait_count,
      })),
      good_species_count: goodSpecies.length,
    },
    element_coverage: elementCoverage,
  };
  writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf-8');

  // stdout サマリー
  console.log('=== Visible trait count distribution ===');
  console.log(`  mean:    ${report.visible_trait_counts.mean}`);
  console.log(`  median:  ${report.visible_trait_counts.median}`);
  console.log(`  min:     ${report.visible_trait_counts.min}`);
  console.log(`  max:     ${report.visible_trait_counts.max}`);
  console.log(`  >=20 keys: ${goodSpecies.length} / ${visible.length} 種`);
  console.log(`  <10 keys:  ${lowSpecies.length} 種`);
  console.log(`  0 keys:    ${zeroSpecies.length} 種`);
  console.log('');
  console.log('=== Element coverage (any key present) ===');
  for (const [en, c] of Object.entries(elementCoverage)) {
    const pct = c.coverage_pct.toFixed(1).padStart(5);
    console.log(`  ${pct}% ${en.padEnd(12)} (${c.element_jp}) ${c.species_with_any}/${visible.length}`);
  }

  if (zeroSpecies.length > 0) {
    console.log('\n=== Zero-trait species (要 AI 合成補完候補) ===');
    for (const s of zeroSpecies) {
      console.log(`  - ${s.ja} (${s.scientific})`);
    }
  }
  if (lowSpecies.length > 0) {
    console.log('\n=== Low-trait species (<10 keys) ===');
    for (const s of lowSpecies.slice(0, 15)) {
      console.log(`  - ${s.ja} (${s.scientific}): ${s.visible_trait_count} keys`);
    }
    if (lowSpecies.length > 15) console.log(`  ... 他 ${lowSpecies.length - 15} 種`);
  }

  console.log(`\nWrote ${VISIBLE_JSON}`);
  console.log(`Wrote ${REPORT_JSON}`);
}

main();
