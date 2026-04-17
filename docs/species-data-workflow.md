# 図鑑データ作成・検証ワークフロー

> 全てのきのこデータの作成・拡充時にこの手順に従うこと。
> Phase 8d で確立。以降の図鑑拡充でも同じクオリティを維持するために使用する。

---

## 概要

図鑑に掲載する各きのこについて、以下の3ソースから情報を収集し、
クロスリファレンスで検証した上でデータを作成・更新する。

## 情報ソース

| # | ソース | 目的 | エンドポイント/URL |
|---|--------|------|--------------------|
| 0 | **GBIF Backbone Taxonomy** ★ Phase 12 | 学名シノニム解決・accepted name 確定・分類階層 | `api.gbif.org/v1/species/match`, `/species/{key}`, `/species/{key}/synonyms` |
| 1 | **日本産菌類集覧** ★ Phase 12 | 和名↔学名の国内正典（CC BY 4.0 静的 JSON） | `data/jp-mycology-checklist.json` (4429 種) |
| 2 | **iNaturalist Taxa API** | 学名存在確認の裏取り、観察数取得 | `api.inaturalist.org/v1/taxa?q={学名}&rank=species` |
| 3 | **Wikipedia ja/en** | 記事内容（description 補強）、分類情報 | `{lang}.wikipedia.org/w/api.php` (action=query) |
| 4 | **kinoco-zukan.net** | 和名・学名・特徴テキストの第4ソース | `kinoco-zukan.net/{romanized_name}.php` |

**正典**: 学名・分類階層は **GBIF Backbone**、和名は **日本産菌類集覧** を正とする（`docs/SPEC.md` 参照）。

## 収集フロー（1種あたり, Phase 12 改定）

```
Step 0: GBIF Species match  ← シノニム解決層
  入力: 学名 (names.scientific)
  取得: status (ACCEPTED/SYNONYM/NONE), accepted name, synonyms[], taxonomy
  判定: SYNONYM → accepted 名に置換、旧名を scientific_synonyms[] に保持
        ACCEPTED + EXACT + confidence>=90 → pass
        それ以外 (FUZZY/HIGHERRANK/NONE) → verification-issues に記録

Step 1: 日本産菌類集覧 JSON 照合  ← 和名正典
  入力: 和名 (names.ja) + Step 0 で決まった学名
  判定: 和名ヒット & 学名等価 (sciEquivalent) → 和名確定
        和名ミス & 学名ヒット → DB 和名が別名 or AI 命名の疑い → issue
        両方ミス → 2008年以降の新種 or ハルシネーション濃厚 → issue

Step 2: iNaturalist Taxa API  ← 観察数・Wikipedia URL の裏取り
  入力: Step 0 で確定した accepted 学名
  取得: taxon_id, 観察数, wikipedia_url
  判定: 結果0件 → Step 0 と矛盾 → 要レビュー

Step 3: Wikipedia ja
  入力: 和名 (names.ja)
  取得: 記事テキスト (extract), ページURL
  判定: 記事なし → 情報源不足フラグ

Step 4: kinoco-zukan.net
  入力: ID (romanized name)
  取得: 学名, 科名, 特徴テキスト
  判定: ページなし → スキップ (マイナー種では正常)

Step 5: 記事充実化
  - 収集した情報を元に description を拡充
  - 食用種: cooking_preservation フィールドに調理法・保存方法を記載
  - 毒種: poisoning_first_aid フィールドに中毒事例・応急処置を記載
  - features (形態的特徴) も情報があれば拡充
```

## レート制限

| ソース | 間隔 |
|--------|------|
| GBIF | 0.2秒 (5 req/sec) |
| iNaturalist | 1.5秒 |
| Wikipedia | 1.5秒 |
| kinoco-zukan.net | 3秒 |
| 1種の合計 | 約7-9秒 |

## 新スクリプト (Phase 12)

| スクリプト | 用途 |
|-----------|------|
| `scripts/gbif-resolve.mjs` | Stage 0: GBIF Backbone 全種シノニム解決、結果を `scripts/temp/gbif-results.json` にキャッシュ |
| `scripts/import-jp-mycology-checklist.mjs` | 日本菌学会 Excel → `data/jp-mycology-checklist.json` 変換（初回/更新時のみ） |
| `scripts/verify-species-v2.mjs` | GBIF + 菌類集覧で全種を分類し `docs/verification-issues.md` を再生成 |
| `scripts/apply-corrections.mjs` | autoApply 対象の学名を `mushrooms.json` に反映、旧名を `scientific_synonyms[]` に保持 |
| `scripts/lib/species-match.mjs` | 学名マッチング pure helpers (`sciEquivalent`, `filterSynonyms` など) |

## 進捗管理

- 進捗ファイル: `scripts/temp/verification-progress.json`
- 各種の処理状態を記録し、中断後も再開可能
- 状態: `pending` → `gathered` → `enriched` → `verified`

## 品質基準

### 必須チェック
- [ ] 学名がiNaturalistに存在すること
- [ ] 和名と学名の対応が正しいこと
- [ ] 学名が既存エントリと重複していないこと（重複 = ハルシネーションの疑い）
- [ ] 分類階層 (taxonomy) が設定されていること
- [ ] description が3文以上であること
- [ ] 食用種に cooking_preservation があること
- [ ] 毒種に poisoning_first_aid があること

### 不整合の扱い
- 学名の不整合 → iNaturalist を正とし修正
- 和名に対応する学名が異なる場合 → verification-issues.md に記録、ユーザー確認
- iNaturalist に存在しない種 → verification-issues.md に「架空種の疑い」として記録

## iNaturalist写真の取得

検証後の正しい学名で写真を再取得する。v2 以降は `scripts/phase13/fetch_v2_photos.mjs` を使用（旧 `scripts/fetch-photos-v2.mjs` は v1 時代の遺物）。

### 選別ルール（優先順位の高い順、tier0/tier1/tier2 共通）

1. **ユーザー分散最大** — 同一撮影者の写真が複数枚連続しないよう round-robin 選別
2. **Japan 観察を優先** — iNat `place_id=6737` で絞った観察を同順位内で先出し
3. **ユーザー内順序** — 各ユーザーの写真は JP → global の順に並べる
4. **ライセンス** — `cc0` / `cc-by*` のみ採用、`all-rights-reserved` は除外
5. **ヒーロー流用時の補正** — Wikipedia ヒーロー画像が取得できない種は iNat を `+1` 枚取得（ギャラリー 3x3 を維持）
6. **学名 synonyms フォールバック** — accepted name で 0 ヒット時に旧学名で再検索

### 出力フィールド（`src/data/mushrooms.json`）

- `image_local`: Wikipedia ヒーローのローカル path（取得失敗時は null、iNat[0] を hero 流用）
- `images_remote[]`: iNat 写真 URL（原寸）。既定 9 枚、hero 流用時 10 枚
- `images_remote_credits[]`: 撮影者クレジット `(c) {ユーザー名}, {ライセンス}`

### 代表的なコマンド

```bash
# 全種（デフォルト 9 枚/種）
node scripts/phase13/fetch_v2_photos.mjs

# 特定 id のみ
node scripts/phase13/fetch_v2_photos.mjs --only=amanita_muscaria,lepista_nuda

# 枚数上限を変更（例: 確認用に 3 枚のみ）
node scripts/phase13/fetch_v2_photos.mjs --max-photos=3

# 書き込まない確認モード
node scripts/phase13/fetch_v2_photos.mjs --dry-run
```

### tier2 以降への継承

tier2 以降の新規追加でも同じ `fetch_v2_photos.mjs` をそのまま使う。`build_v2_mushrooms.mjs --append` で `src/data/mushrooms.json` に新規エントリ追加後、新規 id を `--only` で指定して fetch すれば既存種の画像は一切影響を受けない。

## スクリプト

| スクリプト | 用途 |
|-----------|------|
| `scripts/gather-species-data.mjs` | v1 時代の 3 ソース情報収集（v2 以降は未使用） |
| `scripts/phase13/fetch_v2_photos.mjs` | v2 画像取得（ユーザー分散 + Japan 優先） |
| `scripts/phase13/build_v2_mushrooms.mjs` | mushrooms.json 再構築（`--append` で tier 追加） |

## 出力ファイル

| ファイル | 内容 |
|---------|------|
| `scripts/temp/species-raw/{id}.json` | 種ごとの生データ |
| `scripts/temp/verification-progress.json` | 進捗管理 |
| `docs/verification-issues.md` | 不整合・要確認リスト |
