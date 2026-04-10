# Phase 7: 図鑑写真導入 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全100種にWikimedia Commons の CC ライセンス写真を導入し、Google画像検索リンクを追加する

**Architecture:** Node.js スクリプトで Wikimedia Commons API から画像を取得 → sharp で WebP 変換・リサイズ → `public/images/mushrooms/` に配置。mushrooms.json の `image_local` / `images_remote` を自動更新。図鑑詳細ページに Google 画像検索ボタンを追加。

**Tech Stack:** Node.js 20, sharp (Next.js 同梱), Wikimedia Commons API, WebP

---

## ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 新規 | `scripts/fetch-photos.mjs` | Wikimedia API から写真取得・変換スクリプト |
| 変更 | `src/data/mushrooms.json` | image_local / images_remote 更新 |
| 変更 | `src/components/zukan/MushroomDetail.tsx` | Google画像検索ボタン追加 |
| 変更 | `src/components/zukan/MushroomDetail.test.tsx` | テスト追加 |
| 変更 | `src/constants/ui-text.ts` | UI テキスト追加 |
| 変更 | `docs/progress.md` | Phase 7 追記 |

---

### Task 1: 写真取得スクリプト作成

**Files:**
- Create: `scripts/fetch-photos.mjs`

- [ ] **Step 1: Wikimedia Commons API クライアント**

  API エンドポイント: `https://commons.wikimedia.org/w/api.php`

  処理フロー:
  1. mushrooms.json を読み込み
  2. 各種の `names.scientific` で Wikimedia Commons を検索
  3. CC ライセンス画像の URL を取得
  4. 画像をダウンロード
  5. sharp で WebP 変換:
     - 詳細用: 幅800px, quality 80
     - カード用: 幅400px, quality 75
  6. `public/images/mushrooms/{id}.webp` に保存
  7. mushrooms.json を更新:
     - `image_local`: `/images/mushrooms/{id}.webp`
     - `images_remote`: Wikimedia の追加画像 URL（最大3枚）
     - `source_url`: 画像の出典ページ URL

  API クエリ例:
  ```
  action=query&generator=search&gsrsearch={scientific_name}&gsrnamespace=6
  &prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800
  ```

- [ ] **Step 2: エラーハンドリング**
  - 画像が見つからない種: プレースホルダーを維持、ログ出力
  - ネットワークエラー: リトライ3回、失敗ログ
  - ライセンス確認: CC-BY-SA / CC-BY / Public Domain のみ許可
  - 進捗表示: `[42/100] マツタケ - OK` 形式

- [ ] **Step 3: 実行・結果確認**
  - `node scripts/fetch-photos.mjs` で一括実行
  - 取得成功/失敗のサマリーレポート出力
  - 写真が取得できなかった種のリストを生成

### Task 2: Google 画像検索リンク

**Files:**
- Modify: `src/components/zukan/MushroomDetail.tsx`
- Modify: `src/components/zukan/MushroomDetail.test.tsx`
- Modify: `src/constants/ui-text.ts`

- [ ] **Step 1: UI テキスト追加**
  ```typescript
  // src/constants/ui-text.ts に追加
  googleImageSearch: 'Google で画像を検索',
  ```

- [ ] **Step 2: MushroomDetail に検索ボタン追加**
  - 写真セクションの下に配置
  - リンク先: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(names.ja + ' キノコ')}`
  - `target="_blank"` `rel="noopener noreferrer"`
  - 外部リンクアイコン付き

- [ ] **Step 3: テスト追加**
  - Google 画像検索リンクが正しい URL を持つことを確認
  - `target="_blank"` が設定されていることを確認

### Task 3: ビルド確認・デプロイ

- [ ] **Step 1: 画像サイズ確認**
  - `du -sh public/images/mushrooms/` で合計サイズ計測
  - 目標: 100種で10MB以内

- [ ] **Step 2: ビルド・テスト**
  - `npx vitest run` — 全テスト通過
  - `npx next build` — 静的ビルド成功
  - ローカルで画像表示確認

- [ ] **Step 3: コミット・プッシュ・デプロイ**
  - 写真ファイルをコミット（大容量注意）
  - Vercel 自動デプロイ確認

---

## ライセンス対応

Wikimedia Commons の写真を使用するため、ライセンス情報を適切に管理する:

- `source_url` に各画像の Wikimedia ページ URL を記録
- 設定画面のライセンスセクションに「写真: Wikimedia Commons (CC BY / CC BY-SA)」を既に記載済み
- 将来的に個別帰属表示が必要な場合に備え、source_url を保持
