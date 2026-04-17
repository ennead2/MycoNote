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

### 9-9: デザインパターン ハードニング (Plan B) — 完了 (2026-04-12)
- [x] CLAUDE.md に Design Guardrails 章追加（新コード時の 7 ルール明文化）
  - DESIGN.md トークン強制、forest-* 禁止、共通コンポーネント再利用、lucide-react 統一、safety/species パレット分離、Common Patterns 参照、CSS-only motion
- [x] DESIGN.md に Common Patterns 章追加（7 パターン）
  - PageShell / SectionHeader / EmptyState / InfoBanner / ChipTag / ScrollCarousel / BentoGrid
  - 各パターンに「いつ使うか」「最小コード例」「既存実装パス」「ルール」を明記
  - パターン選定フローチャート添付

### 9-10: forest-* 一括移行 & 共通コンポーネント抽出 (Plan C) — 完了 (2026-04-12)

**C-1: forest-* → 新パレット一括置換**
- [x] 22 ファイル 223 箇所の `forest-N` クラスを新トークンへ置換
  - forest-50/100 → washi-cream、forest-200 → washi-muted、forest-300/400 → moss-light
  - forest-500 → washi-dim、forest-600 → moss-primary、forest-700 → border
  - forest-800/900 → soil-surface、forest-950 → soil-bg
- [x] `bg-border` / `hover:bg-border`（意味的に不自然）を `bg-soil-elevated` / `hover:bg-soil-elevated` に修正（5ファイル 8箇所）
- [x] globals.css の legacy forest-* block 削除
- [x] 残存確認: src/ 以下 forest-* ゼロ

**C-2: 共通UIコンポーネント抽出（DESIGN.md Common Patterns に 1:1 対応）**
- [x] `src/components/ui/SectionHeader.tsx` 新設 — title + label + action link
- [x] `src/components/ui/EmptyState.tsx` 新設 — lucide icon + message + CTA
- [x] `src/components/ui/InfoBanner.tsx` 新設 — severity 別 (info/caution/toxic/deadly) safety border
- [x] `src/components/ui/ChipTag.tsx` 新設 — rounded-full + mono-data、active/onClick 対応
- [x] HomePage の seasonal/recent セクションヘッダと SafetyTip バナーを新コンポーネントで置換
- [x] MushroomDetail の habitat/tree_association タグを ChipTag で置換

**検証**
- [x] 全183テスト通過
- [x] 本番ビルド成功 (292 静的ページ)
- [x] 色値は視覚的に完全に同一（同 Hex へのリマップ）なので Phase 9 QA 結果を維持

### 9-11: favicon / PWA アイコン配線 — 完了 (2026-04-12)
- [x] src/app/favicon.ico の古いデフォルト削除
- [x] Next.js 16 規約で src/app/{icon,apple-icon}.png 新設（RGBA 変換）
- [x] public/favicon.ico を正しい 32x32 RGBA ICO で再構築
- [x] layout.tsx に applicationName / appleWebApp / viewport.themeColor 追加
- [x] title / description を Phase 9 ブランドトーンに調整

## Phase 10: 実利用フィードバック対応 — 完了 (2026-04-12)

ユーザー実機確認で挙がった 7 項目を対応。決定事項: ①6タブ化 / ②一覧・栞・季節の3タブ / ③デフォルト五十音・3ソート切替 / ④フィルタ全項目

### 10-A: Quick fixes
- [x] **A1**: BottomNav に計画タブを復元（6 タブ化: ホーム/図鑑/識別/**計画**/記録/設定）
- [x] **A2**: 図鑑リストに `ScrollToTop` floating button (`src/components/ui/ScrollToTop.tsx`)

### 10-B: 写真アップローダ改善
- [x] **B1**: 「撮影」と「ファイル」の2ボタン分離
  - PhotoPicker (記録) / PhotoUploader (識別) 両方
  - camera input (`capture="environment"`) と file input (`multiple`) を分離
- [x] **B2**: PhotoUploader の Phase 9 パレット違反修正
  - `bg-white`, `border-gray-300`, 絵文字 `+` → `bg-soil-surface`, `border-washi-dim`, lucide `Camera` / `ImagePlus` / `X`

### 10-C: 検索状態の永続化
- [x] **C1**: `useSearchParams` + `router.replace` で URL クエリ同期
  - `?tab=list|bookmarks|calendar&q=...&sort=safety|kana|taxonomy&safety=...&family=...&genus=...&habitat=...&regions=...&tree=...&cap=...`
  - `Suspense` boundary で CSR bailout 回避、static prerender 成功
- [x] 戻るボタンで URL 状態が復元される（ブラウザ履歴経由）

### 10-D: ソート・フィルタ充実
- [x] **D1**: SearchFilter をアコーディオン展開 UI に改修 (`SlidersHorizontal` icon、active 件数バッジ、全クリアボタン)
- [x] **D2**: フィルタ全項目実装
  - 傘の色（color chip 付き）、生息地、関連樹種、分布地域、科、属（italic）
  - 検索入力に leading search icon + 末尾クリア X
- [x] **D3**: `SortToggle` で 3 ソート: 食用分類 / 五十音 / 分類学
  - `sortMushrooms()` / `kanaCompare()` / `TOXICITY_SORT_ORDER` 追加

### 10-E: 表示順のデフォルト
- [x] デフォルト: **五十音** (`DEFAULT_SORT = 'kana'`)
- [x] 登録順を廃止、3 オプション切替可能

### 10-F: ブックマーク機能（栞）
- [x] **F1**: IndexedDB schema v3 + `bookmarks` テーブル (`src/lib/db.ts`)
- [x] `src/types/bookmark.ts` + `src/contexts/BookmarksContext.tsx`
- [x] **F2**: MushroomDetail 右上にトグルボタン（lucide `Bookmark` ↔ `BookmarkCheck`）
- [x] **F3**: 図鑑ページに **一覧 / 栞 / 季節** の 3 タブ
  - 栞タブで bookmarkedMushrooms を MushroomCard グリッド表示
  - 空状態: `EmptyState` コンポーネントで `bookmarksEmpty` メッセージ
- [x] **F4**: export/import に `bookmarks` フィールド追加（optional、後方互換）
  - Settings 画面に栞カウント表示
  - 3 テスト追加（import bookmarks / skip duplicates / backward compat）

### 検証
- [x] 全 187 テスト通過（bookmarks 関連 3 追加）
- [x] 本番ビルド成功 (293 静的ページ)
- [x] `/zukan` が `Suspense` ラップで CSR bailout 回避

### 10-G: 緊急修正（実機フィードバック） — 完了 (2026-04-12)
- [x] 栞ボタン/記録ロード停止 → DB v2→v3 アップグレード時の blocked 問題を watchdog + `db.on('blocked')` ハンドラで可視化（PWA 再インストールで解消済み）
- [x] 簡易識別にもカメラ/ファイル 2 ボタン分離、Phase 9 パレット準拠
- [x] ScrollToTop 位置を右上オーバーレイへ（`top-3 right-3` + `backdrop-blur-md`）
- [x] **critical**: `template.tsx` の `animate-fade-in` が `transform: translateY(0)` を残留させ、`position: fixed` の containing block を壊していた → `fade-in`/`slide-up` を opacity-only に変更
- [x] **critical**: `RecordForm` の `toDatetimeLocal` が UTC ISO を slice だけして local 扱いしていた → JST で 9h ズレ + 保存毎に更にズレるバグ → `getFullYear/getHours` 方式に修正

### 10-H: 写真 EXIF 自動補完 — 完了 (2026-04-12)
- [x] `exifr` 導入、`src/lib/exif.ts` 新設
- [x] PhotoPicker に `onPhotosMetadata` コールバック追加（raw File から EXIF 抽出、圧縮前に実行）
- [x] RecordForm で日時 / 位置を空フィールドのみ補完、「📷 写真から補完」バッジ表示
- [x] exifr.gps() が NaN 返す端末向けフォールバック: 生 IFD → DMS 手動変換（`deriveDecimalCoord`）
- [x] 「撮影」ボタン経由（`capture="environment"`）では EXIF GPS 完全保持で自動補完動作確認
- [x] **発見**: 「ファイル」ボタン経由は Android 10+ の Scoped Storage 仕様で GPS が redact されるため Web では取得不可 — OS 仕様として受容
- [x] URL に `?debug=exif` で画面上に EXIF debug panel を表示（Copy JSON ボタン付き）— 将来のトラブル診断用に残存

### 10-I: 種名入力を combobox 化 — 完了 (2026-04-12)
- [x] `src/components/records/MushroomCombobox.tsx` 新設
- [x] 入力欄 1 つでリアルタイム候補表示（最大 10 件）→ 候補選択で `mushroom_id` セット、入力継続で自由入力モード
- [x] 候補一致時は ✓ マーク + `border-moss-light` で「登録済みの種」表示
- [x] 外タップ/Escape でドロップダウン閉じ、選択後は input.blur() でモバイルキーボード自動収納
- [x] 編集時は `getMushroomById` で初期名解決、送信時は DB 正規名を保存（将来の rename 耐性）

### 10-J: マップカスタムピン (Gemini 生成) — 完了 (2026-04-12)
- [x] `scripts/gemini/generate_map_pin.py` — 4 バリアント生成（balloon / medallion / woodcut / kamon）+ 比較 HTML
- [x] `scripts/gemini/export_map_pin.py` — 白背景 alpha ramp 抜き + content bbox トリム + @1x/@2x PNG 出力
- [x] `pin_a_balloon_mushroom` 採用（deep moss balloon + washi cream mushroom）
- [x] `public/icons/map-pin.png` (48×48) + `map-pin@2x.png` (96×96)
- [x] `RecordMapInner.tsx`: `L.icon` + `iconRetinaUrl` で DPI 自動切替、`iconAnchor=[24,40]`（tip を座標一致）
- [x] 以前 unpkg から取得していた Leaflet デフォルトマーカーの外部依存を排除（オフライン時も動く）

## Phase 11: 採取計画画面の UX/デザイン統一 — 完了 (2026-04-12)

計画書: `docs/superpowers/plans/2026-04-12-phase11-plan-ux.md`

- [x] **11-A1**: 履歴画面の戻るボタンを計画ホームへ
- [x] **11-D**: ChatInput の自動フォーカス解除
- [x] **11-E1**: PlanForm の絵文字 → lucide
- [x] **11-E2**: ChatHistory の絵文字 → lucide
- [x] **11-E3**: ChatMessage のアシスタントラベル（🤖 → Sprout）
- [x] **11-E4**: ChatInput 送信ボタン (↑ → ArrowUp)
- [x] **11-E5**: Settings の Eye/EyeOff + カスタム Checkbox
- [x] **11-C**: 「チャット履歴」→「採取計画の履歴」
- [x] **11-B1**: 「探したいキノコ」Combobox 化（全300種、searchMushrooms 参照）
- [x] **11-B2**: 予定日ネイティブカレンダーのスタイル調整
- [x] **11-F**: アシスタント返答の絵文字 → lucide（21 コードポイント辞書 + 9 テスト）

### 検証
- [x] 196 テスト通過（emoji-to-icon 9 テスト追加）
- [x] 本番ビルド成功（293 静的ページ）
- [x] plan / settings 配下の残存絵文字ゼロ

## Phase 12: 図鑑ハルシネーション対策（自動シノニム解決） — 進行中 (2026-04-12)

計画書: `docs/superpowers/plans/2026-04-12-phase12-hallucination-reduction.md`

### 背景

Phase 8e で残った 56 件の verification-issue（学名不一致・架空種疑い）の大半が
分類学的シノニム関係（例: `Lactarius volemus` → `Lactifluus volemus`）であり、
既存 iNaturalist 主体の workflow では自動解決できず全件人間レビュー待ちだった。

### 正典宣言（SPEC.md に明記）

- **学名・分類階層**: GBIF Backbone Taxonomy を正
- **和名**: 日本産菌類集覧（日本菌学会, CC BY 4.0）を正
- 自動適用閾値: `matchType === "EXACT"` かつ `confidence >= 90`

### 12-A: GBIF resolver — 完了
- [x] `scripts/gbif-resolve.mjs` 新設：`/species/match` + `/species/{key}/synonyms` で全 279 種を解決
- [x] 自動適用 270 件 / 要レビュー 9 件、学名変化 33 件

### 12-B: 日本産菌類集覧 JSON 化 — 完了
- [x] `scripts/import-jp-mycology-checklist.mjs` で Katumoto-Wamei.xlsx (日本菌学会) を取り込み
- [x] `data/jp-mycology-checklist.json` (4429 エントリー, 641KB) として保存
- [x] `docs/credits.md` 新設、CC BY 4.0 クレジット記録

### 12-C/D: 検証パイプライン + 自動訂正 — 完了
- [x] `scripts/verify-species-v2.mjs`：GBIF + 菌類集覧でクロスチェック
  - 種内ランク (`var.` / `f.` / `subsp.`) の差を同一視
  - 同一属かつ編集距離 <= 2 の綴り異本 (`rhacodes` / `rachodes`) を同一視
- [x] `scripts/apply-corrections.mjs`：27 件の学名を新名に更新、旧名を `scientific_synonyms[]` に保持
- [x] 11 件の taxonomy を GBIF ソースで補完
- [x] 結果: 279 種中 **183 件 (65.6%) 自動クローズ**、残り 96 件が要レビュー

### 12-E: 検索・表示の synonyms 対応 — 完了
- [x] `Mushroom.names.scientific_synonyms?: string[]` を型に追加
- [x] `searchMushrooms` が synonyms を検索対象に拡張（旧学名でもヒット）
- [x] `MushroomDetail`：学名下に `syn.` ラベル + synonyms を `italic` muted 併記

### 12-G: テスト追加 — 完了
- [x] `scripts/lib/species-match.mjs` に pure helpers 抽出
- [x] `scripts/lib/species-match.test.mjs` 24 テスト（normalize / stripInfraspecific / editDistance / sciEquivalent / filterSynonyms）
- [x] `src/data/mushrooms.test.ts` に 5 テスト追加（旧学名検索のヒット確認）
- [x] **合計 233 テスト通過** (Phase 11 の 196 から +37)

### 12-H: ドキュメント — 完了
- [x] `docs/SPEC.md` に「分類体系の正典」章を追加
- [x] `docs/species-data-workflow.md` に Step 0 (GBIF) / Step 1 (菌類集覧) を追記
- [x] `docs/credits.md` 新設

### 12-F: 残存 96 件の手動レビュー — 次セッション
96 件内訳:
- 🔴 高（架空種・和名誤りの強い疑い）: 43 件
- 🟡 中（HIGHERRANK / 学名不一致）: 59 件
- 🟢 低（typo）: 2 件

### 主な自動訂正例

| 和名 | 旧学名 | → 新学名 |
|---|---|---|
| ツキヨタケ | Omphalotus japonicus | Omphalotus guepiniiformis |
| タモギタケ | Pleurotus cornucopiae var. citrinopileatus | Pleurotus citrinopileatus |
| アカモミタケ | Lactarius laeticolor | Lactarius deliciosus |
| ドクササコ | Clitocybe acromelalga | Paralepistopsis acromelalga |
| ドクヤマドリ | Boletus venenatus | Sutorius venenatus |
| シャカシメジ | Lyophyllum fumosum | Lyophyllum decastes |
| ヒカゲシビレタケ | Psilocybe argentipes | Psilocybe subcaerulipes |

---

## Phase 13-A: データソース収集基盤 — 完了

完了日: 2026-04-13

### 成果

- 学名 + MycoBank ID 指定で 5 ソースを並列取得し正規化 JSON を出力する CLI
  - `node scripts/phase13/fetch_sources.mjs --name <学名> --mycobank <ID> [--out <path>]`
- ソース別モジュール（fixture 駆動 unit test 付き）
  - `daikinrin.mjs` — 大菌輪 HTML パーサー（学名・和名・分類・観察数・外部リンク）
  - `wikipedia.mjs` — MediaWiki API、ja は和名→学名 fallback
  - `mhlw.mjs` — 厚労省自然毒 19 種（HTML/PDF 混在対応）
  - `rinya.mjs` — 林野庁特用林産物（単一ページ）
  - `trait-circus.mjs` + `trait-circus-prep.py` — Parquet → species 別 JSON 変換と Node loader
- ファイルベース TTL キャッシュ（`cache.mjs`）
  - `node:fs/promises` ベース、atomic write（temp + rename）
  - `encodeURIComponent` で衝突なし key sanitize
- オーケストレータの fault-tolerance（1 ソース失敗で全体死なない）
- japaneseName fallback chain（daikinrin → mhlw）でスモークテストの wiki ja ヒット率改善

### テスト

- `scripts/phase13/` 配下で 7 ファイル / 32 ユニットテスト全パス
- 実データスモーク 3 種（Morchella esculenta / Amanita virosa / Tricholoma matsutake）

### 次フェーズ

Phase 13-B（種選定 + スコアリング、MycoBank ID 自動解決、学名→和名 resolver）

---

## Phase 13-B: 種選定 + スコアリング — 完了

完了日: 2026-04-14

### 成果

- 日本産菌類集覧 3,145 候補 × 5 シグナル（MycoBank / Wikipedia ja / iNat / GBIF 観察 / 毒性）の並列収集 → 重み付けスコア → tier 分類 → `data/species-ranking.json` 出力
- サブモジュール（全 fixture 駆動 unit test 付き）
  - `candidate-pool.mjs` — 集覧フィルタ + 和名集約
  - `mycobank-resolve.mjs` — known-map → GBIF backbone
  - `wikipedia-exists.mjs` / `inat-photos.mjs` / `gbif-observations.mjs`
  - `toxicity-classify.mjs` — v1 map + 厚労省リスト
  - `scoring.mjs` — 重み計算 + tier 分類
  - `tier0-suggest.mjs` — v1 → 手動指名叩き台
  - `build_ranking.mjs` — オーケストレータ CLI

### 初回本番実行（Phase 13-B のみ）

tier0=52/73 (71%)、Wikipedia ja 317 (10.1%)、iNat 537 (17.1%)、GBIF 国内 292 (9.3%)。
tier0 取りこぼし 19 件発生（新旧学名の不一致が原因）→ Phase 13-B' で解決。

---

## Phase 13-B': シノニム正規化層 — 完了

完了日: 2026-04-14
計画書: [docs/superpowers/plans/2026-04-14-phase13b-prime-synonym-normalization.md](./superpowers/plans/2026-04-14-phase13b-prime-synonym-normalization.md)

### 背景

Phase 13-B 実行後、`tier0-species.json` の 73 件指名のうち 52 件しか ranking に tier=0 として現れない事象が判明。原因は v1 MycoNote DB（新学名）と日本産菌類集覧（旧学名）の学名体系の差：

| v1 (新名、tier0 由来) | 菌類集覧 (旧名、pool 由来) |
|---|---|
| Amanita caesareoides | Amanita hemibapha |
| Lactarius hatsudake | Lactarius lividatus |
| Pseudosperma rimosum | Inocybe rimosa |
| Sutorius venenatus | Boletus venenatus |
| etc. (計 13 件) |

Phase 12 の GBIF Backbone 検証ではこの不一致を検出していたが、Phase 13-B のパイプラインではその知見を活用できていなかった。

### 成果

- 新規モジュール `gbif-normalize.mjs` — 学名 → `{ acceptedName, acceptedUsageKey, synonyms[], status }` 解決
- `candidate-pool.mjs` に `buildCandidatePoolNormalized` 追加 — accepted name で dedupe、旧名/新名を 1 エントリに統合
- `wikipedia-exists.mjs` / `inat-photos.mjs` に synonyms fallback — accepted miss 時に synonyms を順に試行
- `gbif-observations.mjs` / `mycobank-resolve.mjs` に `acceptedUsageKey` 直接ルート — GBIF は usageKey 指定で synonyms を包含
- `build_ranking.mjs` に `resolveTier0` — tier0 指名も正規化、pool 不在なら `tier0Forced: true` で強制追加
- `tier0-species.json` の typo 修正 + 重複統合（73 → 69 unique entries）

### 本番実行統計（before/after）

| 指標 | Phase 13-B | Phase 13-B' | 変化 |
|---|---|---|---|
| 候補総数 | 3,145 | 2,906 | -7.6% (accepted merge) |
| **tier0 完全一致** | **52/73 (71%)** | **68/68 (100%)** | ✅ 取りこぼしゼロ |
| Wikipedia ja hit | 317 (10.1%) | 308 (10.6%) | ≈ |
| iNat 写真 hit | 537 (17.1%) | 604 (20.8%) | +12% |
| **GBIF 国内観察 hit** | **292 (9.3%)** | **642 (22.1%)** | **+120%** |
| 毒性判定 | 195 (6.2%) | 240 (8.3%) | +23% |
| status=SYNONYM (旧名統合) | - | 607 件 | - |
| status=UNKNOWN | - | 1 件のみ | ほぼ全解決 |
| iNat matched via synonym | - | 162 件 | fallback 実効 |

### テスト

- `scripts/phase13/` 配下 17 files / 111 tests 全パス

### 既知の caveat

- `japaneseName` (primary) は checklist 処理順依存。複数和名を持つ種では obscure な異名が先頭に来ることがある（`japaneseNames[]` に全異名は保持）。将来的に tier0 doc の wamei を優先する heuristic 検討
- MycoBank ID は依然 0 件解決（GBIF の identifiers 未登録問題）

### 次フェーズ

Phase 13-C（AI 合成パイプライン）の入力として `data/species-ranking.json` を使用

---

## Phase 13-C: AI 合成パイプライン — 完了 (2026-04-15)

設計書: [docs/superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md](./superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md)
計画書: [docs/superpowers/plans/2026-04-14-phase13c-ai-synthesis.md](./superpowers/plans/2026-04-14-phase13c-ai-synthesis.md)
生成ログ: [docs/phase13/generation-log.md](./phase13/generation-log.md)

### 成果

- プロンプト組立モジュール `prompt_templates.mjs`
- 機械検証モジュール `validate_article.mjs`（V1〜V8）
- 類似種 v1 DB 解決モジュール `similar_species_resolve.mjs`
- オーケストレータ `generate_articles.mjs`（--prepare / --validate）
- tier0 補充 fetcher `fetch_tier0_sources.mjs`
- tier0 確定（68 指名 → 名称修正 3・除外 6 → **62 種**）
- Opus 4.6 subagent 並列（concurrency 5）で **62/62 pass（達成率 100%）** を達成
- `generated/articles/<slug>.json` × 62 件を commit

### パイプライン方針

- AI 呼び出しは Claude Code セッション内 subagent で行う（サブスク枠内、Node API 直叩きは後送り）
- 非 AI 部分（対象解決・プロンプト組立・検証）を Node CLI に分離
- Phase 13-A/B と同じ fixture 駆動 unit test パターンを踏襲

### 出力スキーマの v1 との差分

- `season` を配列化（春秋 2 期 / 冬またぎ 2 分割対応）
- `similar_species` を `{ja, note, v1_id?, scientific?}` にリッチ化
- `sources[]` と `notes` を必須化
- `toxicity` enum は Phase 13-C では v1 値を `safety` に正規化（最終呼称は Phase 13-E で決定）

### 学び

- V5 冬またぎ: 「晩秋〜早春」等の表現で AI が素朴に `{11,3}` を出し V5 違反。プロンプトに「冬またぎ→2 分割」を明示して解消
- ソース薄種: 8 件が rinya 以外ヒット 0 → curator 再確認で 3 件は名称修正で救済、5 件は tier demote、1 件は除外

### 次フェーズ

Phase 13-D（レビューツール拡張、v1/v2 差分 UI）で `generated/articles/` の 62 件を人間レビューに掛ける。warning 付き 19 件は UI でバッジ表示予定。

---

## Phase 13-A Hotfix: 大菌輪 fetcher の pages.json 駆動化 — 完了 (2026-04-15)

計画書: [docs/superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md](./superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md)
レポート: [docs/phase13/daikinrin-hotfix-report.md](./phase13/daikinrin-hotfix-report.md)

### 背景

Phase 13-A の `daikinrin.mjs` は MycoBank ID 必須の旧 URL 形式を使っていたが、
GBIF Backbone Taxonomy に MycoBank ID が登録されていないため事実上 0 件解決という
既知 caveat があり、すべての daikinrin fetch が失敗していた。
Phase 13-D レビュー UI で「大菌輪 null」が頻発して発覚。

### 修正

- 大菌輪公式 `pages.json`（50,686 件、7.7MB）を `.cache/phase13/daikinrin-pages.json` にキャッシュ
- `daikinrin-pages.mjs` 新規追加: `parsePagesJson / buildPagesIndex / lookupEntry / lookupMycoBankId / fetchDaikinrinPagesIndex`
- `fetchDaikinrinPage(scientificName, japaneseName)` は内部で `lookupEntry` を呼び、
  大菌輪側の**正典学名**で URL を組み立てる（GBIF と accepted name が異なるケース対応）
- caller 3 ファイル (fetch_sources / fetch_tier0_sources / fetch_pilot_sources) を新シグネチャに更新

### 結果

- 旧 fetcher: tier0 daikinrin hit = **0 / 62**
- 新 fetcher: tier0 daikinrin hit = **62 / 62（100%）**
- GBIF ↔ 大菌輪の accepted name 差分 2 件（Pholiota nameko → microspora, Omphalotus guepiniiformis → japonicus）は和名経由で正典学名を取得して解消
- tier0 和名と大菌輪和名の乖離 15 件を発見 → **一括で大菌輪正典に揃えた**（選択肢 A）
  - 主な修正: Boletus sensibilis「ドクヤマドリモドキ」→「ミヤマイロガワリ」、Tricholoma bakamatsutake「ニセマツタケ」→「バカマツタケ」等
  - 慣用呼称は generated/articles の aliases 配列に残っているため UI 表示で失うものはない

### 既存 generated/articles の扱い

retain（Phase 13-D レビューで新 combined JSON と目視照合）。Phase 13-C 再合成は別 plan 化。

### 既知 caveat の解消

| 旧 caveat | 解消状態 |
|---|---|
| MycoBank ID 0 件解決 → 大菌輪 fetch 全失敗 | ✓ 解消（pages.json 駆動で全解決可能） |

### テスト

- 新規 `daikinrin-pages.test.mjs` 13 tests 追加
- 既存 149 + 新規 13 = **162 tests all pass**

---

## Phase 13-D: レビューツール拡張 — 完了 (2026-04-15)

設計書: [docs/superpowers/specs/2026-04-15-phase13d-review-ui-design.md](./superpowers/specs/2026-04-15-phase13d-review-ui-design.md)
計画書: [docs/superpowers/plans/2026-04-15-phase13d-review-ui.md](./superpowers/plans/2026-04-15-phase13d-review-ui.md)

### 成果

- `scripts/review-v2/` — tier0 62 件の人間判定用 dev-only ツール（port 3031）
- vanilla JS + HTML + CSS、Next.js 本体に影響なし
- 3 択判定（approve / concern / reject）+ concern 時のセクション指定 + メモ
- キーボード中心（1/2/3/0/N/Enter/←→/G）
- autosave + ブラウザ閉じて再開で状態復元
- approve 判定で `generated/articles/approved/<slug>.json` に自動コピー
- `server.mjs` に unit test 11 件（`node --test`）

### パネル構成

- 左: v2 記事の 7 セクション（概要 / 形態 / 発生・生態 / 類似種 / 食用 / 中毒 / 注意）
- 右: combined JSON のソース抜粋（Wikipedia ja/en / 大菌輪 / 厚労省 / 林野庁 / Trait Circus）
- warning 付きセクションは赤波下線で強調

### 設計判断

- v1 比較は捨て、代わりに combined JSON のソース抜粋を右パネルに表示（v2 の RAG 思想と一致）
- 編集機能なし（read-only + concern マーク + メモのみ）。本文修正は再生成プロンプトに委ねる
- hero_image 画面内完結（Phase 12-F の Google 画像検索 2 タブ自動操作は廃止、`G` キーで新タブ起動のみ）

### 次フェーズ

Phase 13-E（軽量スキーマ移行）で v2 スキーマ対応の型・ローダを実装、起動時に bookmarks 初期化 + records の mushroom_id リセット。
Phase 13-F（v2.0 リリース）で `generated/articles/approved/` を `src/data/mushrooms.json` に組み立てて図鑑 UI を v2 に切替。

---

## Phase 13-E: 自動判定強化 + tier0 全再生成 + ラインナップ調整

設計書: `docs/superpowers/specs/2026-04-16-phase13e-auto-validation-design.md`
計画書: `docs/superpowers/plans/2026-04-16-phase13e-auto-validation.md`

### Step 1: 検証・fetcher・prompt の強化 — 完了 (2026-04-16)

- [x] Task 1.1: wikipedia.mjs redirect 除去 + requestedTitle 保存
- [x] Task 1.2: validate V9 aliases のラテン文字/数字混入検出（全角も対応）
- [x] Task 1.3: validate V10 wikipediaJa 未引用検出
- [x] Task 1.4: validate V11 学名 canonical 不一致検出
- [x] Task 1.5: validate V12 wikipedia redirect 被害検出
- [x] Task 1.6: validate V13 season 年中扱い検出
- [x] Task 1.7: generate_articles validate に combined/targetScientificName を渡す
- [x] Task 1.8: prompt SOURCE_PRIORITY_BLOCK 追加（wikipediaJa 優先）
- [x] Task 1.9: prompt extractHint 引数追加
- [x] Task 1.10: combineSources に extractHint 経路追加
- [x] Task 1.11: fetch_tier0 override 伝播 + --resolve-canonical モード追加
- [x] Task 1.12: reset_phase13e.mjs キャッシュ破棄スクリプト
- [x] Task 1.13: 全テスト通過確認・本 commit

新規テスト約 266 件追加（162件 → 428件）。全テスト PASS。

### Step 2: tier0 62 種を新パイプラインで全再生成 — 完了 (2026-04-16)

- [x] `reset_phase13e.mjs` で旧キャッシュ・旧 generated/articles 破棄
- [x] tier0 62 種を新 fetcher + 新 prompt + V1〜V13 validator で再生成
- [x] subagent 並列（concurrency 5）で 62/62 pass を達成
- [x] `combined_to_md.mjs` 追加 — combined JSON から Markdown サイドカー出力
- [x] commit `8d83dc5`（tier0 62 種再生成）

### Step 3: レビュー UI 改善 + 人間レビュー確定 — 完了 (2026-04-16)

- [x] `review-v2` UI に warning 理由表示を追加（commit `cd6cfbf`）
- [x] 第 1 ラウンド: 55 approve、concern 7 件を残課題として分離（commit `b8adb7c`）
- [x] 第 2 ラウンド concern 対応（commit `1a12824`）
  - 差し替え 3 件: Gymnopilus liquiritiae → picreus、Psilocybe subcaerulipes → argentipes、Russula nobilis → neoemetica
  - 修正 4 件: Tricholoma bakamatsutake (toxic→edible)、Lactarius hatsudake 和名、Entoloma murrayi 和名、Tricholoma ustaloides 和名
- [x] 第 3 ラウンド reject 2 件: Russula neoemetica / Tricholoma ustaloides を tier0 除外（commit `a3cd3bf`）
- [x] **最終: tier0 60 種 approve 確定**、`generated/articles/approved/` に 60 件配置
- [x] validate: 60/60 pass

### マージ
- [x] phase13d-review-ui ブランチを main にマージ（merge commit `fc73966`）
- [x] origin に push 済み（36 commits 反映）
- [x] worktree 削除済み

### 主要な学び（Phase 13-F 以降に活用）

1. validator の season スキーマは `start_month` / `end_month`（`from`/`to` ではない）
2. aliases は日本語和名のみ（Latin binomial / 英語 common name は V9 違反）
3. V6: safety=caution/edible は cooking_preservation 必須
4. 大菌輪正典和名と checklist 和名が食い違うケースあり → `tier0-species.json` に `ja_wiki_source_override.title` を追加
5. GBIF シノニム統合との衝突（例: Psilocybe argentipes → subcaerulipes）→ ranking.json に literal 行 + `normalizationStatus: MANUAL`
6. subagent への指示テンプレートで `start_month`/`end_month` と alias 規則を明示するのが初回 NG 率を下げる

### 次フェーズ

Phase 13-F（v2.0 リリース）: `generated/articles/approved/` の 60 件を `src/data/mushrooms.json` に統合、図鑑 UI を v2 スキーマに切替。計画書: `docs/superpowers/plans/2026-04-16-phase13f-v2-release.md`

---

## Phase 13-F: v2.0 リリース — 完了 (2026-04-16)

計画書: `docs/superpowers/plans/2026-04-16-phase13f-v2-release.md`
方針: v1 (300 種) を完全廃棄、v2 (60 種) で `src/data/mushrooms.json` を新規構築

### Step 1-3: スキーマ刷新 + 構築 + 簡易識別停止
- [x] `src/types/mushroom.ts` を v2 schema に置換 (Toxicity → Safety、enum caution/deadly、season array、similar_species を {ja, note, id?, scientific?} 化、sources/caution/notes 追加、traits/verified/source_url/capColor 廃止)
- [x] `src/constants/toxicity.ts` → `safety.ts` リネーム (SAFETY_CONFIG)
- [x] `scripts/phase13/build_v2_mushrooms.mjs` 新設、approved + ranking + tier0 統合 (21 unit tests)
- [x] `src/data/mushrooms.json` を v2 60 種で完全置換 (1,107 KB → 313 KB)
- [x] v1 を `mushrooms-v1-archive.json` として保管 (本体コードは参照しない)
- [x] 簡易識別ページ (`/identify/simple`) を「準備中」プレースホルダ化
- [x] `identify-matcher.ts` / `SimpleIdentifyResult.tsx` / `FeatureSelector.tsx` 削除

### Step 4: IndexedDB v3→v4 マイグレーション
- [x] `src/lib/migrations/v3-to-v4.ts` (純粋関数 + DI、7 unit tests)
- [x] `src/types/migration.ts` 新設、`db.version(4)` で migrations テーブル追加
- [x] AppContext で起動時 hydration 後にマイグレーション実行
- [x] bookmarks: 不一致 ID 削除、records: mushroom_id を null リセット (種名テキストは保持)

### Step 5: UI 改修
- [x] MushroomDetail に sources セクション + cooking/poisoning は HighlightSection (safety palette カード)
- [x] caution box を ad-hoc red から InfoBanner (severity=safety) に置換
- [x] SearchFilter から capColor フィルタセクション削除
- [x] V2ReleaseBanner 新設、layout に挿入 (localStorage で再表示抑止)
- [x] 設定 > お知らせセクション新設、移行詳細 + マイグレーション結果表示

### Step 6: テスト整備
- [x] 全 zukan 関連テストを v2 schema に書き換え
- [x] e2e/zukan.spec.ts を v2 (60 種、amanita_muscaria slug、sources、お知らせ) で更新
- [x] e2e/phase4-simple-identify.spec.ts 削除 (簡易識別停止に伴い)

### Step 7 (Phase 13-G): 画像取得
- [x] `scripts/phase13/fetch_v2_photos.mjs` 新設 (CC ライセンスのみ採用、scientific_synonyms フォールバック、10 unit tests)
- [x] Hero (Wikipedia): 57/60 (95.0%) — 目標 83% を上回る
- [x] iNat (any): 58/60 (96.7%)、(≥5): 56/60 (93.3%)
- [x] 合計画像サイズ: 4,810 KB (60 hero)
- [x] v1 画像 262 件 (21,105 KB) を `public/images/mushrooms/` から削除

### Step 9: アナウンス (Plan A: 起動時バナー + README のみ)
- [x] V2ReleaseBanner で初回起動時に告知
- [x] 設定 > お知らせセクションに恒久掲載
- [x] README.md 新規作成 (v2.0 リリース告知 + データソース掲載)
- 外部告知 (GitHub Release / ブログ / SNS) は実施しない

### UX 修正 (実機確認後)
- [x] 色 text の単一漢字偽陽性修正 (青森県 → 青に下線が引かれる等)
- [x] シノニム 5 件超は折り畳み + 「他 N 件を表示」
- [x] 栞タブのバッジ件数を v2 解決済みカウントに修正

### 検証
- [x] 455/455 unit tests PASS (60 test files)
- [x] next build 成功 (60 v2 species pages、static export)
- [x] dev server 目視確認済

---

## Phase 15: v2.1 実機フィードバック反映 + 簡易識別復活準備 — 進行中 (2026-04-18〜)

v2.1 リリース後のユーザー実機フィードバック (A1〜A8) を反映し、Phase 13-F で停止した簡易識別を大菌輪統制形質ベースで復活させるための調査・計画を行う。

### 15-A: 軽微調整 8 項目 — 完了 (2026-04-18)

- [x] **A1**: 図鑑詳細ページに生物分類 (taxonomy: 目・科・属) セクションを追加
  - `src/components/zukan/MushroomDetail.tsx` に `TaxonomyList` コンポーネント追加
  - 配置は「形態的特徴」→「分類」→「シーズン」の順。mono-data ラベル + 値の 2 列レイアウト
  - `UI_TEXT.zukan.taxonomy / taxonomyOrder / taxonomyFamily / taxonomyGenus` を追加
  - taxonomy を持つ種 111/113 (tier0/tier1 由来、GBIF Backbone ベース)

- [x] **A2**: 設定 > お知らせを折り畳み式 UI に改修
  - 最新 (v2.1) は常時展開、v2.0 / 移行結果は `<details>` 要素でタップ開閉
  - `NoticeEntry` 新設、ChevronDown icon + `group-open:rotate-180` で開閉アニメ
  - キーボード・スクリーンリーダ対応（`<details>` のネイティブ挙動を活用）

- [x] **A3**: バージョン自動更新の仕組み
  - `package.json` の version を 1.0.0 → **2.1.0** に bump（v2.1 リリース反映）
  - `next.config.ts` で `NEXT_PUBLIC_APP_VERSION` / `NEXT_PUBLIC_APP_COMMIT` を build 時注入
  - Vercel の `VERCEL_GIT_COMMIT_SHA` を優先、ローカルは `git rev-parse --short HEAD` fallback
  - `src/constants/app-info.ts` 新設、`APP_VERSION_LABEL = "v2.1.0 (a1b2c3d)"` 形式
  - 設定ページの固定文字列 `UI_TEXT.settings.version` を削除
  - main push 時に commit SHA が自動的に更新される（Vercel 側で毎 build 実行されるため）

- [x] **A5**: 図鑑一覧の並び順デフォルトを五十音 → 食用分類 (`safety`) に変更
  - `src/app/zukan/page.tsx` の `DEFAULT_SORT` を `'kana'` → `'safety'`

- [x] **A6**: 食用分類の順序を「食用→要注意→猛毒→毒→不明→不食」に統一
  - 旧順: edible(0) → caution(1) → inedible(2) → unknown(3) → toxic(4) → deadly(5)
  - 新順: edible(0) → caution(1) → **deadly(2) → toxic(3) → unknown(4) → inedible(5)**
  - 「食用側 → 危険側 → 不明 → 不食」の直感的な並び
  - 影響箇所を全統一: `SAFETY_CONFIG.priority` / `SAFETY_SORT_ORDER` / `SearchFilter` の `SAFETY_ORDER`
  - `safety.test.ts` を新順序で更新

- [x] **A7**: 栞タブのバッジ表示を `(3)` 方式からピル型カウンターに変更
  - `TabButton` に `badge?: number` prop 追加、mono-data + min-w[20px] の円形ピル
  - アクティブ時は washi-cream 背景 / moss-primary 文字、非アクティブ時は moss-primary/20 背景 / moss-light 文字
  - aria-label でカウント読み上げ対応

- [x] **A8**: 季節タブの UI 調整 — キノコ名の表示領域拡張
  - `<table>` レイアウト → `grid-cols-[minmax(0,1fr)_repeat(12,1em)]` CSS Grid に刷新
  - 種名列が可変幅 (1fr) になり、2 行折り返し許容 (`break-words leading-tight`)
  - 月列は 1em 固定（数字 1 桁分）で最小限に圧縮
  - テスト用セレクタを `[data-season-row]` に変更（tbody tr から移行）

### 15-B: 簡易識別復活 (S1 データ調査フェーズ) — 完了 (2026-04-18)

計画書: `docs/superpowers/plans/2026-04-18-phase15-simple-identify-revival.md`

方針: 大菌輪統制形質 (Trait Circus Database, CC BY 4.0) を採用。v1 時代の自作 traits は 300 種手動だったが、v2 は RAG 思想に沿って公開データを利用する。

#### S1 実測結果

- Trait Circus マッチ率: **112 / 113 (99.1%)**
- 肉眼観察可能 trait key 総数: **480** (9 要素 × 厳選属性)
- 種あたり平均 trait key: **53.5** / 中央値 49
- 20 key 以上: 105/112 (93.8%)
- 0 key: 0 種

#### 重要な学び

- **tube (管孔)** は Trait Circus 実データで `hymenophore_*` に完全置換 → schema から削除
- **taste (味) / odor (臭い)** は Trait Circus にほぼ実データ無し (taste 0 件, odor 1 件) → UI 候補から除外
- **fruiting body (子実体)** は 100% カバレッジ、革質種でも識別可能

#### S2 以降 (未着手)

- S2: v2 スキーマに `traits?: string[]` 追加、`build_v2_mushrooms.mjs` 拡張
- S3: 識別エンジン実装 (`identify-matcher-v2.ts`)
- S4: UI 再実装 (`FeatureSelectorV2`, `SimpleIdentifyResultV2`)
- S5: 検証 + e2e テスト

#### S1 成果物

- `scripts/phase15/fetch_species_traits.py` — Trait Circus Parquet 取得 + 113 種抽出
- `scripts/phase15/measure_coverage.mjs` — 肉眼観察可能形質の絞り込み + カバレッジ計測
- `data/phase15/daikinrin-hierarchy.json` — 大菌輪 API 由来の形質階層辞書 (1.6MB)
- `data/phase15/coverage-report.json` — 計測結果
- `.gitignore` 追加: `data/phase15/species-traits-raw.json` (9.4MB 派生データ), `species-traits-visible.json`

### 検証
- [x] 464/464 unit tests PASS（safety 順序テスト + SeasonCalendar セレクタ更新）
- [x] next build 成功 (127 静的ページ)
- [x] 大菌輪統制形質データ 112/113 種マッチ確認済
