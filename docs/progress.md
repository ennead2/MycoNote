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

## Phase 4: 簡易識別（特徴ベース） — 完了 (2026-04-09)
※ TF.jsから方式変更: ルールベース特徴マッチングに変更
- [x] MushroomTraits 型定義
- [x] 図鑑13種に構造化特徴データ追加
- [x] 重み付きスコアマッチングエンジン
- [x] FeatureSelector コンポーネント (必須4項目 + 追加6項目)
- [x] SimpleIdentifyResult コンポーネント (写真・スコアバー・毒キノコ強調)
- [x] 簡易識別ページ (ダークグリーンテーマ・参考写真付き)
- [x] 識別モード選択画面更新 (簡易識別カード有効化)
- [x] E2Eテスト (8シナリオ)
- [x] アイコン付きチップUI (SVG形状・カラードット・発生場所)
- [x] ユーザーテスト・デバッグ完了

## Phase 5: 仕上げ

### 5a: エクスポート/インポート — 完了 (2026-04-10)
- [x] ExportData型定義
- [x] エクスポートロジック (JSON + 写真Base64選択式)
- [x] インポートロジック (バリデーション + 重複スキップ + サマリー)
- [x] 設定画面データ管理セクション
- [x] E2Eテスト (4シナリオ)

### 5b: パフォーマンス最適化 — 完了 (2026-04-10)
- [x] Lighthouse測定 (本番ビルド: Performance 98, Accessibility 96, Best Practices 96, SEO 100)
- [x] 目標 Performance 90+ を達成。追加最適化不要。

### 5c: 図鑑データ拡充 — 完了 (2026-04-10)
- [x] 100種に拡充 (食用40, 食用要注意10, 毒21, 猛毒10, 不食19)
- [x] 類似種クロスリファレンス設定 (既存13種の参照も更新)
- [x] 全100種にtraitsデータ付与 (簡易識別対応)
- [x] テスト修正・全157テスト通過
- [x] ビルド成功・静的ページ113ページ生成

## Phase 6: 実用化・デプロイ — 完了 (2026-04-10)

- [x] Phase 5b/5c 計画ドキュメント作成（記録用）
- [x] バージョン 1.0.0 に更新
- [x] GitHub リポジトリ作成・プッシュ (ennead2/MycoNote)
- [x] Vercel 連携・自動デプロイ設定
- [x] 本番 URL: https://myco-note.vercel.app/
- [x] HTTPS 環境で全ページ動作確認済み

## Phase 7: 図鑑写真導入 — 完了 (2026-04-10)

### 7a: 写真収集・同梱
- [x] v1: Wikimedia Commons API で100種の写真を自動取得
- [x] v2: Wikipedia記事画像に差し替え（92種成功、8種はv1画像で補完）
- [x] iNaturalist Research Grade 野外写真を images_remote に格納（各種最大3枚）
- [x] WebP 変換・800px リサイズ、合計8.8MB、重複なし

### 7b: UI実装
- [x] Google 画像検索リンク（「Google で画像を検索」→新タブ）
- [x] 追加写真サムネイルギャラリー（横スクロール）
- [x] ライトボックス（タップで拡大表示）
- [x] スワイプナビゲーション（ヒーロー画像↔追加写真間を左右スワイプ）
- [x] 矢印ボタン・キーボード操作・ドットインジケーター
- [x] 158テスト通過、Vercelデプロイ確認済み

## Phase 8: 図鑑拡充（300種） — 完了 (2026-04-10)

### 8a: データ追加（200種）
- [x] 追加200種リスト作成・承認
- [x] 10バッチ並列生成（食用60, 食用要注意20, 毒44, 猛毒20, 不食56）
- [x] 冬虫夏草6種を不食カテゴリに含む（サナギタケ, カメムシタケ, ハナサナギタケ, ツクツクボウシタケ, セミタケ, クモタケ）
- [x] 全300種にtraitsデータ付与（簡易識別対応）
- [x] mushrooms.json マージ（577KB）

### 8b: 写真収集（追加200種分）
- [x] Wikipedia画像: 149/200種取得成功（74.5%）
- [x] iNaturalist追加写真: 189/200種
- [x] 画像ファイル合計250枚、20.1MB
- [x] 取得失敗51種はGoogle画像検索リンクで補完

### 8c: テスト・検証
- [x] テスト修正・全158テスト通過
- [x] ビルド成功・静的ページ313ページ生成
- [x] Vercelデプロイ確認済み

### 8d: 写真品質改善
- [x] iNaturalist写真: 最大10枚/種、ユーザー分散ラウンドロビン選択
- [x] 合計2,814枚、平均9.7枚/種、289/300種で取得
- [x] 複数ユーザーの写真: 283/283種（3枚以上の全種で2名以上）
- [x] 撮影者クレジット付与（images_remote_credits）: 284種
- [x] ギャラリーUI: 3列グリッド・正方形クロップ・クレジット表示
- [x] ライトボックスにクレジット表示追加
- [x] docs/image-review.md 作成（画像なし51種リスト + 差し替え指示用）
- [x] 全158テスト通過、Vercelデプロイ確認済み

### 8e: データ検証・図鑑詳細化
- [x] データ収集スクリプト作成 (gather-species-data.mjs)
- [x] 3ソース検証 (iNaturalist/Wikipedia/kinoco-zukan) 全300種実行
- [x] 学名���動更新: 38種をiNaturalist最新分類に更新
- [x] taxonomy追加: 288種に目・科・属を設定
- [x] 検証問題56件検出 → docs/verification-issues.md
- [x] description拡充: 全300種を4-6文の詳細概要に
- [x] features拡充: 具体的サイズ(cm)・色・形状・匂い等
- [x] cooking_preservation追加: 食用種に調理法・保��方法
- [x] poisoning_first_aid追加: 毒種に中毒症状・応急処置
- [x] 充実化フェーズ懸念108件 → docs/verification-issues-enrichment.md
- [x] ワークフロー文書化 → docs/species-data-workflow.md
- [x] mushrooms.json: 577KB → 1,177KB
- [x] 全158テスト通過、Vercelデプロイ確認済み

## Phase 9: UI/UX 改善 — 完了 (2026-04-12)

### 9-1: デザインシステム策定 (design-consultation)
- [x] Geminiでの競合調査 (iNaturalist/Seek/AllTrails/Merlin/YAMAP/きのこ図鑑.net)
- [x] デザイン方向性「現代の民藝図鑑」を策定
- [x] カラーパレット: Moss/Soil/Washi + Safety 5段階 + Species 12色
- [x] タイポグラフィ: Noto Serif JP + Noto Sans JP + Inter italic + JetBrains Mono
- [x] DESIGN.md をリポジトリルートに作成 (700行)
- [x] プレビューHTML作成、色情報視覚化仕様追加

### 9-2: アプリアイコン生成 (gemini-imagegen)
- [x] Gemini 3 Pro Image で 4バリアント生成
- [x] Variant D (Washi Emblem) をベースに 3 refinements 生成
- [x] D3 (Refined Emblem - 木版画風) を採用
- [x] 192/512/32 PNG + favicon.ico + apple-touch-icon に書き出し
- [x] manifest.json のテーマカラー更新

### 9-3: デザイン基盤実装
- [x] lucide-react 1.8.0 インストール
- [x] globals.css にパレット・アニメーション keyframes (fade-in/shimmer/slide-up)
- [x] 和紙 grain テクスチャを body 背景に (4% opacity)
- [x] next/font でフォント4種統合
- [x] LoadingSkeleton コンポーネント新設

### 9-4: コンポーネント刷新
- [x] 4a: BottomNav + PageHeader を lucide アイコンに、ホームタブ追加 (5タブ)
- [x] 4b: ToxicityBadge を safety-* パレットに移行
- [x] 4c: MushroomCard にホバー translateY + moss shadow
- [x] 4d: ColorChip コンポーネント + renderColorText リファクタ (色名前にチップ挿入)

### 9-5: ホーム画面新設
- [x] `/` を `/zukan` リダイレクトから HomePage に
- [x] season-utils.ts: getSeasonalMushrooms / getSafetyTip (日付シード決定論的)
- [x] ヒーロー + クイックアクセス4枚 + 今月の旬 + 安全Tips + 最近の記録

### 9-6: シーズンカレンダー改善
- [x] 13 月タブフィルター (すべて + 1-12月)
- [x] 現在月デフォルト選択
- [x] 選択月 moss-primary ハイライト、現在月 border 強調
- [x] 件数表示 / 空状態メッセージ

### 9-7: アニメーション統合
- [x] app/template.tsx でルート遷移 fade-in 一元化
- [x] 図鑑フィルター切替時に grid fade-in リプレイ
- [x] 記録画面: LoadingSpinner → LoadingSkeleton 4枚

### 9-8: ビジュアルQA (design-review)
- [x] 全7主要ページを browse binary でスクリーンショット取得 (モバイル 390x844)
- [x] 6 findings 検出・修正:
  - 底部ナビのアクティブ状態強化 (上部インジケータバー)
  - iNat 画像ローディングを shimmer スケルトンに
  - 識別2カード差別化 (AI=moss グラデ強調 / 簡易=neutral)
  - 計画ページ emoji 🗺 → lucide Map
  - Button primary/secondary の palette 修正
  - ホーム横スクロールに右端フェードヒント
- [x] Before/After スクリーンショット取得
- [x] 全183テスト通過、本番ビルド成功 (292 静的ページ)
