#!/usr/bin/env node
/**
 * Phase 15 S4: 大菌輪 hierarchy.json から VISIBLE_SCHEMA (9 要素) 分だけを抽出し、
 * UI 構築用の小さい辞書 `src/data/trait-labels.json` を生成する。
 *
 * 元データ 1.6MB → 抽出後 ~70KB。バンドルサイズ削減のため。
 *
 * VISIBLE_SCHEMA は measure_coverage.mjs と揃えること（乖離するとマッチャが壊れる）。
 *
 * v2 (2026-04-18):
 *   - 要素順を「傘→柄→ひだ→つば→子実層托→肉→子実体→胞子紋→つぼ」に変更
 *     (「つば」と「つぼ」が似ているので離す)
 *   - 「襞」を「ひだ」に変更（ひらがな表記、ユーザーリクエスト）
 *   - 「子実体」に補足ヒント付与
 *   - presence は「有→無」固定、色は慣用順（暖色 → 寒色 → モノクロ）に並べ替え
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const HIERARCHY = join(ROOT, 'data', 'phase15', 'daikinrin-hierarchy.json');
const OUT = join(ROOT, 'src', 'data', 'trait-labels.json');

/**
 * 要素の UI 表示順と採用属性。measure_coverage.mjs の VISIBLE_SCHEMA と同一セット。
 * jp_override と hint は大菌輪オリジナル表記を UI 向けに調整する。
 */
const VISIBLE_SCHEMA = [
  { element_en: 'pileus', attrs: ['color', 'shape', 'surface', 'texture'] },
  { element_en: 'stipe', attrs: ['color', 'shape', 'surface', 'texture'] },
  { element_en: 'lamellae', attrs: ['color', 'shape', 'development'], jp_override: 'ひだ' },
  { element_en: 'annulus', attrs: ['presence', 'color'] },
  { element_en: 'hymenophore', attrs: ['color', 'shape', 'surface'], hint: 'ひだ・管孔・針の総称' },
  { element_en: 'context', attrs: ['color', 'texture'] },
  { element_en: 'fruiting body', attrs: ['color', 'shape', 'texture'], hint: 'キノコ全体の姿' },
  { element_en: 'spore print', attrs: ['color'] },
  { element_en: 'volva', attrs: ['presence', 'color'] },
];

/**
 * 色の並び順（慣用: 暖色 → 寒色 → モノクロ → メタ情報）。
 * hierarchy に入っている値は 17 種類程度。未知の色は末尾に並ぶ。
 */
const COLOR_ORDER = [
  'white',        // 白
  'yellow',       // 黄
  'orange',       // 橙
  'red',          // 赤
  'pink',         // 桃
  'purple',       // 紫
  'blue',         // 青
  'green',        // 緑
  'brown',        // 褐
  'grey',         // 灰
  'black',        // 黒
  'hyaline',      // 無色
  'pale',         // 淡色
  'dark',         // 暗色
  'concolorous',  // 同色
  'color change', // 変色する
];

/**
 * presence の固定順: 有 → 無
 */
const PRESENCE_ORDER = ['present', 'absent'];

/**
 * 属性タイプごとに値をソート。
 * - presence: PRESENCE_ORDER 順
 * - color: COLOR_ORDER 順
 * - それ以外: species_count 降順（hierarchy の元順を維持）
 */
function sortValues(attrEn, values) {
  if (attrEn === 'presence') {
    return orderBy(values, PRESENCE_ORDER);
  }
  if (attrEn === 'color') {
    return orderBy(values, COLOR_ORDER);
  }
  return values;
}

function orderBy(values, order) {
  const rank = new Map(order.map((v, i) => [v, i]));
  return [...values].sort((a, b) => {
    const ra = rank.has(a.value_en) ? rank.get(a.value_en) : order.length + 1;
    const rb = rank.has(b.value_en) ? rank.get(b.value_en) : order.length + 1;
    return ra - rb;
  });
}

function main() {
  const hierarchy = JSON.parse(readFileSync(HIERARCHY, 'utf-8'));

  const elements = [];
  for (const schema of VISIBLE_SCHEMA) {
    const entry = Object.entries(hierarchy.hierarchy).find(
      ([, e]) => e.element_en === schema.element_en,
    );
    if (!entry) {
      console.warn(`  skip (not in hierarchy): ${schema.element_en}`);
      continue;
    }
    const [elementJp, el] = entry;
    const attributes = [];
    for (const attrEn of schema.attrs) {
      const attrEntry = Object.entries(el.attributes || {}).find(
        ([, a]) => a.attribute_en === attrEn,
      );
      if (!attrEntry) continue;
      const [attrJp, attr] = attrEntry;
      const sorted = sortValues(attrEn, attr.values || []);
      const values = sorted.map((v) => ({
        en: v.value_en,
        jp: v.value_jp,
        key: v.trait_key,
      }));
      attributes.push({ en: attrEn, jp: attrJp, values });
    }
    elements.push({
      en: schema.element_en,
      jp: schema.jp_override ?? elementJp,
      ...(schema.hint ? { hint: schema.hint } : {}),
      attributes,
    });
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'https://mycoscouter.coolblog.jp/daikinrin/ (CC BY 4.0)',
    elements,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  const keyCount = elements.reduce(
    (n, e) => n + e.attributes.reduce((m, a) => m + a.values.length, 0),
    0,
  );
  console.log(`Wrote ${OUT}`);
  console.log(`  elements: ${elements.length}`);
  console.log(`  trait keys: ${keyCount}`);
}

main();
