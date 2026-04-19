/**
 * Phase 17 S11 用プロンプトテンプレ。Phase 13 prompt_templates.mjs の改訂版。
 *
 * 差分:
 *  - habitat/season/taxonomy/synonyms/observations は AI に渡すが合成対象外
 *    (既に master に大菌輪由来で埋まっているため、ここで再生成させない)
 *  - safety は事前決定済、AI は判定せず、指定 safety に従う
 *  - features_raw (統制タグ dict) を提示して散文化させる
 *  - tier に応じた文字数上限
 *  - similar_suggestion を大菌輪由来の allowlist として提示
 */

const CHAR_LIMITS = {
  0: { description: 400, features: 400, cooking: 400, poisoning: 400, caution: 100 },
  1: { description: 300, features: 300, cooking: 300, poisoning: 300, caution: 100 },
  2: { description: 160, features: 160, cooking: null, poisoning: 160, caution: 100 },
};

export const RULES_BLOCK_V17 = `1. ソースに明示的に書かれていない事実は絶対に書かない。推測・一般化・比喩による補填を禁止
2. 自由文フィールドは散文のみ。箇条書き・番号リスト・表を禁止
3. 各自由文フィールドの文字数上限を厳守（超過時は切り詰めず、合成をやり直す）
4. 自由文に学名・分類階層（門綱目科属）を書かない
5. 自由文では段落末尾に [1][2] 形式で出典番号
6. 数値は資料の値をそのまま引用
7. **safety の扱い**:
   - 入力 safety が mhlw 判定 (toxic/deadly) または approved/phase16 由来 (edible/caution/toxic/deadly/inedible) の場合は **その値を出力 safety に維持**、cooking/poisoning/caution は safety に整合させる
   - 入力 safety='unknown' の場合は、**wikipediaJa / daikinrin / wikipediaEn の記述を根拠に AI 自身が safety を判定して出力 JSON の safety フィールドに書き込む**。判定根拠を notes に記載。
     - 食用可の記述があれば 'edible'、食毒不明なら 'unknown' 維持、毒性記載があれば 'toxic'、致命事例記載があれば 'deadly'、食不適なら 'inedible'、食べられるが注意は 'caution'
   - safety=edible の種が mhlw 19 種に該当する場合は絶対に NG (致命的誤判定)
8. **cooking_preservation / poisoning_first_aid / caution は出力 safety に整合させる**:
   - edible/caution: cooking_preservation 必須
   - caution/toxic/deadly: poisoning_first_aid 必須、caution も必要なら記載
   - edible: poisoning_first_aid = null、caution = null
   - inedible: cooking/poisoning は null、注意事項があれば caution に書く
   - unknown (情報本当に無い場合のみ): すべて null、notes に「ソースに食毒記載なし」と明記
9. features は提示された features_raw (統制タグ dict) を散文に置き換えるだけ。新情報の追加禁止`;

export const SCHEMA_V17 = `{
  "safety": "edible | caution | inedible | toxic | deadly | unknown (ルール 7 に従う)",
  "description": "概要散文 (文字数上限守る) [1]",
  "features": "形態 + 発生生態の散文 (features_raw を散文化) [1]",
  "cooking_preservation": "safety=edible/caution のみ、それ以外 null",
  "poisoning_first_aid": "safety=caution/toxic/deadly のみ、edible/inedible/unknown なら null",
  "caution": "危険種または注意要種、edible なら null",
  "similar_species": [{ "ja": "和名", "note": "≤50 字 識別ポイント" }],
  "regions": ["日本国内 + 主要海外 (海外地名羅列禁止)"],
  "tree_association": ["関連樹種"],
  "aliases": ["別名・旧和名・漢字表記・方言名"],
  "sources": [{ "name": "...", "url": "...", "license": "..." }],
  "notes": "編集判断ログ 50-200 字。safety=unknown で AI が判定した場合は判定根拠を必ず記載"
}`;

export const SOURCE_PRIORITY_V17 = `1. wikipediaJa (あれば最優先、和名・別名・食文化すべて ja 基準)
2. daikinrin 本文 (学名・分類・分布の canonical source, CC BY 4.0)
3. mhlw (食毒情報の一次ソース、該当時は絶対的に優先)
4. wikipediaEn (ja 欠落分のみ、ja と矛盾したら ja 採用)`;

function safetyHints(safety) {
  if (safety === 'unknown') {
    return {
      cooking: 'AI が safety を判定後、edible/caution なら必須、それ以外 null',
      poisoning: 'AI が safety を判定後、caution/toxic/deadly なら必須、それ以外 null',
      caution: 'AI が safety を判定後、危険性があれば必須、edible なら null',
    };
  }
  const canEat = safety === 'edible' || safety === 'caution';
  const canPoison = safety === 'caution' || safety === 'toxic' || safety === 'deadly';
  return {
    cooking: canEat ? '必須 (文字数上限内)' : 'null を返す',
    poisoning: canPoison ? '必須 (文字数上限内)' : 'null を返す',
    caution: canPoison ? '必要なら文字数上限内、不要なら null' : 'null を返す',
  };
}

function formatTagDict(dict) {
  if (!dict || typeof dict !== 'object') return '(なし)';
  const keys = Object.keys(dict);
  if (keys.length === 0) return '(なし)';
  return keys
    .map((k) => `  - ${k}: ${(dict[k] || []).join(', ')}`)
    .join('\n');
}

function formatFeaturesRaw(featuresRaw) {
  if (!featuresRaw || typeof featuresRaw !== 'object') return '(大菌輪 featuresRaw なし)';
  const sections = Object.keys(featuresRaw);
  if (sections.length === 0) return '(大菌輪 featuresRaw なし)';
  return sections
    .map((sec) => {
      const attrs = featuresRaw[sec];
      const pairs = Object.keys(attrs).map((k) => `  ${k}: ${attrs[k].join(', ')}`).join('\n');
      return `[${sec}]\n${pairs}`;
    })
    .join('\n');
}

function formatSimilarSuggestion(sug) {
  if (!Array.isArray(sug) || sug.length === 0) return '(大菌輪の比較対象掲載なし)';
  return sug.slice(0, 10).map((s) => `  - ${s.displayName}`).join('\n');
}

/**
 * Phase 17 合成 prompt を組み立てる。
 * @param {{
 *   japaneseName: string,
 *   scientificName: string,
 *   tier: 0 | 1 | 2,
 *   safety: string,
 *   isMhlw: boolean,
 *   daikinrinSummary: {
 *     synonyms: string[],
 *     taxonomy: object,
 *     habitat: object,
 *     season: { tags: string[] },
 *     featuresRaw: object,
 *     similarSuggestion: Array<{displayName: string}>,
 *     externalLinks: Array<{name: string, url: string}>,
 *   } | null,
 *   combinedJsonPath: string,
 *   outputJsonPath: string,
 * }} args
 * @returns {string}
 */
export function buildPhase17Prompt({
  japaneseName,
  scientificName,
  tier,
  safety,
  isMhlw,
  daikinrinSummary,
  combinedJsonPath,
  outputJsonPath,
}) {
  const limits = CHAR_LIMITS[tier];
  if (!limits) throw new Error(`buildPhase17Prompt: invalid tier ${tier}`);
  const hints = safetyHints(safety);
  const dk = daikinrinSummary || {};

  return `あなたは日本の菌類図鑑の編集者です。指定種について、自由文 9 フィールドのみ JSON で合成してください。
構造化データ (habitat/season/taxonomy/synonyms/observations) は既に master に埋まっているので再生成禁止。

# 対象種
- 和名: ${japaneseName}
- 学名: ${scientificName}
- tier: ${tier}  (0=Wikipedia JA あり / 1=EN のみ / 2=両方なし)
- 入力 safety: ${safety}  ${isMhlw ? '(mhlw 判定、絶対に覆さない)' : safety === 'unknown' ? '(自動判定失敗、wikipediaJa/daikinrin から AI が判定して出力 JSON の safety に書くこと)' : '(旧 approved/phase16 継承、維持してよい)'}
- mhlw 該当: ${isMhlw ? 'YES (食中毒一次情報源として絶対採用、safety 変更禁止)' : 'no'}

# 一次ソース
${combinedJsonPath} を Read ツールで読む。sources.* の非 null のみ使用。

# 大菌輪 由来の参考情報（自由文に取り込む際は散文化、再掲禁止）
## synonyms (scientific_synonyms、master に既載)
${(dk.synonyms || []).slice(0, 10).join(', ') || '(なし)'}

## habitat 統制タグ (habitat_tags、master に既載)
${formatTagDict(dk.habitat)}

## season タグ (season_tags、master に既載)
${(dk.season?.tags || []).join(', ') || '(なし)'}

## features_raw 統制タグ (散文化して features フィールドに書く)
${formatFeaturesRaw(dk.featuresRaw)}

## 類似種 suggestion (similar_species の allowlist, AI は note を書くのみ)
${formatSimilarSuggestion(dk.similarSuggestion)}

# 絶対遵守ルール
${RULES_BLOCK_V17}

# ソース採用優先順位
${SOURCE_PRIORITY_V17}

# 出力 JSON スキーマ (9 フィールド + sources + notes)
\`\`\`json
${SCHEMA_V17}
\`\`\`

# tier ${tier} 文字数上限
- description: ≤ ${limits.description} 字
- features: ≤ ${limits.features} 字
- cooking_preservation: ${limits.cooking === null ? 'null (tier 2 は省略可)' : `≤ ${limits.cooking} 字`}
- poisoning_first_aid: ≤ ${limits.poisoning} 字
- caution: ≤ ${limits.caution} 字

# safety=${safety} に応じた取り扱い
- cooking_preservation: ${hints.cooking}
- poisoning_first_aid: ${hints.poisoning}
- caution: ${hints.caution}

# 完了後
${outputJsonPath} に Write ツールで JSON を書き込む。応答は \`done: <path> (<size>)\` のみ。
`;
}

export { CHAR_LIMITS as PHASE17_CHAR_LIMITS };
