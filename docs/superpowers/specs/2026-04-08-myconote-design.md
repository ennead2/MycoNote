# MycoNote 詳細設計書

> キノコ採取・観察ハンドブック PWA  
> Version 1.0  
> 作成日: 2026-04-08  
> ベース仕様: docs/SPEC.md

---

## 1. 概要

キノコの採取・観察活動を総合的にサポートするオフライン対応PWA。
個人利用を主とし、開発に明るい友人数名への配布も想定する。

### 設計原則

- サーバー運用コストゼロ（Static Export、静的ホスティング）
- オフラインファースト
- 安全性最優先（識別結果の注意書き必須、毒性情報を過小表示しない）
- OOP + TDD ワークフロー

---

## 2. 技術スタック

| 項目 | 選択 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router, Static Export) | サーバーコストゼロ、PWA対応 |
| 言語 | TypeScript (strict) | 型安全性 |
| スタイリング | Tailwind CSS | ユーティリティファースト |
| PWA | `@ducanh2912/next-pwa` | next-pwa後継、Next.js 15対応 |
| ローカルDB | Dexie.js (IndexedDB) | 採取記録・写真のローカル永続化 |
| 状態管理 | React Context + useReducer | 軽量、追加依存なし |
| 地図 | React-Leaflet + OpenStreetMap | 無料、オフラインキャッシュ可 |
| AI連携 | Anthropic Claude API（ブラウザ直接通信） | サーバー不要、キー安全 |
| オフライン識別 | TensorFlow.js (Phase 4) | 既存公開モデル転用 |
| テスト | Vitest + React Testing Library + Playwright | TDDワークフロー |
| UIテキスト | 日本語、定数ファイル分離 | 将来の多言語化に最小コストで備える |
| デザインテーマ | ナチュラル・フォレスト（ダークグリーン基調） | 自然・フィールドワーク感 |

---

## 3. アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────┐
│              Static Hosting                  │
│         (Cloudflare Pages / Vercel)          │
│    HTML + JS + CSS + mushrooms.json + 写真    │
└──────────────────┬──────────────────────────┘
                   │ ダウンロード（初回のみ）
                   ▼
┌─────────────────────────────────────────────┐
│            ユーザーのブラウザ (PWA)            │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 図鑑閲覧  │  │ 識別機能  │  │ 採取記録  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │         │
│  ┌────▼─────────────▼─────────────▼─────┐  │
│  │          React Context (状態管理)      │  │
│  └────┬─────────────┬─────────────┬─────┘  │
│       │             │             │         │
│  ┌────▼────┐  ┌─────▼─────┐  ┌───▼──────┐ │
│  │ 図鑑JSON │  │ IndexedDB  │  │localStorage│ │
│  │(バンドル) │  │(Dexie.js)  │  │(設定/APIキー)│ │
│  └─────────┘  └───────────┘  └──────────┘ │
│                     │                       │
│              Service Worker                 │
│           (キャッシュ・オフライン)             │
└──────────────────┬──────────────────────────┘
                   │ オンライン時のみ
          ┌────────┼────────┐
          ▼        ▼        ▼
     Claude API   OSM地図  Wikimedia
     (識別/計画)  タイル    (追加写真)
```

### APIキーのセキュリティ

Static Export構成により、APIキーの安全性が構造的に保証される：

- サーバーが存在しない = 開発者が間に割り込む仕組み自体がない
- APIキーはユーザーのブラウザのlocalStorageにのみ保存
- API呼び出しはブラウザからAnthropicへ直接通信
- 友人はDevToolsで通信先を検証可能（信頼の根拠）

---

## 4. ディレクトリ構成

```
src/
├── app/                          # Next.js App Router (ページ)
│   ├── layout.tsx                # ルートレイアウト (BottomNav, オフラインバナー)
│   ├── page.tsx                  # / → /zukan にリダイレクト
│   ├── zukan/
│   │   ├── page.tsx              # 図鑑一覧
│   │   └── [id]/page.tsx         # キノコ詳細
│   ├── identify/
│   │   ├── page.tsx              # 識別モード選択
│   │   ├── simple/page.tsx       # 簡易識別 (Phase 4)
│   │   └── detail/page.tsx       # 詳細識別 (Claude Vision)
│   ├── plan/page.tsx             # 採取計画チャット
│   ├── records/
│   │   ├── page.tsx              # 記録一覧 + 地図
│   │   ├── new/page.tsx          # 記録新規登録
│   │   └── [id]/page.tsx         # 記録詳細・編集
│   └── settings/page.tsx         # 設定
│
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx         # 5タブナビゲーション
│   │   ├── OfflineBanner.tsx     # オフライン状態通知バナー
│   │   └── PageHeader.tsx        # ページタイトル・戻るボタン
│   ├── zukan/
│   │   ├── MushroomCard.tsx      # 図鑑一覧のグリッドカード
│   │   ├── MushroomDetail.tsx    # 詳細表示 (写真・情報・類似種)
│   │   ├── ToxicityBadge.tsx     # 毒性ラベル (食用/毒/猛毒...)
│   │   ├── SeasonBar.tsx         # 発生時期の横棒グラフ
│   │   ├── SeasonCalendar.tsx    # シーズンカレンダー全体
│   │   └── SearchFilter.tsx      # テキスト検索 + フィルター
│   ├── identify/
│   │   ├── ModeSelector.tsx      # 簡易/詳細の選択UI
│   │   ├── DetailIdentify.tsx    # Claude Vision識別フォーム・結果
│   │   └── SimpleIdentify.tsx    # TF.jsカメラ識別 (Phase 4)
│   ├── records/
│   │   ├── RecordCard.tsx        # 記録一覧のカード
│   │   ├── RecordForm.tsx        # 記録登録・編集フォーム
│   │   ├── RecordMap.tsx         # Leaflet地図ビュー
│   │   └── PhotoPicker.tsx       # 写真撮影・選択
│   ├── plan/
│   │   ├── PlanHearing.tsx       # 構造化ヒアリングフォーム
│   │   ├── ChatWindow.tsx        # チャットメッセージ一覧
│   │   └── ChatInput.tsx         # 入力欄 + 送信ボタン
│   └── ui/
│       ├── Button.tsx            # 共通ボタン
│       ├── Badge.tsx             # 汎用バッジ
│       ├── Modal.tsx             # モーダルダイアログ
│       ├── ImageSlider.tsx       # 写真スライダー
│       └── LoadingSpinner.tsx    # ローディング表示
│
├── contexts/
│   ├── AppContext.tsx            # アプリ全体の状態 (オンライン状態, 設定)
│   └── RecordsContext.tsx        # 採取記録の状態 (CRUD, フィルター)
│
├── lib/
│   ├── db.ts                    # Dexie.js DB定義・マイグレーション
│   ├── claude.ts                # Claude APIクライアント (識別・計画)
│   ├── tfjs.ts                  # TensorFlow.jsラッパー (Phase 4)
│   ├── geolocation.ts           # GPS取得ユーティリティ
│   ├── photo.ts                 # 写真の圧縮・Blob変換
│   └── export.ts                # JSON/CSVエクスポート・インポート
│
├── constants/
│   ├── ui-text.ts               # UIテキスト定数 (日本語)
│   ├── toxicity.ts              # 毒性定義・ラベル・色マッピング
│   └── theme.ts                 # カラーテーマ定数 (ナチュラルフォレスト)
│
├── types/
│   ├── mushroom.ts              # Mushroom, Toxicity 型定義
│   ├── record.ts                # MushroomRecord 型定義
│   └── settings.ts              # AppSettings 型定義
│
├── data/
│   ├── mushrooms.json           # 図鑑データ (ビルド時同梱)
│   └── mushrooms.ts             # 図鑑データラッパー (検索・フィルター)
│
└── public/
    ├── images/mushrooms/         # 代表写真 WebP
    ├── manifest.json             # PWAマニフェスト
    └── icons/                    # PWAアイコン各サイズ
```

### 設計ポイント

- `src/` ディレクトリパターン採用（Next.js推奨）
- ページは薄く、ロジックはコンポーネントとlibに分離
- Context は2つのみ（AppContext, RecordsContext）
- 図鑑データは静的importで十分なのでContextに入れない
- `constants/ui-text.ts` に全UIテキスト集約（将来i18n対応の布石）
- `types/` で SPEC.md のデータスキーマを型定義として管理

---

## 5. データフロー & 状態管理

### データの種類と保存先

| データ | 保存先 | アクセス方法 |
|---|---|---|
| 図鑑データ (不変) | mushrooms.json (バンドル) | TSモジュールで静的import |
| 採取記録 (CRUD) | IndexedDB (Dexie.js) | RecordsContext経由 |
| 設定・APIキー | localStorage | AppContext経由 |

### 図鑑データモジュール

```typescript
// data/mushrooms.ts
import mushroomsRaw from './mushrooms.json';
import type { Mushroom } from '@/types/mushroom';

export const mushrooms: Mushroom[] = mushroomsRaw as Mushroom[];

// FilterOptions は types/mushroom.ts に定義
export function searchMushrooms(query: string, filters: FilterOptions): Mushroom[] { ... }
export function getMushroomById(id: string): Mushroom | undefined { ... }
export function getMushroomsBySeason(month: number): Mushroom[] { ... }
```

### AppContext

```typescript
interface AppState {
  isOnline: boolean;
  apiKey: string | null;
  preferredRegions: string[];
  theme: 'light' | 'dark' | 'system';
}

type AppAction =
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_API_KEY'; payload: string | null }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' };
```

- `navigator.onLine` + `online/offline`イベントでリアルタイム監視
- 設定変更時はlocalStorageにも同期書き込み
- 初回マウント時にlocalStorageから復元

### RecordsContext

```typescript
interface RecordsState {
  records: MushroomRecord[];
  isLoading: boolean;
  filters: {
    mushroomId?: string;
    dateRange?: { start: string; end: string };
    tags?: string[];
  };
}

type RecordsAction =
  | { type: 'SET_RECORDS'; payload: MushroomRecord[] }
  | { type: 'ADD_RECORD'; payload: MushroomRecord }
  | { type: 'UPDATE_RECORD'; payload: MushroomRecord }
  | { type: 'DELETE_RECORD'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<RecordsState['filters']> }
  | { type: 'SET_LOADING'; payload: boolean };
```

- Dexie.jsとの同期: dispatch → Dexie書き込み → 成功したらstate更新
- 写真はBlobとしてIndexedDBの`record_photos`テーブルに別途保存
- recordの`photos`フィールドはBlobキーの配列

---

## 6. Claude API通信設計

### 詳細識別

```
ユーザーが写真を選択
  → Base64変換
  → コンパクト種リスト構築 (id|和名|学名|毒性 の軽量形式、~2,500トークン)
  → Anthropic API (claude-opus-4-5) にPOST
  → JSONレスポンスをパース → 候補のidでローカル図鑑データを引き詳細表示
  → 注意書きを常時表示
```

コンパクト種リスト形式（100種でも約2,500トークンに収まる）:
```
matsutake|マツタケ|Tricholoma matsutake|edible
tamago-tengu-take|タマゴテングタケ|Amanita phalloides|deadly_toxic
```

### 採取計画アシスタント（ハイブリッド方式）

```
ステップ1: 構造化ヒアリング（UI側、APIコール不要）
  - いつ？ (日付ピッカー)
  - どこ？ (地域選択 + 自由入力)
  - 対象？ (図鑑から種を選択)
  - 経験？ (初心者/中級者/経験者)
  - メモ  (自由記入欄)

ステップ2: 自動コンテキスト構築（バックグラウンド）
  - ヒアリング結果を整形
  - 選択地域・時期の旬の種をシーズンデータから抽出
  - 過去の採取記録サマリーを付与
  → システムプロンプトに注入

ステップ3: Claudeとの自由チャット (claude-sonnet-4-5)
  - マルチターン（セッション中はフルヒストリー保持）
  - レスポンスのストリーミング対応
```

### エラーハンドリング

```typescript
class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean
  ) { ... }
}
```

| HTTPステータス | 対応 |
|---|---|
| 401/403 | リトライしない。「APIキーが無効です」+ 設定リンク |
| 429 | 指数バックオフで最大3回リトライ |
| 500/503 | 1回だけリトライ |
| ネットワークエラー | リトライボタン表示（自動リトライしない） |

---

## 7. オフライン戦略

### Service Workerキャッシュ構成

**Precache（インストール時）:**
- アプリシェル (HTML/JS/CSS)
- mushrooms.json
- 代表写真 WebP
- PWAマニフェスト・アイコン

**Runtime Cache（利用時）:**
- 追加写真 (Wikimedia) → StaleWhileRevalidate
- 地図タイル (OSM) → NetworkFirst
- TF.jsモデル (Phase 4) → CacheFirst

**Network Only:**
- Claude API

### オフライン時のUI動作

| 画面 | オフライン動作 | 制限事項 |
|---|---|---|
| 図鑑一覧・詳細 | 完全動作 | 追加写真が未キャッシュならプレースホルダー |
| シーズンカレンダー | 完全動作 | なし |
| 簡易識別 (Phase 4) | 完全動作 | TF.jsモデル初回DL後 |
| 詳細識別 | 利用不可 | グレーアウト + 理由表示 |
| 採取計画チャット | 入力まで可 | ヒアリングはオフラインOK、送信は不可 |
| 記録登録 | 完全動作 | GPS取得含む |
| 記録一覧(リスト) | 完全動作 | なし |
| 記録一覧(地図) | 制限あり | キャッシュ済みタイルのみ表示 |
| 設定 | 完全動作 | なし |
| エクスポート/インポート | 完全動作 | なし |

### オフラインバナー

- オフライン時: ページ上部に固定バナー「オフラインモード — 一部機能が制限されています」
- 復帰時: 「オンラインに復帰しました」を3秒間表示して消える

### 初回インストールサイズ見積もり

| リソース | サイズ |
|---|---|
| アプリシェル | ~2MB |
| mushrooms.json (20種) | ~50KB |
| 代表写真 (20種 x ~80KB) | ~1.6MB |
| アイコン・マニフェスト | ~100KB |
| **合計** | **~4MB** |

100種に拡大しても ~12MB。目標30MB以下に十分収まる。

---

## 8. 安全性設計

### 3つの絶対ルール

1. **識別結果には必ず注意書きを表示する**（省略不可、閉じるボタンなし）
2. **簡易識別と詳細識別を自動で切り替えない**（ユーザーが明示的に選択）
3. **毒キノコ情報は過小表示しない**（毒性ラベルは常に目立つ位置に表示）

### 毒性ラベル設計

```typescript
export const TOXICITY_CONFIG = {
  edible:        { label: '食用',   color: 'bg-green-600',  icon: '✓', priority: 0 },
  edible_caution:{ label: '要注意', color: 'bg-yellow-600', icon: '⚠', priority: 1 },
  inedible:      { label: '不食',   color: 'bg-gray-500',   icon: '—', priority: 2 },
  toxic:         { label: '毒',     color: 'bg-orange-600', icon: '⚠', priority: 3 },
  deadly_toxic:  { label: '猛毒',   color: 'bg-red-600',    icon: '☠', priority: 4 },
} as const;
```

- `toxic`・`deadly_toxic`はバッジを大きく表示
- `caution`フィールドがある場合、赤枠の警告ボックスで表示
- 識別結果に毒キノコ候補がある場合、結果リスト最上部に警告バナー

### 注意書き（常時表示・非dismissible）

- 簡易識別: 「これは簡易判定です。採取の判断に使用しないでください。」
- 詳細識別: 「AI推定による参考情報です。専門家または経験者による確認を推奨します。」

### その他のエラーハンドリング

| エラー種別 | 対応 |
|---|---|
| APIキー未設定 | Claude機能を非活性化、設定リンク表示 |
| GPS取得失敗 | 手動位置入力にフォールバック |
| カメラアクセス拒否 | ファイル選択にフォールバック |
| IndexedDB容量超過 | 古い写真の整理を促す |
| 写真読み込み失敗 | プレースホルダー表示 |

---

## 9. テスト戦略

### テストピラミッド

| レイヤー | ツール | 対象 |
|---|---|---|
| 単体テスト | Vitest | lib/, constants/, contexts/ reducer |
| 統合テスト | Vitest + React Testing Library | コンポーネント間連携 |
| E2Eテスト | Playwright | ユーザーフロー全体 |

### テストツール

| ツール | 用途 |
|---|---|
| Vitest | 単体・統合テスト |
| React Testing Library | コンポーネントテスト |
| msw (Mock Service Worker) | Claude API呼び出しのモック |
| fake-indexeddb | Dexie.jsのテスト用メモリDB |
| Playwright | E2Eテスト + MCPサーバーでの自動実行 |

### TDDサイクル

```
Red → Green → Refactor → AI Code Review → 次のテストへ
```

### 節目テスト（各Phase完了時）

1. 全テストスイート実行 (`npm test`)
2. Playwright MCPサーバーでブラウザ自動テスト
3. ユーザーにテスト項目リストを提示し手動確認を依頼

---

## 10. 開発フェーズ（SPEC.md準拠）

| Phase | 名称 | 主な機能 |
|---|---|---|
| Phase 1 | MVP | 図鑑閲覧・検索、シーズンカレンダー、PWA基盤 |
| Phase 2 | 記録機能 | 採取記録登録（GPS・写真・メモ）、地図表示、図鑑連携 |
| Phase 3 | AI連携 | 詳細識別（Claude Vision）、採取計画チャット |
| Phase 4 | 識別強化 | TensorFlow.jsオフライン識別、簡易識別UI |
| Phase 5 | 仕上げ | エクスポート/インポート、パフォーマンス最適化 |

図鑑データは開発初期は10〜20種のサンプルデータで進め、アプリ完成後に100種へ拡充する。

---

## 11. ライセンス

- 図鑑写真: CC BY / CC BY-SA のものを使用し、出典を記録
- Wikipedia由来テキスト: CC BY-SA 4.0に従いライセンス表記
- iNaturalist写真: 個別ライセンス確認（CC BY-NDやAll Rights Reservedは使用不可）
