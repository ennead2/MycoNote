# MycoNote

きのこ採取・観察ハンドブック — Next.js / React / Tailwind CSS で作られた PWA。

本番環境: <https://myco-note.vercel.app/>

---

## v2.0 リリースについて

2026 年 4 月、データを **v1 (300 種) → v2 (60 種)** で刷新しました。

### 何が変わったか
- 図鑑データを CC BY 出典付き・人間レビュー済みの **60 種** で再構築
- 旧 v1 で報告されていたハルシネーション疑い種を全廃棄
- 写真は CC ライセンスのみ採用（all-rights-reserved を除外）
- 簡易識別 (`/identify/simple`) は **一時停止**（Phase 14 で再開予定）

### 既存ユーザーへの影響
- 起動時に IndexedDB v3→v4 自動マイグレーション
  - 栞: v2 に存在しない種は削除
  - 採取記録: 種紐付けを null にリセット（記録自体は残る、種名テキストは保持）
- 詳細は設定 > **お知らせ** セクションに恒久掲載

### データソースとライセンス
- 図鑑データ: Wikipedia 日本語版 (CC BY-SA 4.0) / 大菌輪 (CC BY 4.0) / 厚生労働省自然毒のリスクプロファイル (政府標準利用規約)
- 写真: iNaturalist (各撮影者の CC ライセンス)
- 分類: GBIF Backbone Taxonomy / 日本産菌類集覧 (CC BY 4.0)

---

## 技術スタック

- Next.js 16 (Static Export)
- React 19
- Tailwind CSS v4 + Panda CSS
- TypeScript
- Dexie.js (IndexedDB)
- Vitest + Playwright

---

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest unit tests
npm run build    # static export to out/
```

詳細は `docs/SPEC.md`、`docs/progress.md`、`DESIGN.md` を参照。

---

## ライセンス

MIT
