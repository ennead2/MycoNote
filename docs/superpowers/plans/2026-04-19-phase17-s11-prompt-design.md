# Phase 17 S11: AI 合成 prompt 設計メモ

作成日: 2026-04-19
status: 設計、実装は S4-S6 完了後

## 目的

`article_origin='new'` エントリ (3989 件) のうち、tier0 (Wikipedia JA あり) から順次 AI 合成して記事本文を埋める。既存 Phase 13 `prompt_templates.mjs` をベースに、Phase 17 固有の改変を入れる。

## Phase 13 からの差分

### 1. 構造化データはルールベース抽出済み → AI に再生成させない

既存 Phase 13 では habitat / season / similar_species を AI に生成させていた。Phase 17 では:

| フィールド | 方式 | 備考 |
|---|---|---|
| `habitat_tags` (統制タグ dict) | 大菌輪 HTML 由来 (S4) | そのまま master に保持 |
| `season_tags` / `season` (月範囲) | 大菌輪フェノロジー由来 | そのまま |
| `features_raw` (統制タグ) | 大菌輪由来 | そのまま (debug 用) |
| `taxonomy` | 大菌輪由来 | そのまま |
| `synonyms` | 大菌輪由来 | そのまま |
| `observations` | 大菌輪 + iNat 由来 | そのまま |
| `traits` | Trait Circus 由来 | そのまま |
| `similar_species` | 大菌輪「比較対象」+ AI 肉付け | AI にはヒントとして提供 |

### 2. AI が合成するのは 9 フィールドのみ

```
description / features / cooking_preservation / poisoning_first_aid / caution
similar_species (note 部分) / regions / tree_association / aliases
```

`features` は大菌輪 `features_raw` (統制タグ) を人間可読散文に要約して書く。新しいことを書かない、構造化タグを散文化するだけ。

### 3. safety は事前決定済、AI は判定しない

`safety` フィールドは `scripts/phase17/resolve_safety.mjs` で決まる:
- 厚労省 19 種該当 → `toxic` / `deadly`
- 旧 approved/phase16 で既に決まっていれば継承
- それ以外は `unknown`

AI への指示:
- `safety` 値を prompt に埋め込み、AI は数値判断せずに**指定された safety** に合わせた文章を書く
- safety=unknown の場合、`cooking_preservation` / `poisoning_first_aid` / `caution` すべて null で OK を許容

### 4. tier に応じた prompt 調整

- **tier0 (Wikipedia JA あり)**: WP JA + 大菌輪 + (WP EN 補助) + (mhlw 該当時)
- **tier1 (WP EN のみ)**: 大菌輪 + WP EN + (mhlw 該当時)、ja の一次情報が少ないので記事は簡素に
- **tier2 (両方なし)**: 大菌輪のみ、簡素な記事に留める (description=160字、features=160字 程度)

### 5. validator 強化 (Phase 16 の教訓反映)

Phase 16 の validator 落ちが多発した原因:
- V6 (season 必須): season を AI が出さない → Phase 17 では大菌輪由来で事前埋め、validator 対象外
- V4 (habitat 必須): 同上、事前埋め
- V10 (similar_species): AI が関係ない種を挙げる → 大菌輪 `similar_suggestion` を allowlist 的に提示
- V13 (regions): 海外地名の羅列 → "日本国内 + 主要海外" に限定する指示

新 validator:
- 自由文フィールドが ≤ 400 字 (tier0/1)、≤ 200 字 (tier2)
- 学名・分類階層を自由文に含めない
- 文字数超過を許さない (切り詰めではなく、超過を検出してエラーで再生成)
- safety と mhlw の衝突 (edible + mhlw 該当) は絶対 throw

## Prompt テンプレート (Phase 17 版 draft)

```
あなたは日本の菌類図鑑の編集者です。指定種について、以下の **構造化データ** を読み込み、
自由文 9 フィールドのみ JSON で合成してください。構造化済みフィールド (habitat/season/
taxonomy/synonyms/observations) は既に master に入っているので再生成禁止。

# 対象種
- 和名: {japaneseName}
- 学名: {scientificName}
- tier: {tier}  (0=Wikipedia JA あり、1=EN のみ、2=両方なし)
- safety: {safety}  (既に決定済、AI は覆さない)
- mhlw 該当: {isMhlw}

# 一次ソース
{combinedJsonPath} を Read して sources.* を使用。

# 大菌輪構造化データ (既に master に反映済、参考として提示)
- habitat_tags: {habitatTags}
- season_tags: {seasonTags}
- features_raw: {featuresRawPreview}   ← 散文化してください
- similar_suggestion: {similarSuggestion}  ← AI は note を書くのみ、displayName は既定

# 採用優先順位
1. Wikipedia JA (あれば最優先)
2. 大菌輪本文 (分類・分布・記載)
3. mhlw (食毒に関して絶対的な一次ソース、該当時)
4. Wikipedia EN (ja 欠落分のみ)

# 出力 JSON スキーマ (9 フィールドのみ)
{
  "description": "≤ {charLimit} 字",
  "features": "≤ {charLimit} 字 (features_raw を散文化、憶測禁止)",
  "cooking_preservation": "safety=edible/caution のみ、それ以外 null",
  "poisoning_first_aid": "safety=caution/toxic/deadly のみ、edible なら null",
  "caution": "≤ 100 字、edible なら null",
  "similar_species": [{ "ja": "...", "note": "≤ 50 字" }],
  "regions": ["日本 + 主要海外のみ、羅列禁止"],
  "tree_association": ["関連樹種"],
  "aliases": ["別名・旧和名・漢字表記・方言名"]
}

# 絶対遵守
- ソースに書かれていない事実の補填禁止
- 自由文に学名・分類階層を含めない
- safety=edible かつ mhlw 該当は致命エラー (そもそも本 prompt に来ない前提だが確認)
- 段落末尾に [1][2] 形式で出典番号

# 完了後
{outputJsonPath} に Write。応答は `done: <path>` のみ。
```

## 文字数上限 (tier 別)

| フィールド | tier0 | tier1 | tier2 |
|---|---|---|---|
| description | 400 | 300 | 160 |
| features | 400 | 300 | 160 |
| cooking_preservation | 400 | 300 | null 許容 |
| poisoning_first_aid | 400 | 300 | 160 |
| caution | 100 | 100 | 100 |

## バッチ実行方針

- tier0 の `article_origin='new'` 分だけ先に抽出 (数百件見込み、S5 完了後に確定)
- Task ツール (Agent) で並列バッチ投入、結果を `generated/phase17/` に書き出し
- validator で落ちたものは個別に再合成
- tier1/2 は tier0 のレビュー合格後に順次

## 未決事項

- tier1/2 の簡素化が図鑑品質とトレードオフ、最終的に tier2 は figurebook 非表示でも良いか (user 確認)
- 写真がない種の figurebook 扱い (記事だけで表示可能か、表示条件に 1 枚必須か)
- mhlw 該当の species で WP JA が無い場合の prompt (mhlw を主情報源にして OK)

## 実装予定タイミング

- S5 (Wikipedia availability) 完了後に tier0 対象の学名リスト作成
- AI 合成は Task agent の並列実行で 10〜20 件/バッチ、数百件を 1 日で処理
- validator pass → S12 (user レビュー)
