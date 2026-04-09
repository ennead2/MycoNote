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

## Phase 3: AI連携 — 完了 (2026-04-09)
- [x] 型定義・UIテキスト定数
- [x] システムプロンプト (識別・計画)
- [x] IndexedDB chatSessionsテーブル
- [x] Claude APIクライアント (fetch直接, ストリーミング対応)
- [x] 設定画面 APIキー管理UI (接続テスト付き)
- [x] 識別モード選択画面 (Phase 4簡易識別は無効表示)
- [x] PhotoUploader (複数枚対応)
- [x] IdentifyResultView (候補・毒キノコ警告・安全注意書き)
- [x] 詳細識別ページ (Claude Vision統合)
- [x] ChatMessage + ChatInput コンポーネント
- [x] PlanForm (構造化ヒアリング)
- [x] ChatHistoryList (セッション管理)
- [x] 採取計画ページ (フォーム→チャット→履歴統合)
- [x] E2Eテスト (12シナリオ)
- [x] ハイドレーション修正 (isHydratedフラグ追加)
- [x] Markdownレンダリング (react-markdown + remark-gfm)
- [x] 初回メッセージ自動送信修正
- [x] ユーザーテスト・デバッグ完了

## Phase 4: 識別強化 — 未着手
- [ ] TensorFlow.js オフライン識別
- [ ] 簡易識別UI (ダークグリーンテーマ)

## Phase 5: 仕上げ — 未着手
- [ ] エクスポート/インポート
- [ ] パフォーマンス最適化
- [ ] 図鑑データ拡充 (100種)
