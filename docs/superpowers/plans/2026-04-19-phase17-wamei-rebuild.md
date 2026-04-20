# Phase 17: 和名-学名-シノニム 新マスタ再構築 実装計画

作成日: 2026-04-19
worktree: `sweet-euclid-b5eb8e`
branch: `claude/sweet-euclid-b5eb8e`

## 1. 背景

Phase 16 S3 で `data/species-ranking.json` / `data/tier2-A-species.json` の構築時に、以下の構造的バグが発覚した:

1. **gbif-normalize.mjs の HIGHERRANK collapse**: 種レベルで見つからない学名が属/綱名に統合され、複数の独立種が 1 エントリに merge
2. **candidate-pool.mjs の primary 和名逆転**: 菌類集覧 XLSX の五十音順先頭がそのまま primary 和名になり、大菌輪正典と食い違う (例: Pleurotus cystidiosus の primary が「オオヒラタケ」ではなく「アワビタケ」)
3. **wikipedia-exists.mjs のキャッシュ汚染**: 429/5xx 時に false を永続キャッシュ

前 worktree (`hopeful-brattain-19fc23`) で 1 と 3 は修正済、2 は未修正。

本 Phase では既存の pipeline を流用せず、**大菌輪を正典として和名-学名-シノニム を再構築**し、既存記事を流用/再合成しながら新しい master JSON を作成する。**旧 `src/data/mushrooms.json` と `generated/articles/` は不可侵**、新パスに全データを生成する。

## 2. 確定方針（議論結果のサマリ）

### 議題 1: 和名一覧の取得源
- source: 大菌輪 `pages.json` の `japanese_name` 付きエントリ
- **母集団: 4204 件**（全 43010 中、和名フィールドあり、unique 保証済）
- 方式: **案 A（大菌輪絶対正典）**。菌類集覧・独立学名検証は使わない。
- 和名なしの学名は無視。

### 議題 2: 和名→学名
- 大菌輪個別 HTML の `h1.scientific-name` をそのまま採用
- authorship をパース分離 (`scientificName` + `authorship`)
- GBIF accepted との食い違いは記録のみ、動作には影響させない

### 議題 3: シノニム
- 大菌輪 `span.synonym-item` から取得、authorship 無し文字列の配列
- GBIF/MycoBank による補完なし (A 方式の純粋性維持)
- 観察数クエリで synonyms を fallback として使用

### 議題 4: 追加記事ソースと新 tier 定義
**採用する記事 source**:
- 大菌輪本文 (primary)
- Wikipedia JA (記事ありのみ)
- Wikipedia EN (記事ありのみ)
- 厚労省 mhlw (毒菌のみ)

**不採用**:
- 林野庁 (個別説明なし)
- iNat description (Wikipedia EN の wrapper)
- MycoBank description (SPA / 記事体裁なし)
- GBIF descriptions (標本メタデータ断片)

**新 tier 定義** (旧 tier 60/53/270 は全面置換):

| tier | 条件 | 意味 |
|---|---|---|
| tier0 | Wikipedia JA あり | 高品質記事合成可能 |
| tier1 | Wikipedia JA なし / EN あり | 中品質 |
| tier2 | 両方なし | 低品質（大菌輪のみ）|

### 議題 5: 既存記事の流用判定
主体は**新 master JSON**。既存記事は流用 resource。対応 key は**和名**（内部実装は学名 1:1 経由）。

| 既存源 | 流用条件 | 対象件数 |
|---|---|---|
| 旧 approved (`src/data/mushrooms.json`) | 和名一致 | 113 |
| 旧 phase16 (`generated/articles/*.json`) | 学名一致 + tier2-diff カテゴリ B/D | ~191 |
| 旧 phase16 カテゴリ A/C/E | **除外** | ~13 |

学名不一致時は new master JSON の scientificName を大菌輪正典に書き換え、**既存 article 本文中の旧学名は放置**。

### 議題 6: ランキング
- **ランキングファイル不要** (tier 分類で代替)
- 図鑑表示は **記事生成済み種のみ**
- 未生成種は図鑑から消える、合成進捗で順次拡張

### 議題 a: 構造化項目の埋め方

**ルールベース抽出** (大菌輪 HTML / Trait Circus):
- taxonomy (既存)
- synonyms (既存)
- observations (GBIF: 大菌輪 HTML / iNat: 新規 API)
- habitat (`h3 生息環境`)
- season (`h3 フェノロジー` から月範囲抽出)
- features raw (`h3 子実体/傘/肉/襞/柄/つば/つぼ/胞子/etc.`)
- similar_species 候補 (`h2 比較対象としてのみ掲載`)
- traits (Trait Circus Parquet join)

**AI 合成** (大菌輪 + Wikipedia JA/EN + mhlw 入力):
- description / features / regions / tree_association
- cooking_preservation / poisoning_first_aid / caution

**safety 特別扱い**:
- 厚労省リスト該当 → deadly/toxic 自動確定
- Wikipedia JA infobox 優先採用
- 情報不足なら unknown、AI 判定は補助
- validator: safety=edible かつ 厚労省 hit → error

### 観察数取得
- GBIF 国内 (大菌輪 HTML の `.count-badge.jp`) + iNat 国内 (place_id=6803, all grades) を**合算**
- master JSON には `gbif.domestic` と `inat.domestic` を個別保持、合算は view 層

## 3. 新 master JSON スキーマ

保存先: `data/phase17/mushrooms-master.json`

```typescript
interface MushroomMaster {
  id: string;                          // 既存互換 slug (学名 lowercase snake_case)
  tier: 0 | 1 | 2;                     // 新 tier 定義
  names: {
    ja: string;                        // 大菌輪 primary 和名
    scientific: string;                // 大菌輪正典学名 (authorship 除去済)
    scientific_raw: string;            // 大菌輪 h1 生テキスト
    authorship: string | null;         // パース分離
    aliases: string[];                 // 現状空 (大菌輪 A 方式、菌類集覧不使用)
    scientific_synonyms: string[];     // 大菌輪 span.synonym-item
  };
  myco_bank_id: number;                // 大菌輪由来
  taxonomy: {                          // 既存構造互換
    phylum: { latin: string, jp: string };
    subphylum?: ...;
    class?: ...;
    subclass?: ...;
    order?: ...;
    family?: ...;
    genus?: ...;
  };
  observations: {
    gbif: { domestic: number };
    inat: { domestic: number };
  };
  source_availability: {
    daikinrin: true;                   // 4204 全件 true
    wikipedia_ja: boolean;
    wikipedia_en: boolean;
    mhlw: boolean;
  };
  gbif_accepted_name: string | null;   // 記録のみ (大菌輪と食い違い検出用)

  // 以下 AI 合成 + ルール抽出の混成
  safety: 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly' | 'unknown';
  season: { start_month: number, end_month: number }[];
  habitat: string[];
  regions: string[];
  tree_association: string[];
  description: string;                 // AI
  features: string;                    // AI (raw をもとに合成)
  features_raw?: Record<string, string>;  // debug 用、リリース時削除可
  cooking_preservation: string | null;
  poisoning_first_aid: string | null;
  caution: string | null;
  similar_species: { ja: string, note: string, id?: string }[];
  similar_suggestion?: { displayName: string, href: string }[];  // 大菌輪「比較対象」セクション由来
  sources: { name: string, url: string, license: string }[];
  image_local: string | null;
  images_remote: string[];
  images_remote_credits: { ... }[];
  traits?: Record<string, any>;        // Trait Circus
  notes: string[];

  article_origin: 'approved' | 'phase16' | 'new';  // 流用 or 新規合成
  article_synthesized_at: string;      // ISO date
}
```

## 4. ステップ分割

### S1: 大菌輪 parser 拡張（2〜3h）
`scripts/phase13/daikinrin.mjs` に以下を追加:
- `extractHabitat($)` — 生息環境セクション
- `extractSeason($)` — フェノロジー月範囲抽出 (`parseMonthRange` ヘルパ含む)
- `extractFeaturesRaw($)` — 形態セクション集約
- `extractSimilarSuggestion($)` — 比較対象セクション

`parseDaikinrinPage()` の戻り値に新フィールド追加。

テスト: `scripts/phase13/fixtures/` に代表 HTML を保存し、`daikinrin.test.mjs` に単体テスト追加。

### S2: authorship パーサ実装（1h）
`scripts/phase17/parse-scientific-name.mjs` 新規:
- 入力: `Lentinula edodes (Berk.) Pegler`
- 出力: `{ scientificName: "Lentinula edodes", authorship: "(Berk.) Pegler" }`
- 二名法 / 変種 / 亜種に対応

### S3: iNat 国内観察数 fetcher 新規（1〜2h）
`scripts/phase17/inat-observations.mjs` 新規:
- 既存 `inat-photos.mjs` をベース
- `place_id=6803`, 全 quality grades, 写真 filter なし
- `taxon_name` を accepted + synonyms[] で順に試行、結果を合算
- cache namespace: `inat-observations`

テスト: mock response で合算ロジック検証。

### S4: 大菌輪 cache invalidate + 4204 件全 fetch（~75 分）
- 既存 `.cache/phase13/daikinrin/*.json` (55 件) を削除（新 schema 非対応）
- `scripts/phase17/fetch_all_daikinrin.mjs` 新規
  - `pages.json` から和名付き 4204 エントリを読み込み
  - 1 req/sec で個別 HTML を fetch、新 schema で cache
  - 失敗ログを `data/phase17/fetch-failures.json` に記録
- run 後、取得率レポート (habitat/season/synonyms/similarSuggestion の hit rate)

### S5: Wikipedia JA/EN 存在チェック（~140 分）
- `scripts/phase13/wikipedia-exists.mjs` (修正済) を使用
- 4204 × 2 = 8408 call, 1 req/sec
- 結果を `data/phase17/wikipedia-availability.json` にキャッシュ
- tier 分類に直接使用

### S6: iNat 観察数 fetch（~140 分）
- S3 で実装したモジュールを 4204 件に対して実行
- cache: `inat-observations`
- 結果を master JSON 生成時に join

### S7: Trait Circus join（1h）
- 既存 `scripts/phase15/fetch_species_traits.py` を流用
- 4204 件分の学名で lookup
- 結果を master JSON 生成時に join

### S8: 既存記事 流用判定マップ作成（1〜2h）
`scripts/phase17/build-article-map.mjs` 新規:
- 入力:
  - 大菌輪 4204 件の (和名, 学名) ペア
  - `src/data/mushrooms.json` (旧 approved 113)
  - `hopeful-brattain-19fc23` worktree の `data/phase16/tier2-diff.json` (流用可否カテゴリ)
- 出力: `data/phase17/article-map.json`
  ```json
  [
    { "ja": "シイタケ", "scientific": "Lentinula edodes",
      "article_origin": "approved",
      "article_path": "src/data/mushrooms.json#lentinula_edodes" },
    { "ja": "タマゴタケモドキ", "scientific": "Amanita subjunquillea",
      "article_origin": "phase16",
      "article_path": ".../generated/articles/Amanita_subjunquillea.json" },
    { "ja": "アワビタケ", "scientific": "Postia floriformis",
      "article_origin": "new", "article_path": null },
    ...
  ]
  ```
- phase16 tier2-diff カテゴリ A/C/E は `article_origin: "new"` 扱い

### S9: safety 判定ルール実装（2h）
`scripts/phase17/resolve-safety.mjs` 新規:
- 入力: scientificName, ja, wikipediaJaHtml, mhlwHit
- 処理順:
  1. 厚労省リスト該当 → toxic/deadly 確定 (mhlw カテゴリで細分)
  2. Wikipedia JA infobox の「食毒」欄パース
  3. Wikipedia EN infobox の "Edibility"
  4. どれも取れない → unknown
- 出力: `{ safety: ..., confidence: 'rule' | 'infobox' | 'unknown', evidence: [...] }`
- validator: safety=edible かつ 厚労省 hit なら throw

### S10: 新 master JSON 初期生成（2〜3h）
`scripts/phase17/build-master.mjs` 新規:
- 全ソース (大菌輪 cache, Wikipedia availability, iNat obs, Trait Circus, article-map, safety) を統合
- 流用種は既存 article の description/features/similar_species 等を merge
- 新規合成待ち種は description 等を null でダミー埋め
- 出力: `data/phase17/mushrooms-master.v1.json`
- 統計レポート: tier0/1/2 件数、流用/新規の比率

### S11: tier0 バッチ AI 合成（時間は件数依存）
- tier0 (Wikipedia JA あり) のうち `article_origin: 'new'` の種を対象
- 既存 `generate_articles.mjs` を流用、プロンプト見直し
- 入力: 大菌輪本文 + Wikipedia JA + (EN あれば) + mhlw (該当時)
- 出力を master JSON に merge (`mushrooms-master.v2.json`)
- 合成後 validator (phase16 V6/V4/V10/V13 踏襲、ただし厳格化)

### S12: tier0 ユーザレビュー
- 流用種 + 新規合成種をまとめて提示
- `docs/phase17/review-tier0.md` にレビュー issue リスト
- user 承認 → master JSON 確定

### S13: tier1 / tier2 バッチ合成 + レビュー
- S11/S12 を tier1, tier2 に対して繰り返し
- 各 tier で user 承認を待ってから次へ

### S14: 画像取得 (記事生成済み種のみ)
- 既存 `scripts/phase13/fetch_v2_photos.mjs` を流用
- 対象: master JSON で description が null でない全種
- iNat 写真ルール (Japan 優先 + ユーザ分散 + research grade) 踏襲
- 出力: `public/images/mushrooms/` に webp 配備

### S15: 図鑑統合 (`src/data/mushrooms.json` 置換)
- user 承認後、新 master JSON を `src/data/mushrooms.json` にコピー
- e2e テスト (既存 phase14 踏襲、113 種 → 新件数に更新)
- 本番 deploy は別 PR

## 5. 検証とリスク

### 検証
- S1-S3 は単体テストで PASS 必須
- S4-S7 は取得率レポートで sanity check
- S8 の article-map は重複 / 漏れチェック (assert unique ja, all 4204 カバー)
- S10 の master JSON 生成は schema validation (zod or ajv)
- S12/S13 の user review が gating 基準

### リスク
- **大菌輪サーバ負荷**: 4204 req を 1 req/sec (70 分) で OK と user 合意済
- **AI 合成コスト**: tier0 新規は多くて数百件、tier2 は 2000+ 件になる可能性 → 後半で予算再確認
- **大菌輪 HTML 構造変化**: fetch 中に structure 変更があると壊れる → S4 実行前の fixture で回帰確認
- **safety 判定ミス**: 致命 → S9 の validator を厳格化、tier0 レビュー時に全件人間検証

## 6. 成果物

- `data/phase17/mushrooms-master.json` (最終形は `.v4.json` くらい)
- `data/phase17/article-map.json`
- `data/phase17/wikipedia-availability.json`
- `data/phase17/fetch-failures.json` (あれば)
- `scripts/phase13/daikinrin.mjs` 拡張
- `scripts/phase17/*.mjs` 新規一式
- `scripts/phase13/daikinrin.test.mjs` 拡張
- `src/data/mushrooms.json` 置換 (S15 完了時)

## 7. 旧データ保持ポリシー

- `src/data/mushrooms.json`: **S15 までは不可侵**、S15 でバックアップ (`.v2.json.backup`) を残して置換
- `generated/articles/`: **触らない**
- `data/tier0-species.json` / `tier1-species.json` / `tier2-A-species.json`: **不可侵**（読み取りのみ）
- `data/species-ranking.json`: 不可侵（読み取りも最小限、S8 で article-map 生成の参照にのみ使用）

## 8. 並行作業と PR 分割案

| PR | 内容 | 依存 |
|---|---|---|
| PR-17-1 | S1-S3 (parser 拡張 + iNat fetcher) | - |
| PR-17-2 | S4 (4204 全 fetch) + 統計レポート | PR-17-1 |
| PR-17-3 | S5-S7 (Wikipedia/iNat/Trait join) | PR-17-2 |
| PR-17-4 | S8-S10 (article-map + master v1) | PR-17-3 |
| PR-17-5 | S11-S12 (tier0 合成 + レビュー) | PR-17-4 |
| PR-17-6 | S13 tier1 合成 + レビュー | PR-17-5 |
| PR-17-7 | S13 tier2 合成 + レビュー | PR-17-6 |
| PR-17-8 | S14 画像 + S15 統合 | PR-17-7 |

## 9. user フィードバック反映 (遵守事項)

- **大目標から逆算**: 最上位目標「図鑑を拡張し、新しい種を追加する」。4204 種カバレッジ達成が成功指標
- **提示/整理/確認はレビュー要求**: Auto mode でも自動実行しない区切りで user 承認
- **既存データ不可侵**: 旧 JSON/article は触らない、新パスに全生成
- **和名正典は大菌輪**: 菌類集覧は一切使わない (Phase 16 の教訓)

## 10. 次アクション

1. この計画書を user レビュー
2. 承認後、S1 (大菌輪 parser 拡張) から着手
