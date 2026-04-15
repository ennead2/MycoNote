# Phase 13-E 設計書：自動判定強化 + tier0 全再生成 + ラインナップ調整

**作成日**: 2026-04-16
**前フェーズ**: Phase 13-D（レビュー UI 構築・62 種手動レビュー完了）
**状態**: 設計承認済（ユーザー承認: 2026-04-16）

---

## 背景

Phase 13-D のレビューで tier0 62 種のうち **concern 13 件 / reject 1 件**が発生。根本原因を分析した結果、自動判定の穴が 5 系統に整理できた：

| # | 根本原因 | 代表種 |
|---|---|---|
| 1 | **Wikipedia redirect** で別種に吸われる（`redirects: '1'`） | Psilocybe_subcaerulipes → ヒカゲシビレタケ |
| 2 | **ja/en 両方あるのに en が採用される**（prompt に優先順位指示なし） | Pleurotus / Lyophyllum / Infundibulicybe |
| 3 | **tier0_targets の学名/和名が stale/誤り** | Pholiota_nameko→microspora, Omphalotus_guepiniiformis→japonicus, Laccaria_amethystina 和名 |
| 4 | **カタカナ/ラテン文字混入を検出しない** | Omphalotus_guepiniiformis |
| 5 | **「ja があるのに記事が ja を引用していない」を validator が検出しない** | Infundibulicybe 等 |

ユーザーの目視確認にも限界があるため、**既承認 48 件も含めた全再検査**を行う必要がある。

加えて以下のラインナップ調整もこのフェーズで吸収する：

- **Boletus_edulis → Boletus_reticulatus（ヤマドリタケモドキ）**: 日本でメジャーなのはこちら
- **Russula_nobilis → Russula_emetica（ドクベニタケ）**: ドクベニダマシはマイナー
- **Lactarius_hatsudake の意味再定義**: 現 tier0 は大菌輪準拠で「アカハツ」扱いだが、一般的な用法に合わせ Lactarius hatsudake = ハツタケ とする
- **Lactarius_akahatsu（アカハツ）を新規追加**: ja wiki ソースはハツタケ記事内の「類似種：アカハツ」セクション

---

## 全体構成（4 Step）

```
Step 1: 検証・fetcher・prompt の強化（コード変更のみ、再生成なし）
  1-1. validate_article.mjs に新ルール追加（V9〜V14）
  1-2. wikipedia.mjs の redirect 挙動修正（redirect: 1 を外す）
  1-3. fetch_tier0_sources.mjs に canonical name 解決ステップ追加
  1-4. prompt_templates.mjs に ja 優先ルール追記
  1-5. 全テスト追加・通過確認

Step 2: tier0_targets.json の canonical 化
  2-1. 現在の 62 種を daikinrin の canonical 学名で resolve
  2-2. canonical-diff.json レポートをユーザー確認
  2-3. tier0_targets.json を手動修正（自動書き換えはしない）

Step 3: tier0 62 種 全再生成（新 validator/fetcher/prompt で）
  3-1. combined JSON と wikipedia-ja キャッシュを全破棄
  3-2. combined を再 fetch（concurrency=5）
  3-3. 記事を全再生成（LLM）
  3-4. validator を全件に走らせ errors/warnings をレポート
  3-5. review UI progress.json を破棄 → 全件再レビュー

Step 4: ラインナップ調整（62 種 → 63 種）
  4-1. Boletus_edulis → Boletus_reticulatus に差し替え
  4-2. Russula_nobilis → Russula_emetica に差し替え
  4-3. 現 Lactarius_hatsudake の意味を「ハツタケ」に再定義（既存 slug の内容を置き換え）
  4-4. Lactarius_akahatsu を新規追加（ja_wiki_source_override 使用）
  4-5. 差し替え/追加 4 件を同じパイプラインで生成
```

**実行時間の目安**:
- Step 1: 2-3h（コード + テスト）
- Step 2: 30m（自動 resolve + 手動確認）
- Step 3: 2-3h（LLM 生成 62 件、並列 concurrency=5 で実走 30-60min）
- Step 4: 1h（4 件の新規/差し替え生成）

**reject になった Tricholoma_ustaloides** は Step 3 の結果を見て判断（再生成で直るか、削除が妥当か）。

---

## 設計詳細

### Section A: 検証ルール強化（`scripts/phase13/validate_article.mjs`）

既存 V1〜V8 に加え、以下を追加する。

#### V9: カタカナ純度チェック（error）
- `names.primary` と `names.aliases[]` にラテン文字・数字・ひらがな以外の文字種が混入していないか検証
- **許容**: カタカナ、ひらがな、括弧書きの学名補足（`シメジ (Lyophyllum)` 等）、長音符、中点、記号少量
- **不許容**: `guepiniiformis` 等のラテン文字そのものや `Psilocybe subcaerulipes` のような学名全体が和名欄にある状態
- Omphalotus_guepiniiformis の「katakana になっていない」を検出する想定

#### V10: wikipediaJa があるのに引用していない（warning）
- `combined.sources.wikipediaJa` が存在するのに、`article.sources[]` の name/url が `wikipedia.*ja` にマッチしない場合
- → 再生成 or 手動修正の候補として警告
- Infundibulicybe / Lyophyllum / Pleurotus 型の見逃し防止

#### V11: 学名の canonical 一致（warning）
- `combined.sources.daikinrin.url` から抽出した学名と、tier0_targets の scientificName が異なる場合に警告
- URL パターン例: `Pages/Pholiota_microspora_235533.html` → canonical = `Pholiota microspora`
- Pholiota_nameko vs microspora, Omphalotus_guepiniiformis vs japonicus 型を検出

#### V12: Wikipedia redirect 被害検出（error）
- `combined.sources.wikipediaJa.requestedTitle` と `combined.sources.wikipediaJa.title` が不一致の場合
- Psilocybe_subcaerulipes → ヒカゲシビレタケ型を検出
- ※fetch 時に両方を保存する wikipedia.mjs 改修（Section B）と連動

#### V13: season 2 期型の妥当性（warning）
- `season` が `[{start:3, end:11}]` のように 1 期で年の大半をカバーする場合に警告
- 2 期型（春秋）が 1 期に潰れているケースをモニタリング

#### V14: similar_species の学名不整合（warning、オプション）
- `similar_species[].ja` が tier0 の既知和名リストに含まれる場合、参照整合性をチェック
- 優先度低。Step 1 で余裕があれば追加

**テスト**: 各ルール毎に正例/反例 2 ケース以上を `validate_article.test.mjs` に追加（計 12+ ケース）。

---

### Section B: Fetcher 改修（`scripts/phase13/wikipedia.mjs`）

#### B-1: redirect 挙動変更
- `buildApiUrl()` から `redirects: '1'` を外す
- fetch レスポンスに `requestedTitle` を付与して保存：
  ```json
  {
    "requestedTitle": "アイゾメシバフタケ",
    "title": "アイゾメシバフタケ",  // redirect されなければ一致
    "extract": "...",
    "url": "...",
    "pageid": 12345,
    "lang": "ja",
    "fetchedAt": "2026-04-16T..."
  }
  ```
- 記事が missing または extract が空なら素直に `null` を返す
- **副作用**: 旧名→現名の redirect を追わなくなる。間違った記事を掴むより null の方がマシ。必要なら tier0_targets で明示的に正しい title を指定する

#### B-2: テスト
- redirect なしモードで requestedTitle/title 両方が保存されることを verify
- missing 時に null 返却
- redirect されていた場合（将来的に手動 fetch した fixture で再現）requestedTitle ≠ title になることを verify

---

### Section C: tier0_targets 拡張と canonical 解決

#### C-1: `ja_wiki_source_override` フィールド追加（tier0_targets.json）

ハツタケ/アカハツの特殊ケースへの対応：

```json
{
  "slug": "Lactarius_akahatsu",
  "scientificName": "Lactarius akahatsu",
  "japaneseName": "アカハツ",
  "safety": "edible",
  "ja_wiki_source_override": {
    "title": "ハツタケ",
    "extract_hint": "記事内の『類似種』または『近縁種』セクションのアカハツに関する記述のみ使用"
  }
}
```

- `ja_wiki_source_override.title` が指定された場合、そのタイトルの ja wiki を fetch して `wikipediaJa` に格納
- `extract_hint` は combined JSON 経由で prompt にも渡し、LLM に「この記事のうちアカハツ部分のみ使え」と指示
- 他の種では無視される（後方互換）

#### C-2: canonical 解決スクリプト

`fetch_tier0_sources.mjs --resolve-canonical` モードを追加：

- 全 tier0 target について daikinrin を fetch
- daikinrin URL から canonical scientific name を抽出（正規表現 `/Pages/([A-Z][a-z]+_[a-z]+)_\d+\.html`）
- target の scientificName と不一致があれば `.cache/phase13/canonical-diff.json` にレポート：
  ```json
  [
    { "slug": "Pholiota_nameko", "target": "Pholiota nameko", "canonical": "Pholiota microspora", "daikinrin_japaneseName": "ナメコ" },
    { "slug": "Omphalotus_guepiniiformis", "target": "Omphalotus guepiniiformis", "canonical": "Omphalotus japonicus", "daikinrin_japaneseName": "ツキヨタケ" },
    ...
  ]
  ```
- **自動書き換えはしない**（安全側に倒す）。ユーザーが diff を見て手動判断 → `tier0_targets.json` を編集 → 再 fetch

---

### Section D: Prompt 改修（`scripts/phase13/prompt_templates.mjs`）

以下のブロックを新規 `SOURCE_PRIORITY_BLOCK` として追加し、`buildArticlePrompt` に組み込む：

```
# ソース採用優先順位
1. wikipediaJa があれば主情報源として最優先。和名・別名・形態・発生生態・食文化すべて ja を基準にする
2. daikinrin は学名・分類・分布の canonical source として併用（license: CC BY 4.0）
3. wikipediaEn は ja に情報がない項目（海外分布、近年の分類変更等）の補助のみ。ja と矛盾する場合は ja を採用
4. mhlw は食毒・中毒情報の一次情報源として最優先（他ソースと矛盾した場合 mhlw 採用）
5. ja_wiki_source_override.extract_hint が指定されている場合、その指示に従って該当部分のみ使用
```

`sources` 配列への記載は：
- wikipediaJa を使った場合は必ず `{ "name": "Wikipedia ja「<title>」", "url": "...", "license": "CC BY-SA 4.0" }` を含める
- en のみ使用した場合はその旨を notes に明記

---

### Section E: Step 3 運用設計（全再生成）

#### E-1: キャッシュ破棄方針

| キャッシュ | 破棄 | 理由 |
|---|---|---|
| `.cache/phase13/combined/*.json` | 全破棄 | fetcher の挙動が変わった（redirect 無効化）ので再 fetch 必須 |
| `.cache/phase13/wikipedia-ja/*.json` | 全破棄 | redirect 有り状態で fetch したキャッシュは汚染されている可能性 |
| `.cache/phase13/wikipedia-en/*.json` | 保持 | en は redirect 問題無関係 |
| `.cache/phase13/daikinrin/*.json` | 保持 | Phase 13-A Hotfix 後の新データ |
| `.cache/phase13/mhlw/*.json` 等 | 保持 | 変更なし |
| `generated/articles/*.json` | 全破棄 | 全再生成するため |
| `generated/articles/approved/*.json` | 全破棄 | 再レビュー前提 |
| `scripts/temp/review-v2-progress.json` | 全破棄 | 再レビューのため |

破棄はスクリプト化（`scripts/phase13/reset_phase13e.mjs`）して再現可能に。

#### E-2: 実行順序

1. git で破棄前スナップショット commit（"Phase 13-E: pre-reset snapshot"）
2. `reset_phase13e.mjs` 実行（上記キャッシュを削除）
3. `fetch_tier0_sources.mjs --resolve-canonical` 実行 → canonical-diff.json レポート確認
4. ユーザーが `tier0_targets.json` を手動修正
5. `fetch_tier0_sources.mjs` 本走（concurrency=5、62 種分）
6. validator を combined に軽く走らせ V11/V12 の warning を確認
7. `generate_articles.mjs --prepare` → manifest 作成
8. `generate_articles.mjs` 本走（LLM 生成 62 種）
9. 全記事に validator 実行 → レポート出力
10. review UI 起動 → ユーザー再レビュー

#### E-3: エラーハンドリング・中断耐性

- 各 step は idempotent（再実行安全）
- LLM 生成は 1 種ずつ atomic write。途中失敗しても再開可能
- `scripts/phase13/phase13e_progress.json` で step の進捗を tracking

#### E-4: レビュー UI

- validator warning の表示領域は Phase 13-D で実装済。追加機能なし
- 新 rule の warning message は UI 表示前提で日本語で分かりやすく書く

#### E-5: コスト試算

- LLM 再生成 65 種前後（62 + 差し替え 2 + 再定義 1 + 追加 1 − Tricholoma_ustaloides 削除可能性）
- 1 種あたり combined+prompt ~30k token、出力 ~2k token
- Sonnet 使用想定で総額 **$20〜35 程度**

---

### Section F: Step 4 ラインナップ調整

#### F-1: 差し替え・追加・再定義の内訳

| 操作 | slug | 学名 | 和名 | ja wiki ソース |
|---|---|---|---|---|
| 差し替え | `Boletus_edulis` → `Boletus_reticulatus` | Boletus reticulatus | ヤマドリタケモドキ | ja wiki 標準 |
| 差し替え | `Russula_nobilis` → `Russula_emetica` | Russula emetica | ドクベニタケ | ja wiki 標準 |
| 再定義 | `Lactarius_hatsudake` | Lactarius hatsudake | ハツタケ | ja wiki「ハツタケ」 |
| 追加 | `Lactarius_akahatsu` | Lactarius akahatsu | アカハツ | ja wiki「ハツタケ」の類似種セクション（override） |

#### F-2: 実行フロー

Step 3 完了後、tier0_targets.json を F-1 の内容で更新 → `fetch_tier0_sources.mjs` → `generate_articles.mjs` を差し替え/追加分だけ走らせる。既存の validator/prompt/fetcher はそのまま適用。

---

## テスト戦略

### ユニットテスト

| ファイル | 追加テストケース |
|---|---|
| `validate_article.test.mjs` | V9〜V14 各ルール正例/反例 2 ケース以上 |
| `wikipedia.test.mjs` | redirect なしモードで requestedTitle/title 両方が保存される／missing で null |
| `fetch_sources.test.mjs` / `fetch_tier0_sources.test.mjs` | `ja_wiki_source_override` 指定時の ja fetch パス |
| `prompt_templates.test.mjs` | 新 SOURCE_PRIORITY_BLOCK が含まれる／override extract_hint が prompt に入る |

既存 233 テスト全通過が前提。

### 統合テスト（手動 + E2E）

- **Step 2 canonical-diff**: 既知の不整合 4 件（Omphalotus / Pholiota / Laccaria / その他）が diff に現れるか目視確認
- **Step 3 代表 3 種のドライラン**:
  - Psilocybe_subcaerulipes: V12 が出ないこと（redirect 被害ゼロ）
  - Pleurotus_ostreatus: ja が主情報源として採用されること（V10 クリア）
  - Omphalotus_japonicus（旧 guepiniiformis）: V9 が出ず、学名が canonical に修正されていること

### 完了基準（Definition of Done）

1. Step 1 のコード変更がすべて commit され、全テスト通過
2. Step 2 の canonical-diff レポートがユーザー確認済・tier0_targets 修正済
3. Step 3 の再生成が完走（エラー種はゼロ or 把握済）
4. Step 3 で生成された 62 種の validator errors がゼロ、warnings は全件把握済
5. Step 4 の差し替え/追加 4 件も同基準を満たす
6. ユーザー再レビューで approve/concern/reject 判定が完了
7. `docs/progress.md` と memory 更新、main へ merge

**手動レビュー結果の許容値**: concern/reject 合計が **前回の 14/62 より確実に減る**こと。目安として合計 5 件以下を目標値とする（厳守ではなくモニタリング指標）。

### ロールバック計画

- Step 3 開始前に git snapshot commit（"phase13e-pre-regen"）
- 再生成結果が壊滅的に悪い（approve 率 50% 未満等）場合、snapshot に戻す
- fetcher/validator のコード変更（Step 1）は残す（独立に価値がある）

---

## 付録：承認経緯

| 設計セクション | ユーザー承認日時 |
|---|---|
| スコープ選択（C: validator + fetcher + prompt） | 2026-04-16 |
| 既承認 48 件の扱い（C: 全再 fetch + 再生成） | 2026-04-16 |
| ラインナップ調整（C: Phase 13-E に包含、step 分離） | 2026-04-16 |
| ハツタケ/アカハツの扱い（2 種独立生成、override 使用） | 2026-04-16 |
| Section 2（検証ルール V9〜V14） | 2026-04-16 |
| Section 3（redirect: 1 を外す方針） | 2026-04-16 |
| Section 4（全再生成運用、コスト $20〜35） | 2026-04-16 |
| Section 5（テスト戦略・完了基準） | 2026-04-16 |
