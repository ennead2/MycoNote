# MycoNote

きのこ採取・観察ハンドブック — Next.js / React / Tailwind CSS で作られた PWA。

本番環境: <https://myco-note.vercel.app/>

---

## v2.1 リリースについて (2026 年 4 月)

**v2.0 (60 種) → v2.1 (113 種)** に拡充。tier1 として 53 種を追加しました。

### v2.1 の変更点
- **収録種**: 60 → **113 種** (tier0 60 + tier1 53)
- **画像選別ルール** を刷新:
  1. ユーザー分散最大（同一撮影者の偏り回避）
  2. **日本国内の観察を優先**（iNat `place_id=6737` を同順位内で先出し）
  3. CC ライセンスのみ、all-rights-reserved は除外
  4. Wikipedia ヒーロー不在時は iNat を +1 枚取得（ギャラリー 3x3 維持）
- ソース情報が薄い 5 種（Wikipedia ja/en 共にデータ無し）は **tier2 候補として保留**
- Phase 14 tier1 追加 → IndexedDB マイグレーション不要（スキーマ変更なし）

### v2.0 リリース (Phase 13-F)
- 図鑑データを **v1 (300 種) → v2 (60 種)** で完全再構築
- CC BY 出典付き・人間レビュー済み、旧 v1 のハルシネーション疑い種を全廃棄
- 写真は CC ライセンスのみ、簡易識別は一時停止（Phase 14 以降で再開予定）
- IndexedDB v3→v4 マイグレーション（栞の参照先消失分を削除、記録の種紐付けリセット）

### データソースとライセンス
- 図鑑データ: Wikipedia 日本語版 (CC BY-SA 4.0) / 大菌輪 (CC BY 4.0) / 厚生労働省自然毒のリスクプロファイル (政府標準利用規約)
- 写真: iNaturalist (各撮影者の CC ライセンス)
- 分類: GBIF Backbone Taxonomy / 日本産菌類集覧 (CC BY 4.0)

### 詳細ドキュメント
- [`docs/SPEC.md`](docs/SPEC.md) — 仕様全般
- [`docs/species-data-workflow.md`](docs/species-data-workflow.md) — 種追加・画像取得の手順
- [`docs/progress.md`](docs/progress.md) — Phase 別の開発履歴
- [`DESIGN.md`](DESIGN.md) — デザインシステム

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

### 種の追加 (tier2 以降)

```bash
# 1. AI 合成 (レビュー用 JSON を generated/articles/ に出力)
node scripts/phase13/generate_articles.mjs --spec data/tier2-species.json

# 2. 人間レビュー (approve されたものが generated/articles/approved/ にコピー)
node scripts/review-v2/server.mjs  # http://localhost:3031

# 3. mushrooms.json に追記 (tier0/tier1 は触らない)
node scripts/phase13/build_v2_mushrooms.mjs --append

# 4. 画像取得 (新規 id のみ)
node scripts/phase13/fetch_v2_photos.mjs --only=<new_id1>,<new_id2>
```

---

## ライセンス

MIT
