# Phase 13-G: v2 60 種の画像取得

作成日: 2026-04-16
ステータス: 計画 (未承認)
前提: Phase 13-F の Step 1〜6 完了（mushrooms.json が v2 60 種で生成済、画像フィールドは空）
親計画: [2026-04-16-phase13f-v2-release.md](./2026-04-16-phase13f-v2-release.md) Step 7

---

## 1. 目的

v2 60 種に対し、以下を取得・配備する:

- **代表写真 (image_local)**: Wikipedia 記事画像（最高品質） — 各種 1 枚
- **追加写真 (images_remote)**: iNaturalist Research Grade — 各種最大 10 枚
- **撮影者クレジット (images_remote_credits)**: iNat ユーザー名 + ライセンス

Phase 13-F のリリース PR にこの画像配備を含めて 1 回でデプロイする（画像欠落のないユーザー体験）。

---

## 2. 既存パイプラインの再利用

`scripts/fetch-photos-v2.mjs` (270 行) が既に Phase 7-8 で機能実証済み:

- Wikipedia API: ja → en の fallback、og:image / 記事冒頭画像取得、sharp で 800px webp 変換
- iNaturalist API: 学名検索 → Research Grade 観察 30 件取得 → ユーザー分散ラウンドロビンで最大 10 枚選定
- 撮影者 attribution → `images_remote_credits` に格納
- 失敗種は Google 画像検索リンクで補完（UI 側で対応）

**方針**: 既存スクリプトを **fork して `scripts/phase13/fetch_v2_photos.mjs` 新設**。理由は v2 ID 体系と JSON スキーマが違うため、本体スクリプトは触らず Phase 13 系列に閉じる。

---

## 3. 入出力

### 3.1 入力

| ファイル | 用途 |
|---|---|
| `src/data/mushrooms.json` | Phase 13-F で生成された v2 60 種（image_local=null, images_remote=[]） |

### 3.2 出力

| パス | 内容 |
|---|---|
| `public/images/mushrooms/<id>.webp` | 各種代表写真（800px、quality 80） |
| `src/data/mushrooms.json` (更新) | image_local / images_remote / images_remote_credits を埋める |
| `data/v2-image-coverage.json` | 取得結果レポート（種別 hit/miss、ソース別件数、attribution 数） |

---

## 4. 取得戦略

### 4.1 代表写真 (image_local)

優先順位:

1. **Wikipedia ja 記事の代表画像**
   - `names.ja` で記事検索 → og:image または記事冒頭画像
2. **Wikipedia en 記事の代表画像**
   - `names.scientific` または scientific_synonyms で検索
3. **iNaturalist taxa デフォルト画像**
   - `taxa/autocomplete?q={scientific}` で taxon 取得 → `default_photo.medium_url`
4. **画像なし**
   - `image_local: null` のまま、UI 側で Google 画像検索リンクを表示

### 4.2 追加写真 (images_remote)

iNaturalist API:

```
GET /observations
  taxon_name={scientific}
  quality_grade=research
  photos=true
  per_page=30
  order=desc, order_by=votes
```

選定ロジック（既存の v2 スクリプト準拠）:

- 30 件取得 → ユーザー ID 別にグループ化
- ラウンドロビンで最大 10 枚抽出（同一ユーザーから連続で選ばない）
- 各写真に `attribution` を付与: `(c) {user_login}, {license}` 形式

**fallback**:
- scientific でヒット 0 → `scientific_synonyms[]` を順に試行
- 全部 miss → `images_remote: []`、`image_local` も上記 4.1.4 に倒す

### 4.3 ライセンス取り扱い

iNat 写真のライセンスは下記のみ採用:
- `cc-by`, `cc-by-nc`, `cc-by-sa`, `cc-by-nc-sa`, `cc0`

`all-rights-reserved` 写真は除外（v1 では含めていたが、v2 では出典明記の品質基準を厳格化）。

attribution 文字列: `(c) {user_name}, {license_label}`
- `cc-by` → `(CC BY)`
- `cc-by-nc` → `(CC BY-NC)`
- 等

---

## 5. 実装ステップ

### Step 1: 取得スクリプト `scripts/phase13/fetch_v2_photos.mjs`

既存 `scripts/fetch-photos-v2.mjs` を fork し以下を変更:

- mushrooms.json を読み、`names.scientific` ベースで取得
- ファイル名は `id`（scientific underscore 小文字）に統一: `public/images/mushrooms/amanita_muscaria.webp`
- ライセンス all-rights-reserved を除外
- scientific_synonyms フォールバック追加
- coverage report を JSON で出力
- `--only=<id1>,<id2>` で部分実行可能
- `--dry-run` でファイル書き込みなしの試行
- レート制限: iNat 2 秒、Wikipedia 1 秒のスリープ（既存準拠）

### Step 2: 取得実行（本番）

```bash
node scripts/phase13/fetch_v2_photos.mjs --dry-run    # まず試行
node scripts/phase13/fetch_v2_photos.mjs              # 本番取得
```

実行時間目安: 60 種 × 平均 5 秒 = 約 5 分

### Step 3: カバレッジ確認とリトライ

`data/v2-image-coverage.json` から:
- image_local hit: 目標 ≥ 50/60 (83%)
- images_remote 1 枚以上: 目標 ≥ 55/60 (92%)
- images_remote 5 枚以上: 目標 ≥ 40/60 (67%)

未達の種は手動で:
- Wikipedia ja タイトル指定 (`--wiki-title=<title>`) で再試行
- scientific_synonyms 追加で再試行
- どうしても取れない種はリストアップして UI で「画像なし」状態として受容

### Step 4: 画像最適化チェック

- 全 webp が 800px 以下、quality 80 で保存されているか
- 1 ファイル平均 50KB 以下、合計サイズ 60 種 × 50KB ≒ 3MB を超えないか
- 異常に大きい画像（> 200KB）は手動で再エンコード

### Step 5: テスト

- `scripts/phase13/fetch_v2_photos.test.mjs`: fixture 駆動 unit test
  - selectByUserDispersion / extractWikipediaImage / formatAttribution
  - all-rights-reserved 除外ロジック
- `data/v2-image-coverage.json` にスキーマ違反がないこと
- mushrooms.json がスキーマ違反していないこと（types/mushroom.ts に従う）

### Step 6: コミット

- `public/images/mushrooms/*.webp` (60 ファイル, ~3MB)
- 更新後の `src/data/mushrooms.json`
- `data/v2-image-coverage.json`
- `scripts/phase13/fetch_v2_photos.mjs` + テスト

### Step 7: Phase 13-F の Step 8 (デプロイ) に合流

13-F + 13-G を 1 PR としてマージ → Vercel preview で全画像表示確認 → 本番デプロイ。

---

## 6. リスクと対応

| リスク | 対応 |
|---|---|
| iNat レート制限で 5 分実行が長引く | 既存スクリプトの 2s sleep を維持。失敗時 5s リトライ |
| Wikipedia ja に記事ない種 (~10 種想定) | en + iNat default にフォールバック |
| 画像が全く取れない種 (1-3 種想定) | 受容、UI で Google 検索リンクのみ表示 |
| ライセンス all-rights-reserved 除外で写真数が大幅減 | カバレッジ目標を再評価。許容範囲なら継続、未達なら一部再緩和を検討 |
| commit サイズ肥大（合計 > 10MB） | webp quality 70 まで下げて再変換 |

---

## 7. 完了条件

- [ ] 60 種中 50 種以上に image_local が配備（≥ 83%）
- [ ] 60 種中 55 種以上に images_remote が 1 枚以上配備（≥ 92%）
- [ ] 全画像が webp 800px / quality 80 / 平均 50KB 以下
- [ ] 全 images_remote に images_remote_credits が対応（attribution 欠落ゼロ）
- [ ] all-rights-reserved 写真ゼロ
- [ ] coverage レポートが生成され、未達種がリストアップ済
- [ ] テスト全 PASS
- [ ] mushrooms.json がスキーマ違反なし

---

## 8. 後続計画

- Phase 13-H 以降で tier1/tier2 を v2 化する際は、本スクリプトをそのまま再利用
- 撮影者クレジットの UI 表示は既に Phase 8 で実装済（lightbox + ギャラリー）
