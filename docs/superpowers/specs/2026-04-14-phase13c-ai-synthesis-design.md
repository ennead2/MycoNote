# Phase 13-C: AI 合成パイプライン — 設計書

> MycoNote Phase 13-C リファレンス
> Version 1.0 — 2026-04-14
> 前提設計書: `docs/superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md`

---

## 1. 目的と位置づけ

Phase 13-B / 13-B' で構築した `data/species-ranking.json` と Phase 13-A の combined source JSON を入力として、Tier 0 の 68 種について **v2 スキーマ準拠の構造化 JSON 記事を AI 合成**するパイプラインを実装する。

**Phase 13-C のスコープ**
- 合成パイプライン CLI の実装
- 機械検証ユーティリティ
- Tier 0 68 種の初回合成（成果物として commit）
- 合成結果を `generated/articles/*.json` に出力

**Phase 13-C のスコープ外**
- `mushrooms.json` へのマージ（Phase 13-F）
- レビュー UI（Phase 13-D）
- 軽量スキーマ移行 / 起動時マイグレーション（Phase 13-E）
- v2 リリース作業（Phase 13-F）

**Tier 1〜3 の合成は Phase 13-G 以降に段階実行**（スコープ 68 種に限定）。

---

## 2. 合成仕様

### 2.1 モデル

**Opus 4.6** を採用。理由：

- 2026-04-14 パイロット（10 種 × Sonnet / Opus）で Opus の出力が余分な敷衍を含まず v1 編集方針に近い
- Max 5x サブスク枠で 68 種の一括実行可
- 生成元ごとの token 消費: Opus が Sonnet 比で +36%、出力サイズは +17%
- Claude Code の `Agent` ツール（`model: "opus"` 指定）経由で subagent 並列化

### 2.2 パイロットで固まった判断事項

| 項目 | 決定 |
|---|---|
| 出力形式 | JSON（v1 `Mushroom` 型を拡張） |
| 自由文 | 散文のみ（箇条書き・表・番号リスト禁止） |
| 各自由文の上限 | 400 字（`caution` のみ 100 字） |
| 情報優先順位 | 日本国内 > 海外。`regions` は海外含む許容 |
| 学名・分類の本文埋め込み | 禁止（別フィールドで保持） |
| 出典番号 | 段落末尾に `[1][2]` |
| ソースなしの扱い | `null` / `[]` / 空文字のいずれか。`notes` で明記 |

### 2.3 出力 JSON スキーマ

AI が合成するフィールドのみ定義（id・分類・画像等の補完フィールドは別経路）：

```ts
type GeneratedArticle = {
  // --- AI 抽出構造化フィールド ---
  names: {
    aliases: string[];          // 別名・旧和名・漢字表記・方言名・外来カタカナ等
  };
  season: Array<{                // 複数期対応（例: シイタケは春秋2期 = 2要素）
    start_month: number;         // 1〜12
    end_month: number;
  }>;
  habitat: string[];             // 発生環境タグ（1〜5 個）
  regions: string[];             // 分布地域（海外含む）
  tree_association: string[];    // 関連樹種
  similar_species: Array<{
    ja: string;                  // 和名のみ
    note: string;                // 本種との識別ポイント ≤50 字
    // scientific は後段で v1 DB および GBIF から補完
  }>;

  // --- AI 合成自由文 ---
  description: string;           // ≤ 400 字、概要散文
  features: string;              // ≤ 400 字、形態 + 発生生態の散文
  cooking_preservation: string | null;  // ≤ 400 字、edible/caution のみ、それ以外 null
  poisoning_first_aid: string | null;   // ≤ 400 字、caution/toxic/deadly のみ、それ以外 null
  caution: string | null;        // ≤ 100 字、危険種のみ

  // --- 出典・レビュー用 ---
  sources: Array<{
    name: string;                // 例: "Wikipedia ja「アミガサタケ」"
    url: string;
    license: string;             // 例: "CC BY-SA 4.0", "政府標準利用規約"
  }>;
  notes: string;                 // 編集判断ログ（翻訳・選定・欠落明示の理由）50〜200字
};
```

### 2.4 自由文フィールドの書き方ガイド

| フィールド | 書くこと | 書かないこと |
|---|---|---|
| `description` | 何者か・特徴・食用性・国内の位置づけ | 学名・分類階層・形態数値 |
| `features` | 肉眼的特徴 + 発生季節・場所・共生樹種 | 分類階層・文化雑学 |
| `cooking_preservation` | 和食優先の調理・保存 | 海外レシピのみ（国内料理の補足としては可） |
| `poisoning_first_aid` | 症状・潜伏時間・主な毒成分・応急措置 | 一般的な注意喚起のみ |
| `caution` | 致命的・特筆すべき警告一文 | 通常の毒性説明 |

### 2.5 プロンプト（確定版）

入力: 対象種 1 件につき combined JSON（`.cache/phase13/combined/<slug>.json`）

```
あなたは日本の菌類図鑑の編集者です。以下のルールを厳守して、指定種の図鑑データを JSON で合成してください。

# 対象種
- 和名: {japaneseName}
- 学名: {scientificName}
- 安全区分: {safety}  // edible | caution | toxic | deadly | inedible

# 一次ソース
{combined_json_path} を Read ツールで読み、`sources.*` の非 null のみ使用。

# 絶対遵守ルール
1. ソースに明示的に書かれていない事実は絶対に書かない。推測・一般化・比喩による補填を禁止
2. ソース間で矛盾する場合は信頼性の高い記述を採用し、選定理由を notes に記す
3. 日本国内の情報を優先する。海外情報は国内事情の補足のみ（regions は海外含む可）
4. 自由文フィールドは散文のみ。箇条書き・番号リスト・表を禁止
5. 各自由文フィールドの文字数上限を厳守（超過時は削って収める）
6. 自由文に学名・分類階層（門綱目科属）を書かない
7. 自由文では段落末尾に [1][2] 形式で出典番号を付与
8. 数値は資料の値をそのまま引用

# 出力 JSON スキーマ
{GeneratedArticle スキーマを §2.3 より埋め込む}

# season 仕様
- 配列で発生期ごとに {start_month, end_month} を 1 要素
- シイタケ等の春秋 2 期種は必ず 2 要素で表現
- 曖昧表現（「春〜初夏」等）は月数値に翻訳し notes に記載

# フィールド別ガイド
{§2.4 の表を埋め込む}

# 完了後
`.cache/phase13/generated/<slug>.json` に Write ツールで書き込む。応答は `done: <path> (<size>)` のみ。
```

---

## 3. パイプライン構成

### 3.1 CLI

```
node scripts/phase13/generate_articles.mjs \
  [--slug <species_slug>] \    # 単一種テスト実行
  [--tier 0] \                 # Tier 指定、デフォルト tier0
  [--concurrency 5] \          # 並列度、Max 5x サブスク枠考慮
  [--force]                    # 既存出力を上書き
```

**依存**: Claude Code の `Agent` ツール（subagent_type: general-purpose, model: "opus"）。Node 側から直接呼ばないため、このスクリプト本体は「対象リスト生成 + プロンプト組立 + subagent 結果受領後の検証起動」の調整役。

※ 実装選択: Max 5x サブスク枠で動かすため、当面は **Claude Code セッション内での subagent オーケストレーション**とし、`generate_articles.mjs` は「対象リスト算出」「プロンプト文字列生成」「検証起動」の非 AI 部分に専念する。本番 Node→API 化（Phase 13-H 以降相当）は後送り。

### 3.2 処理フロー

```
[1] target resolution:  data/species-ranking.json から tier=0 を抽出
                         │
[2] source precheck:    各 slug について .cache/phase13/combined/<slug>.json が存在するか確認
                         │         不在なら fetch_sources.mjs を呼ぶ
                         ▼
[3] prompt build:       species × combined_json → プロンプト文字列
                         │
[4] AI synthesis:       subagent を並列発射（concurrency 5）
                         │         出力: .cache/phase13/generated/<slug>.json
                         ▼
[5] machine validation: 各出力 JSON を検証
                         │
[6] report generate:    合成結果 + 検証結果のサマリーを
                         │         docs/phase13/generation-log.md に追記
                         ▼
[7] 採用候補:           valid なものを generated/articles/<slug>.json として commit
```

### 3.3 ディレクトリ

```
scripts/phase13/
  ├─ generate_articles.mjs        # 新規: オーケストレータ（非 AI 部分）
  ├─ validate_article.mjs         # 新規: 機械検証ユーティリティ
  ├─ prompt_templates.mjs         # 新規: プロンプト組立（テスト可能）
  ├─ similar_species_resolve.mjs  # 新規: similar_species.ja → v1 DB id マッチング
  └─ (既存 13-A/B モジュール)

.cache/phase13/
  ├─ combined/<slug>.json         # 13-A 出力
  └─ generated/<slug>.json        # 13-C 出力（gitignore）

generated/articles/
  └─ <slug>.json                  # 採用候補、commit 対象
```

### 3.4 similar_species の後処理

AI は `similar_species: [{ja, note}]` のみを返す。scientific の補完は非 AI のポスト処理：

1. v1 `mushrooms.json` の `names.ja` および `names.aliases` と照合し、一致があれば v1 `id` を埋める
2. 一致しなければ GBIF Backbone Taxonomy で `ja` → `scientific` 解決を試み、`scientific` のみ埋める（未解決種扱い）
3. 両方失敗時は `ja` と `note` のみで確定（新規種候補として後の段で追加される可能性を残す）

出力例:
```json
"similar_species": [
  { "ja": "ツキヨタケ", "note": "...", "scientific": "Omphalotus guepiniiformis", "v1_id": "tsukiyotake" }
]
```

---

## 4. 機械検証

生成 JSON に対して自動チェックを行い、問題があれば `validation_status: "needs_regeneration"` と `validation_errors: [...]` を付与する。

### 4.1 検証項目

| # | 検証 | 失敗時の扱い |
|---|---|---|
| V1 | 必須フィールドの存在（description / features / sources / names.aliases / season / habitat / regions / tree_association / similar_species） | needs_regeneration |
| V2 | 自由文の文字数上限遵守（description ≤ 400, features ≤ 400, cooking ≤ 400, poisoning ≤ 400, caution ≤ 100） | needs_regeneration |
| V3 | 散文形式（`・`, `- `, `* `, `\d+\. ` 等の箇条書きマーカーが含まれない） | needs_regeneration |
| V4 | 自由文に学名パターン `[A-Z][a-z]+ [a-z]+` が含まれない（意図した表記を許容するため警告止まり） | warning |
| V5 | season 各要素が `1 <= start <= end <= 12` | needs_regeneration |
| V6 | safety と 自由文の整合: edible なら `cooking_preservation != null`、toxic/deadly なら `poisoning_first_aid != null` | needs_regeneration |
| V7 | `sources` が非空で各エントリに name / url / license が揃っている | needs_regeneration |
| V8 | 自由文に `[N]` 形式の出典番号が少なくとも 1 箇所含まれる | warning |

### 4.2 validate_article.mjs

pure function の検証関数群を提供し、`scripts/phase13/validate_article.test.mjs` で fixture 駆動テスト。失敗種はオーケストレータが 1 回だけ再生成を試み、それでも失敗するものは `needs_regeneration` として `generation-log.md` に記録、人間レビュー待ち。

### 4.3 レビューログ

`docs/phase13/generation-log.md` に以下を追記：

```
## 2026-04-14 tier0 batch (N=68)
- 合成成功: X 件
- 自動検証 pass: Y 件
- needs_regeneration: Z 件 (一覧 ...)
- 総 token: ~M
- プロンプト hash: <sha256 前 8 桁>
```

---

## 5. スキーマ拡張（v1 からの差分）

Phase 13-C の出力は v1 `Mushroom` と完全互換ではない。Phase 13-E で型移行する前提で、以下の差分を記録：

| フィールド | v1 | v2 | 備考 |
|---|---|---|---|
| `season` | `{ start_month, end_month }` | `Array<{ start_month, end_month }>` | 複数期対応 |
| `similar_species` | `string[]`（id 参照） | `Array<{ ja, note, scientific?, v1_id? }>` | リッチ化 + 外部種対応 |
| `toxicity` enum | `edible_caution`, `deadly_toxic` | `caution`, `deadly` | 呼称統一（Phase 13-E で決定） |
| `sources` | 未定義 | 必須 | 出典記録の正式化 |
| `notes` | 未定義 | オプショナル | 編集判断ログ |

v1 の既存フィールド（`id`, `names.ja`, `names.scientific`, `taxonomy`, `toxicity`, `image_local`, `images_remote`, `traits`）は Phase 13-C では**生成しない**（別経路補完）。これらは既存 Phase の成果物および v1 データから持ち越す。

---

## 6. 出力先と git 運用

- `.cache/phase13/generated/<slug>.json` — 合成結果（gitignore）
- `generated/articles/<slug>.json` — validation pass 分を commit
- `docs/phase13/generation-log.md` — 実行履歴（commit 対象）

`generated/articles/` は Phase 13-F のマージ元として使う。Phase 13-C 完了時点では mushrooms.json は不変。

---

## 7. リスクと対策

| リスク | 対策 |
|---|---|
| Max 5x サブスク枠 5h リセット内で 68 種終わらない | `--concurrency 5` 程度に抑え、Opus 消費量を事前計測してバッチ分割可能に |
| プロンプトの文字数上限指示が守られない | 機械検証 V2 で検知、自動再生成 1 回まで |
| 散文強制を破って箇条書きが混入 | V3 で検知・再生成 |
| similar_species.ja の表記ゆれで v1 マッチ失敗 | names.aliases / scientific_synonyms も照合対象に |
| 資料不足で空フィールドだらけになる | notes に明記される前提。レビューで許容範囲を判定 |
| CC BY-SA 伝播 | sources[] に license 明示、`generated/articles/` にそのまま残す（Phase 13-E で配布形態整理） |

---

## 8. 成功基準

- Tier 0 68 種すべてに対して合成ジョブが完走
- 自動検証 pass 率 >= 80%
- needs_regeneration 種が `generation-log.md` で追跡可能
- `generated/articles/` に valid な JSON が commit されている
- Phase 13-D レビュー UI（後続）が `generated/articles/` を読めば v1/v2 差分レビューを開始できる状態

---

## 9. 実装計画への引き渡し

次ステップで `writing-plans` skill を呼び、本設計を Step 分割した実装計画に落とす。想定 Task：

- T1: prompt_templates.mjs（プロンプト組立、fixture テスト）
- T2: similar_species_resolve.mjs（v1 DB + GBIF マッチング、fixture テスト）
- T3: validate_article.mjs（§4.1 検証項目、fixture テスト）
- T4: generate_articles.mjs（オーケストレータ、対象選定 + プロンプト出力 + 検証呼び）
- T5: subagent 実行フロー設計（Claude Code セッション内での並列発射・結果受領パターン）
- T6: Tier 0 68 種本番合成
- T7: generation-log.md + docs/phase13/README.md 更新
- T8: Phase 13-C 完了記録（progress.md）

---

## 10. パイロット実測値（2026-04-14）

| 指標 | Sonnet 4.6 (10 種) | Opus 4.6 (10 種) | Opus v2 (2 種, JSON) |
|---|---:|---:|---:|
| 出力 bytes 合計 | 131,651 | 153,636 | 10,043 |
| total_tokens 合計 | 390,866 | 531,631 | 100,934 |
| 平均 duration/種 | 164.5s | 170.7s | 86.9s |

Opus v2（JSON + 400 字上限）は旧 Markdown 比で **出力 77% 削減**、duration は半減。Tier 0 68 種の合成概算: **~3.4M tokens, ~99 min wall-clock（concurrency 5）**。
