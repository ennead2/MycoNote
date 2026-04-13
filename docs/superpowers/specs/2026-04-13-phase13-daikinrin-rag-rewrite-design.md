# Phase 13: 大菌輪ベース RAG 方式 図鑑再構築 — 設計書

> MycoNote Phase 13 設計リファレンス
> Version 1.0 — 2026-04-13

---

## 1. 背景と目的

### 1.1 背景

- MycoNote v1 は AI 生成データを土台に `mushrooms.json`（300種、表示279種）を構築した
- Phase 12-F 手動レビュー（52/279 判定済み、`concern=35` / `delete=4`）で**ハルシネーション混入**が継続的に確認されている
- 逐次修正では信頼性の根治にならない（既修正箇所以外にも同種の誤りが残り続ける）

### 1.2 目的

**信頼できる一次ソースのみから図鑑記事を再合成**し、ハルシネーションを原理的に排除する。副次的に、記事生成を**再現可能なパイプライン化**することで、将来のデータ品質維持コストを下げる。

### 1.3 ゴール / 非ゴール

| 含まれる（v2 スコープ） | 含まれない |
|---|---|
| 新データソースからの構造化フィールド再構築 | v2 完成までの v1 データ逐次修正（凍結） |
| 7 セクション構成の本文 AI 合成（RAG 方式） | サーバーサイド生成（個人開発、キーはローカル） |
| Tier 0（手動指名） + 自動スコア順のティア分け | 近縁種自動フィルタ（やらない、自然淘汰に任せる） |
| 長期 1000〜1500 種ゴール、段階拡充 | v2 初回での全種着地 |
| 既存ユーザー記録・栞の学名ベース移行 | 旧 ID 体系の維持 |
| Phase 12-F レビューツールの拡張（生成記事レビュー） | 完全新規レビュー UI の作り直し |

---

## 2. データソース

### 2.1 使用するソース（RAG 入力 / 構造化フィールド）

| 分類 | ソース | ライセンス | 主な用途 |
|---|---|---|---|
| **構造化** | 大菌輪 HTML (`/daikinrin/Pages/*.html`) | CC BY 4.0 | 学名・和名・シノニム・分類階層・GBIF 国内観察数・外部リンクリスト |
| **構造化** | Trait Circus Parquet (`Atsushi/fungi_trait_circus_database`) | CC BY 4.0 | 統制形質（4.2M 行）、種同定・ソート軸 |
| **構造化** | 日本産菌類集覧 | CC BY 4.0 | 和名正典（Phase 12 で取り込み済） |
| **構造化** | GBIF Backbone Taxonomy | CC0 | 学名正典（Phase 12 で取り込み済） |
| **本文（RAG）** | Wikipedia ja | CC BY-SA 4.0 ⚠️ | 主要種の総合記述 |
| **本文（RAG）** | Wikipedia en | CC BY-SA 4.0 ⚠️ | 和名なし種の補完、国際的知見 |
| **本文（RAG）** | 厚生労働省「自然毒のリスクプロファイル」 | 政府標準利用規約（CC BY 4.0 相当） | 毒きのこ 28 種の中毒症状（写真は使わない） |
| **本文（RAG）** | 林野庁 特用林産物ページ | 政府標準利用規約 | 俗説否定・栽培情報 |
| **本文（RAG）** | 農林水産省 うちの郷土料理 | 政府標準利用規約 | 食文化セクション |
| **本文（RAG）** | 石川県林業試験場「いしかわきのこ図鑑」400種 | **規約個別確認要** | 地域きのこ相の一次情報（確認後に採用） |

### 2.2 参考リンク扱い（AI 入力には含めない）

以下は**外部リンクセクションに URL だけ掲載**する。本文生成には使わない。

- ホクト「きのこアルバム」（商用、All Rights Reserved）
- sansai-kinoko.com（運営者・ライセンス不明）
- 東京きのこ同好会 tokyokinoko.com（権威性・取得安定性で劣る）
- toolate.website 擬人化サイト（性質が異なる）

### 2.3 CC BY-SA 4.0 の伝播対策

Wikipedia 由来のテキストを AI 要約した場合でも派生物として BY-SA 伝播が発生する可能性がある。対策：

- **本文セクション単位でソースライセンスを明示**（`sources.prose[].license` フィールド）
- クライアント側で Wikipedia ソースに依存したセクションは HTML 属性 `data-license="CC BY-SA 4.0"` と著者リンクを自動付与
- JSON データ全体（スキーマ、ID、構造化フィールド、プロンプト）は CC BY 4.0 配布
- 本文テキストの再配布時だけ Share-Alike 条件が発生する旨を `LICENSE.md` に明記

---

## 3. 種の選定方式（重要度ランキング）

### 3.1 2 層構成

**Tier 0（手動指名）**
- 採取アプリとして**絶対に外せない核**を主観で選定
- 該当例: タマゴタケ、ドクツルタケ、シイタケ、ツキヨタケ、カエンタケ、アミガサタケ、エノキタケ、ブナシメジ、マイタケ、ヒラタケ、ベニテングタケ 等
- 初期規模: 30〜50 種程度（v0 リリース相当）

**Tier 1〜3（自動スコア順）**
- 以下の信号を重み付け合計してスコア算出
  - **GBIF 国内観察数**（log スケール、主軸）
  - **日本産菌類集覧に和名あり**（boolean ブースト）
  - **Wikipedia ja 記事あり**（boolean ブースト、本文生成可否の実用指標）
  - **iNat 画像あり**（boolean、画像表示可否の実用指標）
  - **毒性の明確さ**（強毒 / 有名食用はブースト）
- スコア降順でランキング、カットオフでティア分け

### 3.2 近縁種フィルタ

**なし**。Tier 0 で「この属は代表◯種入れる」を人が決め、以降は自動スコア順に任せる。結果的にタマゴタケは上位 / サトタマゴタケは下位 となり自然分離する想定。

### 3.3 段階リリース

| バージョン | 種数目安 | 基準 |
|---|---|---|
| **v2.0** | 50〜100 | Tier 0 全件 + 食用/毒きのこ有名種 |
| **v2.1** | 300〜400 | 国内観察数上位 + Wikipedia 記事あり |
| **v2.2〜** | 1000〜1500（長期） | スコア閾値を下げて段階拡充 |

v2.0 リリース後に順次拡充。カットオフ閾値は実データを見てから調整する（重みのチューニングは実装フェーズで）。

---

## 4. 記事構造

### 4.1 構造化フィールド（AI 生成なし）

```ts
type MushroomStructured = {
  id: string;                    // 新規（UUID ベース、v1 ID とは独立）
  name: string;                  // 和名
  scientificName: string;        // 正典学名（GBIF Backbone）
  scientific_synonyms: string[]; // シノニム（大菌輪 + GBIF）
  mycobank_id: number;           // 大菌輪 URL 由来
  taxonomy: {
    phylum: string; subphylum?: string;
    class: string; subclass?: string;
    order: string; family: string;
    genus: string;
  };
  controlled_traits: {
    element: string;   // 'pileus' | 'stipe' | 'gills' | 'spore' | ...
    attribute: string; // 'color' | 'shape' | 'size' | ...
    value: string;
    source_url: string;
  }[];
  safety: 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly';
  safety_rationale: string;     // どのソースに基づく判定か
  season: number[];              // 月数値
  habitat: string[];             // 樹種・環境
  distribution: {
    domestic_observations: number;  // GBIF 国内
    overseas_observations: number;  // GBIF 海外
  };
  hero_image: { url: string; source: 'inat' | 'gbif'; license: string; attribution: string } | null;
  external_links: { name: string; url: string }[];  // 大菌輪の外部リンクをそのまま
};
```

### 4.2 自由文セクション（AI が RAG で合成）

| # | セクション | 必須性 | 主ソース |
|---|---|---|---|
| 1 | 概要（2〜3段落） | 全種必須 | Wikipedia + 大菌輪注記 |
| 2 | 形態的特徴（傘・ヒダ・柄・肉・胞子） | 全種必須 | Trait Circus + Wikipedia |
| 3 | 発生・生態（季節・場所・共生） | 全種必須 | Wikipedia + 林野庁 |
| 4 | **類似種・見分け方** | 類似種がある種は**必須** | Wikipedia + 厚労省 |
| 5 | 食用利用・食文化 | `safety=edible` のみ | Wikipedia + 農水省郷土料理 |
| 6 | 中毒症状・対処 | `safety ∈ {caution, toxic, deadly}` のみ | 厚生労働省 + Wikipedia |
| 7 | 文化・雑学 | 任意（Wikipedia に記述ある場合のみ） | Wikipedia |

**セクション 4（類似種）の格上げ**: 採取アプリの安全性上の核。食用種は毒の類似種を、毒種は食用の紛らわしい種を必ず書く。

### 4.3 AI プロンプトの鉄則

1. 与えた資料に**書かれていること以外は絶対に書かない**。書かれていなければ「情報なし」と出力
2. 学名・数値は**構造化フィールドと照合**、矛盾時は `needs_review` フラグ
3. 各段落末尾に参照元 URL を `[1][2]` 形式で必ず付与
4. 推測・一般化・比喩による補填を禁止
5. 出力は **JSON Schema で縛る**（セクションごと文字数上限・必須/任意を指定）

### 4.4 生成後の機械検証

- 学名・サイズ数値・食毒分類が構造化フィールドと一致するか
- 全必須セクションが存在するか
- 各段落に出典 URL が付与されているか
- 不一致 / 未付与は `needs_regeneration` フラグで人間レビューへ

---

## 5. データスキーマ

### 5.1 `MushroomData`（v2）

```ts
type MushroomData = {
  // 識別
  id: string;                    // UUID、v1 ID とは独立
  legacy_v1_id?: string;         // v1 から引き継いだ種の旧 ID（移行スクリプト用参照）
  tier: 0 | 1 | 2 | 3;
  importance_score: number;

  // 構造化フィールド
  ...MushroomStructured;         // §4.1 参照

  // 本文
  article: {
    overview: { text: string; source_indices: number[] };
    morphology: { text: string; source_indices: number[] };
    ecology: { text: string; source_indices: number[] };
    similar_species: { text: string; source_indices: number[] }[];
    edible_use?: { text: string; source_indices: number[] };
    toxicity?: { text: string; source_indices: number[] };
    trivia?: { text: string; source_indices: number[] };
  };

  // 出典管理
  sources: {
    structured: { name: string; url: string; license: string; fetched_at: string }[];
    prose: { name: string; url: string; license: string; fetched_at: string }[];
  };

  // 生成・レビュー
  generated_at: string;          // ISO8601
  review_status: 'pending' | 'approved' | 'needs_regeneration' | 'legacy_only';
  review_notes?: string;
};
```

### 5.2 `legacy_only` 種の扱い

v1 に存在したが v2 初回リリース対象外の種（= Tier 0 にも自動スコア上位にも入らなかった種）は、`review_status: 'legacy_only'` で保持する。UI 上では：

- 検索結果には出るが、詳細画面は「このきのこは v2 記事未整備」テンプレ + 外部リンクのみ
- 既存ユーザーの記録・栞は従来どおり参照可能（データロスなし）
- 将来のティア拡充で順次 `pending → approved` に昇格

---

## 6. パイプライン構成

### 6.1 ワンショットバッチ方式

```
[1] 種リスト決定       → scripts/phase13/select_species.ts
[2] ソース収集         → scripts/phase13/fetch_sources.ts
[3] AI 合成             → scripts/phase13/generate_articles.ts
[4] 機械検証 + 人間レビュー → scripts/phase13/validate.ts + レビューツール拡張
[5] 公開（mushrooms.json 更新） → scripts/phase13/merge_approved.ts
```

### 6.2 各ステップの概要

- **[1] 種リスト決定**: 大菌輪から候補抽出 + Tier 0 手動リスト（JSON）読込 + 自動スコア算出 → 対象種リスト出力
- **[2] ソース収集**:
  - 大菌輪 HTML を MycoBank ID から URL 構築してフェッチ
  - Wikipedia ja/en を学名・和名で検索
  - 厚労省・林野庁・農水省の該当ページを学名ベースで引く
  - Trait Circus Parquet から該当種の形質抽出
  - フェッチした内容をローカルキャッシュ（`.cache/sources/`）に保存、再実行時はキャッシュ優先
- **[3] AI 合成**:
  - Claude API を呼び出し、§4.3 のプロンプトで本文を生成
  - レート制限対応で並列度制御
  - 出力 JSON を `generated/articles/*.json` に保存
- **[4] 検証**:
  - 機械検証（§4.4）で自動合格 / `needs_review` 振り分け
  - 人間レビューは Phase 12-F レビューツールを拡張（生成記事の差分表示）
- **[5] 公開**:
  - `approved` のみ `src/data/mushrooms.json` にマージ
  - 移行スクリプト `scripts/phase13/migrate_user_records.ts` を別途実行

### 6.3 出力成果物

- `src/data/mushrooms.json`（v2 スキーマ、approved + legacy_only）
- `mushrooms.v1.backup.json`（退避、将来参照用）
- `.cache/sources/`（git 管理外、再生成時の高速化）
- `docs/phase13/generation-log.md`（生成履歴・プロンプト版数）

---

## 7. 既存データの移行戦略

### 7.1 グリーンフィールド方式

- 既存 `mushrooms.json` を `mushrooms.v1.backup.json` へ退避（復元用）
- 新 `mushrooms.json` は v2 スキーマで一から構築
- **ID 体系は完全に新規**（UUID ベース）

### 7.2 ユーザーデータの救済

ユーザーの IndexedDB 内の以下は既存 v1 ID で紐付いている：

- `records`（採取記録）
- `bookmarks`（栞）
- `plans`（採取計画）内の target species 参照

**移行スクリプト** `scripts/phase13/migrate_user_records.ts` を同梱：

1. アプリ起動時にスキーマ版を検知（IndexedDB の `schema_version`）
2. v1 → v2 移行が必要なら自動で学名ベースマッチング実行
3. マッチしたもの: 新 ID に張り替え
4. マッチしなかったもの: `orphan_records` テーブルに保持、ユーザーに通知（「旧データ中の N 件が新図鑑と紐付きませんでした」）
5. 移行完了後、`schema_version` を v2 に更新

### 7.3 Phase 12-F 資産の活用

Phase 12-F の判定結果 `scripts/temp/review-progress.json` を以下の用途で活用：

- `delete=4`: v2 の候補から**自動除外**（架空疑いなど）
- `concern=35`: v2 生成時の**優先キュー**（既知の問題種を早く置き換える）
- `replace_image=5`: 画像差し替えは v2 の iNat フェッチで自動解決
- `ok=8`: v2 再生成後、旧本文との**差分レビュー UI** で再確認（二重承認）

---

## 8. レビューツール拡張

既存 `scripts/review/` を拡張：

- **v1 モード**（既存）: 旧本文の手動レビュー
- **v2 モード**（追加）: 生成記事の差分レビュー
  - 左: v1 本文 / 右: v2 生成記事
  - セクション単位で approve / needs_regeneration / edit
  - ソース出典リンクをクリックで開く
  - v1 で `ok` 判定された種は「差分が微細なら自動 approve」のオプション

---

## 9. リスクと対策

| リスク | 対策 |
|---|---|
| AI が出典にない情報を書く（ハルシネーション再発） | §4.3 の厳格プロンプト + §4.4 機械検証 + 人間レビュー |
| CC BY-SA 伝播で配布形態が制約される | §2.3 のセクション単位ライセンス管理 |
| 大菌輪・Wikipedia のレート制限 / 取得失敗 | ローカルキャッシュ `.cache/sources/` + exponential backoff |
| Trait Circus の自動抽出誤りが図鑑に混入 | 構造化フィールドは `needs_review` フラグ付き、レビュー UI で確認 |
| 移行で失われるユーザーデータ | `mushrooms.v1.backup.json` + `orphan_records` テーブル + ユーザー通知 UI |
| v2 初回リリースでカバレッジが下がる | `legacy_only` 種を維持することで既存記録は参照可能 |
| 石川県図鑑のライセンスが NG だった場合 | Tier 1 ソースのみで継続、影響は軽微 |

---

## 10. 成功基準

- v2.0 リリース時点で 50〜100 種が `approved` 状態で公開されている
- 全 approved 種の本文に出典 URL が付与されている
- 機械検証で学名・数値・食毒分類の不整合がゼロ
- 既存ユーザーの採取記録・栞が移行スクリプトで 95% 以上マッチする
- レビューツールで v1/v2 差分が確認できる

---

## 11. 実装計画への引き渡し

次ステップで `writing-plans` skill を呼び、本設計を Phase 分割した実装計画に落とす。想定 Phase：

- **Phase 13-A**: データソース収集基盤（スクレイパー + Parquet 読込 + キャッシュ）
- **Phase 13-B**: 種選定 + スコアリング（Tier 0 手動 + 自動スコア実装）
- **Phase 13-C**: AI 合成パイプライン（プロンプト + JSON Schema + 機械検証）
- **Phase 13-D**: レビューツール拡張（v2 モード + 差分 UI）
- **Phase 13-E**: 移行スクリプト + ユーザー通知 UI
- **Phase 13-F**: v2.0 リリース（Tier 0 + 有名種 50〜100 種）
- **Phase 13-G 以降**: 段階拡充（v2.1 = 300〜400 種, v2.2 以降 = 1000〜1500 種）

---
