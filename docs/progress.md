# MycoNote 開発進捗

## Phase 1: MVP — 完了 (2026-04-08)
- [x] プロジェクトセットアップ (Next.js 16, Tailwind v4, Vitest, PWA)
- [x] 型定義・定数
- [x] サンプル図鑑データ (13種)
- [x] AppContext (オンライン状態)
- [x] UI基盤コンポーネント (ToxicityBadge, SeasonBar)
- [x] レイアウト (BottomNav, OfflineBanner, PageHeader)
- [x] 図鑑一覧ページ (検索・フィルター・ひらがな対応)
- [x] 図鑑詳細ページ (毒性警告・類似種・色名ハイライト)
- [x] シーズンカレンダー
- [x] スタブページ・設定ページ
- [x] PWA設定 (manifest, icons)
- [x] E2Eテスト (9シナリオ)
- [x] ユーザーテスト・デバッグ完了

## Phase 2: 記録機能 — 完了 (2026-04-08〜09)
- [x] IndexedDB (Dexie.js) セットアップ
- [x] RecordsContext (CRUD + IndexedDB同期)
- [x] GPS・写真ユーティリティ
- [x] 記録登録フォーム (GPS, 写真, メモ, キノコ選択)
- [x] 記録一覧ページ (リスト表示 + 写真サムネイル)
- [x] 地図表示 (React-Leaflet, ポップアップから記録詳細へ遷移)
- [x] 記録詳細ページ (写真・削除・編集)
- [x] 図鑑連携 (詳細ページに自分の記録表示)
- [x] E2Eテスト (4シナリオ)
- [x] ユーザーテスト・デバッグ完了

## Phase 3: AI連携 — 未着手
- [ ] Claude APIクライアント
- [ ] 詳細識別 (Claude Vision, コンパクト種リスト方式)
- [ ] 採取計画チャット (ハイブリッド方式: ヒアリング→チャット)
- [ ] APIキー設定UI

## Phase 4: 識別強化 — 未着手
- [ ] TensorFlow.js オフライン識別
- [ ] 簡易識別UI (ダークグリーンテーマ)

## Phase 5: 仕上げ — 未着手
- [ ] エクスポート/インポート
- [ ] パフォーマンス最適化
- [ ] 図鑑データ拡充 (100種)
