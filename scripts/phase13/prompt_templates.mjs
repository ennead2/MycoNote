/**
 * Phase 13-C subagent に渡すプロンプト文字列を組み立てる。
 */

export const RULES_BLOCK = `1. ソースに明示的に書かれていない事実は絶対に書かない。推測・一般化・比喩による補填を禁止
2. ソース間で矛盾する場合は信頼性の高い記述を採用し、選定理由を notes に記す
3. 日本国内の情報を優先する。海外情報は国内事情の補足のみ（regions は海外含む可）
4. 自由文フィールドは散文のみ。箇条書き・番号リスト・表を禁止
5. 各自由文フィールドの文字数上限を厳守（超過時は削って収める）
6. 自由文に学名・分類階層（門綱目科属）を書かない
7. 自由文では段落末尾に [1][2] 形式で出典番号を付与
8. 数値は資料の値をそのまま引用`;

export const SCHEMA_BLOCK = `{
  "names": { "aliases": ["別名・旧和名・漢字表記・方言名・外来カタカナ等"] },
  "season": [
    { "start_month": 1-12, "end_month": 1-12 }
  ],
  "habitat": ["発生環境タグ 1〜5 個"],
  "regions": ["分布地域（海外含む可）"],
  "tree_association": ["関連樹種"],
  "similar_species": [
    { "ja": "和名", "note": "本種との識別ポイント ≤50 字" }
  ],
  "description": "≤ 400 字 概要散文 [1]",
  "features": "≤ 400 字 形態 + 発生生態の散文 [1]",
  "cooking_preservation": "≤ 400 字 和食優先、edible/caution のみ、それ以外 null",
  "poisoning_first_aid": "≤ 400 字 caution/toxic/deadly のみ、edible なら null",
  "caution": "≤ 100 字 危険種のみ、edible なら null",
  "sources": [
    { "name": "Wikipedia ja「xxx」", "url": "...", "license": "CC BY-SA 4.0" }
  ],
  "notes": "編集判断ログ 50〜200字"
}`;

export const FIELD_GUIDE = `- description: 何者か・特徴・食用性・国内の位置づけ。学名・分類階層は書かない
- features: 肉眼的特徴 + 発生季節・場所・共生樹種を散文で融合
- cooking_preservation: 和食文脈優先。海外レシピは国内料理の補足としてのみ
- poisoning_first_aid: 症状・潜伏時間・主な毒成分・応急措置の順
- caution: 致命的・特筆すべき警告一文のみ
- similar_species[].note: 本種との識別点を 50 字以内
- season: 「春〜初夏」等の曖昧表現は月数値に翻訳し notes に記載
- 日本国内の情報が乏しいフィールドは [] / null / 空文字のいずれか妥当な値、notes に明記`;

export const SEASON_SPEC = `- 配列で発生期ごとに {start_month, end_month} を 1 要素
- 春秋 2 期型（シイタケ等）は必ず 2 要素で表現
- 単一期は 1 要素
- 月数値は 1〜12 の整数、start <= end`;

function safetyHints(safety) {
  const canEat = safety === 'edible' || safety === 'caution';
  const canPoison = safety !== 'edible';
  return {
    cooking: canEat ? '必須（400字以内）' : 'null を返す',
    poisoning: canPoison ? '必須（400字以内）' : 'null を返す',
    caution: canPoison ? '必要なら 100 字以内で、なければ null' : 'null を返す',
  };
}

export function buildArticlePrompt({ japaneseName, scientificName, safety, combinedJsonPath, outputJsonPath }) {
  const hints = safetyHints(safety);
  return `あなたは日本の菌類図鑑の編集者です。以下のルールを厳守して、指定種の図鑑データを JSON で合成してください。

# 対象種
- 和名: ${japaneseName}
- 学名: ${scientificName}
- 安全区分: ${safety}

# 一次ソース
${combinedJsonPath} を Read ツールで読み、\`sources.*\` の非 null のみ使用。

# 絶対遵守ルール
${RULES_BLOCK}

# 出力 JSON スキーマ
\`\`\`json
${SCHEMA_BLOCK}
\`\`\`

# season 仕様
${SEASON_SPEC}

# フィールド別ガイド
${FIELD_GUIDE}

# 本種の safety=${safety} に応じた取り扱い
- cooking_preservation: ${hints.cooking}
- poisoning_first_aid: ${hints.poisoning}
- caution: ${hints.caution}

# 完了後
${outputJsonPath} に Write ツールで JSON を書き込む。応答は \`done: <path> (<size>)\` のみ。
`;
}
