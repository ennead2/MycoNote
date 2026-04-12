# Phase 12: 図鑑ハルシネーション対策（自動シノニム解決）

作成日: 2026-04-12
対象: `scripts/**`, `src/data/mushrooms.json`, `src/lib/mushroom-utils.ts`, `src/components/zukan/MushroomDetail.tsx`, `docs/verification-issues.md`

## 背景

Phase 8e で 300 種の 3 ソース検証を行った結果、56 件の verification-issue が `open` 状態のまま残っている。内訳を精査すると:

- **学名不一致 約 40 件**: iNaturalist と図鑑 DB の学名が違うが、その多くは**分類学的シノニム**（例: `Lactarius volemus` → `Lactifluus volemus`、`Lepista nuda` → `Collybia nuda`、`Tremella foliacea` → `Phaeotremella foliacea`）。これらは旧名/新名の関係で、架空種ではない。
- **架空種疑い 約 16 件**: iNat に存在しないとされているが、古い学名で検索しただけで、新学名（accepted name）に変換すれば存在する場合が多い。

現状の workflow（iNat + Wikipedia + kinoco-zukan）はシノニム解決能力が弱いため、自動クローズできず全件人間レビュー待ちになっている。

## 目標

1. **GBIF Species API をシノニム解決層として追加**し、56 件のうち **45〜50 件を自動クローズ**
2. 旧学名も検索対象に含める（ユーザーが古い学名で検索してもヒット）、UI で旧名を併記表示
3. 将来の種追加時も同じパイプラインで一発検証できる体制を作る
4. 日本産菌類集覧（CC BY 4.0）を和名辞書として取り込み、オフラインでも和名↔学名の裏取りができるように

## 分類体系の正典（新規決定）

**GBIF Backbone Taxonomy を「正」とする**。理由:
- 国際的に最も広く参照されている taxonomic backbone
- シノニム解決 API が実装で最も扱いやすい（`species/match` 1 発で accepted 名が返る）
- Catalogue of Life / MycoBank / Index Fungorum のデータも統合されている

ただし、日本語和名については 日本産菌類集覧（日本菌学会）を優先する（国内専門家による査読済み）。

`docs/SPEC.md` にこの方針を明記する。

## 決定事項（ユーザー確認済み）

| 項目 | 決定 |
|---|---|
| 方針 | B案（GBIF + 菌類集覧 + 全300種再検証 + 旧名 alias UI） |
| 分類体系 | GBIF Backbone を正、和名は 日本産菌類集覧 優先 |
| 自動適用閾値 | `matchType === "EXACT"` かつ `confidence >= 90` |
| 旧名の扱い | 削除せず `synonyms[]` に保持、search でヒット、UI で muted 併記 |
| コミット粒度 | 各 Step で小刻み |

## アーキテクチャ

```
┌──────────────────────────────────────────────┐
│ 入力: mushrooms.json 300 種 (和名 + 学名)    │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ Stage 0: GBIF match │  ← 新設
        │ - SYNONYM なら      │
        │   accepted 名取得   │
        │ - synonyms[] 列挙   │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Stage 1: iNat Taxa  │  ← 既存（accepted 名で再問合せ）
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Stage 2: Wikipedia  │  ← 既存
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Stage 3: kinoco-zkn │  ← 既存
        │   + 菌類集覧 JSON   │  ← 新設（和名裏取り）
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────┐
        │ 出力:                   │
        │  - species-corrections  │  旧→新学名マップ
        │  - verification-issues  │  真に要レビュー分のみ
        └─────────────────────────┘
```

## Steps

### 12-A: GBIF resolver 単体スクリプト

**File**: `scripts/gbif-resolve.mjs`（新設）

- 入力: `mushrooms.json` の `names.scientific` を全 300 種から抽出
- 各種について `GET https://api.gbif.org/v1/species/match?name={sci}` を叩く
  - `status === "SYNONYM"` → `acceptedUsageKey` から `/species/{key}` で accepted 名取得
  - `status === "ACCEPTED"` → そのまま
  - `status === "NONE"` / `matchType === "HIGHERRANK"` → 要人間確認としてマーク
- accepted 名が決まったら `/species/{usageKey}/synonyms` も取得（旧名列挙）
- 出力: `scripts/temp/gbif-results.json`
  ```json
  {
    "koutake": {
      "input": "Sarcodon aspratus",
      "status": "SYNONYM",
      "accepted": "Sarcodon imbricatus",
      "confidence": 98,
      "matchType": "EXACT",
      "synonyms": ["Sarcodon aspratus", "Hydnum imbricatum"],
      "usageKey": 2551150
    }
  }
  ```
- レート: 並列度 5、User-Agent 明示、Retry-After 対応
- 実行: `node scripts/gbif-resolve.mjs` / `--only=koutake,chichitake` / `--dry-run`

### 12-B: 日本産菌類集覧を JSON 化

**File**: `scripts/import-jp-mycology-checklist.mjs`（新設） → `data/jp-mycology-checklist.json`

- https://www.mycology-jp.org/html/checklist_wlist.html から Excel 取得
- `xlsx` パッケージ（devDependency）で読込 → `[{ ja, scientific, genus, family, note }]`
- `docs/credits.md`（新設）に CC BY 4.0 クレジット記載
- ~300KB 想定、静的 import OK

### 12-C: 既存 gather-species-data.mjs に Stage 0 差し込み

**File**: `scripts/gather-species-data.mjs`

- 種を処理する前に `scripts/temp/gbif-results.json` を読込
- 該当種が ACCEPTED / SYNONYM + confidence>=90 なら、accepted 名で iNat・Wikipedia を再問合せ
- Wikipedia 検索は「新学名 → 旧学名 → 和名」の順で fallback
- kinoco-zukan の直後に 菌類集覧 JSON 検索を追加（和名完全一致で学名を照合）
- verification-issues への記録ロジックを更新:
  - GBIF で auto-resolve された不一致は issue にしない代わりに `species-corrections.json` へ
  - NONE / HIGHERRANK / 信頼度低のみ issue として残す

### 12-D: 学名自動訂正 & synonyms[] 追加

**File**: `scripts/apply-corrections.mjs`（新設） + `src/data/mushrooms.json`

- `species-corrections.json` を読込
- 各該当種で:
  - `names.scientific` を accepted 名に更新
  - `names.scientific_synonyms: string[]` を新設（GBIF synonyms + 旧 DB 値を含む）
  - 既存 `similar[]` の参照も整合チェック
- 変更前後の diff を `docs/corrections-applied.md` に出力

### 12-E: 検索・表示の synonyms 対応

**Files**:
- `src/types/mushroom.ts` — `Mushroom.names` に `scientific_synonyms?: string[]` 追加
- `src/lib/mushroom-utils.ts` — `searchMushrooms()` の学名マッチを `synonyms` にも拡張
- `src/components/zukan/MushroomDetail.tsx` — 学名表示下に `旧名: {synonyms.join(', ')}` を `text-washi-dim text-xs italic` で併記

### 12-F: 残存 issue の手動レビュー

自動クローズ後に残る 6〜15 件を人間判断:
- 真の架空種 → `mushrooms.json` から削除 + `docs/removed-species.md` に記録
- タイポ → 学名訂正
- 新しすぎる種（GBIF 未登録）→ issue を `deferred` にして保留

### 12-G: テスト追加

**File**: `src/lib/__tests__/mushroom-utils.test.ts`

- `searchMushrooms('Clitocybe nuda')` で ムラサキシメジ（新学名 Lepista nuda を持つ種）がヒットする
- `searchMushrooms('Lactarius volemus')` で チチタケ（新学名 Lactifluus volemus）がヒット

**File**: `scripts/__tests__/gbif-resolve.test.mjs`（or mock fetch）

- SYNONYM / ACCEPTED / NONE のケース分岐確認

### 12-H: ドキュメント整備

- `docs/SPEC.md`: 「分類体系: GBIF Backbone を正、和名は 日本産菌類集覧 優先」を記載
- `docs/species-data-workflow.md`: Stage 0 (GBIF) 追記、workflow 図更新
- `docs/progress.md`: Phase 12 セクション追加、結果（auto-close 件数、残存件数）を記録
- `docs/credits.md`: GBIF / 日本産菌類集覧 / iNaturalist / Wikipedia のクレジット集約

## 検証

- [ ] `node scripts/gbif-resolve.mjs` が 300 種分のキャッシュを生成
- [ ] `node scripts/gather-species-data.mjs --reset` が完走、verification-issues.md が再生成
- [ ] auto-close 件数 >= 40（目標）
- [ ] npm test 全通過（+ 2 テスト追加）
- [ ] 本番ビルド成功
- [ ] 実機で「Clitocybe nuda」検索 → ムラサキシメジがヒット

## 作業順

12-A → 12-B → 12-C → 12-D → 12-E → 12-F → 12-G → 12-H

各 Step で小刻みにコミット。
