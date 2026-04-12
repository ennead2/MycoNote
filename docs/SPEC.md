# キノコ採取・観察ハンドブックアプリ 仕様書

> Claude Code向け開発リファレンス  
> Version 1.0

---

## 目次

1. [概要・目的](#1-概要目的)
2. [機能一覧](#2-機能一覧)
3. [画面構成・ナビゲーション](#3-画面構成ナビゲーション)
4. [データスキーマ](#4-データスキーマ)
5. [技術スタック](#5-技術スタック)
6. [オフライン戦略](#6-オフライン戦略)
7. [API連携仕様](#7-api連携仕様claude-api)
8. [開発フェーズ](#8-開発フェーズ)

---

## 1. 概要・目的

### アプリ概要

キノコの採取・観察活動を総合的にサポートする**オフライン対応PWA**。  
現地での種の確認から採取計画の立案、記録の管理まで対応するデジタルハンドブック。

### 対象ユーザー

- キノコ採取を趣味とする個人
- 自然観察・フォレージングに興味を持つ初心者〜中級者
- 食用キノコの安全な採取を学びたいユーザー

### 開発方針

- 個人開発・趣味プロジェクト、段階的リリース
- **サーバー運用コストゼロ**を原則
- **オフラインファースト**設計
- **安全性最優先**：識別結果には必ず注意書きを表示する

---

## 2. 機能一覧

| 機能カテゴリ | 機能名 | 概要 | オフライン対応 |
|---|---|---|---|
| 図鑑 | キノコ図鑑閲覧 | 写真・生態・生育環境・時期を確認 | ○（代表写真のみ） |
| 図鑑 | シーズンカレンダー | 各種の発生時期を横棒グラフで表示 | ○ |
| 識別 | 簡易識別（オフライン） | TensorFlow.jsによるオンデバイス推論 | ○ |
| 識別 | 詳細識別（オンライン） | Claude Vision APIによる詳細分析 | ×（要通信） |
| 計画 | 採取計画アシスタント | Claude APIと連携した計画立案チャット | ×（要通信） |
| 記録 | 採取記録の登録 | 写真・日時・GPS・メモを記録 | ○ |
| 記録 | 記録の閲覧（地図） | Leaflet地図上に採取記録をプロット | △（地図タイルは要通信） |
| 記録 | 記録の閲覧（図鑑連携） | 図鑑ページから自分の採取記録を参照 | ○ |
| データ | エクスポート | 採取記録をJSON/CSV形式で書き出し | ○ |
| データ | インポート | バックアップからデータを復元 | ○ |

---

## 3. 画面構成・ナビゲーション

### ボトムナビゲーション（5タブ）

| タブ | アイコン | 主な画面 |
|---|---|---|
| 図鑑 | 📖 | キノコ一覧 / キノコ詳細 / シーズンカレンダー |
| 識別 | 🔍 | 識別モード選択 / 簡易識別 / 詳細識別 |
| 計画 | 🗺 | 採取計画チャット（Claude連携） |
| 記録 | 📝 | 記録一覧 / 記録詳細 / 地図ビュー |
| 設定 | ⚙ | APIキー設定 / データ管理 / アプリ情報 |

### 画面詳細

#### 図鑑一覧画面 `/zukan`

- グリッド表示（2列）で代表写真＋和名を表示
- 食用・毒・不食のバッジ表示
- テキスト検索、毒性・季節・発生場所によるフィルター
- 「自分の記録あり」フィルター

#### キノコ詳細画面 `/zukan/[id]`

- 代表写真（同梱）＋追加写真スライダー（キャッシュ）
- 和名・学名・分類（旧学名 synonyms は学名下に `syn.` ラベル付きで併記）
- 毒性ラベル（`食用` / `毒` / `猛毒` / `不食` / `要注意`）
- 生態・形態的特徴・見分け方
- 発生時期（シーズンバー表示）
- よく見られる場所・樹種との関係
- 似ている種（特に誤食注意の毒キノコ）
- この種に紐づく自分の採取記録一覧

#### 識別画面 `/identify`

**⚠️ 重要：簡易識別と詳細識別は明確に異なるUIで提供すること。ユーザーが混同しないよう設計する。自動切り替えは行わない。**

| 項目 | 簡易識別（オフライン） | 詳細識別（オンライン） |
|---|---|---|
| 背景色・テーマ | ダークグリーン系（現地感） | ホワイト系（分析感） |
| 起動方法 | カメラ即時起動 | 写真選択＋送信ボタン |
| 結果表示 | 候補3種＋信頼度バー | 詳細テキスト＋注意点＋類似毒キノコ |
| 注意書き | 「簡易判定：採取判断に使用しないこと」 | 「AI推定：専門家確認を推奨」 |
| 所要時間 | 即時（〜1秒） | 数秒（API通信） |
| エンジン | TensorFlow.js（オンデバイス） | Claude Vision API |

#### 採取計画チャット画面 `/plan`

- Claudeとのチャット形式インターフェース
- 日時・場所・ターゲット種などを会話で入力
- シーズン情報を参照した計画提案
- 過去の採取記録をコンテキストとして提供可能

#### 記録一覧・地図画面 `/records`

- リスト表示と地図表示を切り替え可能
- 地図：Leaflet + OpenStreetMap（オンライン時のみ表示）
- マーカークリックで記録詳細をポップアップ表示
- 種別・日付範囲でフィルター

#### 設定画面 `/settings`

- Anthropic APIキーの入力・保存
- データエクスポート（JSON / CSV）
- データインポート
- キャッシュクリア
- アプリバージョン情報

---

## 4. データスキーマ

### 4.1 図鑑データ `mushrooms.json`

アプリにビルド時同梱。Wikipedia日本語版・Wikimedia Commonsより半自動収集し、手動補完。

```typescript
type Toxicity = 'edible' | 'edible_caution' | 'inedible' | 'toxic' | 'deadly_toxic';

interface Mushroom {
  id: string;                    // slug形式 例: "amanita-phalloides"
  names: {
    ja: string;                  // 和名（日本産菌類集覧を参照、ない場合はAI生成の和名）
    scientific: string;          // 学名（GBIF Backbone Taxonomy の accepted name）
    aliases?: string[];          // 別名・地方名・旧漢字表記
    scientific_synonyms?: string[]; // GBIF で確認された旧学名（検索でヒット、詳細画面に併記）
  };
  toxicity: Toxicity;
  season: {
    start_month: number;         // 1〜12
    end_month: number;           // 1〜12
  };
  habitat: string[];             // 例: ["広葉樹林", "コナラ林"]
  regions: string[];             // 例: ["北海道", "本州", "四国", "九州"]
  image_local: string;           // 同梱WebP画像のパス
  images_remote: string[];       // 追加写真URL（Wikimedia Commons等）
  description: string;           // 生態・概要
  features: string;              // 形態的特徴・見分け方
  similar_species: string[];     // 似ている種のid
  caution?: string;              // 注意事項（毒種は必須）
  tree_association?: string[];   // 共生・寄生する樹種
  source_url?: string;           // データ出典URL
}
```

#### toxicityの値と意味

| 値 | 意味 |
|---|---|
| `edible` | 食用 |
| `edible_caution` | 食用（要注意・処理必要） |
| `inedible` | 不食 |
| `toxic` | 毒（中毒症状あり） |
| `deadly_toxic` | 猛毒（死亡例あり） |

### 4.2 採取記録 `IndexedDB` — テーブル名: `records`

```typescript
interface MushroomRecord {
  id: string;                    // UUID v4
  mushroom_id?: string;          // 図鑑のid（不明な場合はnull）
  mushroom_name_ja?: string;     // 和名（図鑑未収録種のメモ用）
  observed_at: string;           // ISO 8601形式
  location: {
    lat: number;
    lng: number;
    description?: string;        // 例: "高尾山 6号路付近"
  };
  photos: string[];              // IndexedDB内のBlobキー
  quantity?: string;             // 例: "3本"
  memo?: string;
  harvested: boolean;            // 採取したか観察のみか
  tags?: string[];
  created_at: string;            // ISO 8601形式
  updated_at: string;            // ISO 8601形式
}
```

### 4.3 設定データ `localStorage`

```typescript
interface AppSettings {
  anthropic_api_key?: string;
  preferred_regions?: string[];  // よく行く地域
  theme?: 'light' | 'dark' | 'system';
}
```

---

## 5. 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | PWA対応、静的エクスポート |
| 言語 | TypeScript | 全ファイルに適用 |
| スタイリング | Tailwind CSS | ユーティリティファースト |
| PWA | next-pwa / Workbox | Service Worker管理 |
| ローカルDB | IndexedDB (Dexie.js) | 採取記録の永続化 |
| 地図 | Leaflet + React-Leaflet | OpenStreetMap使用 |
| オフライン識別 | TensorFlow.js | オンデバイス推論（Phase 4） |
| AI連携 | Anthropic Claude API | 詳細識別・採取計画 |
| 写真ストレージ | IndexedDB (Blob) | 採取写真のローカル保存 |
| エクスポート | file-saver + Papa Parse | JSON/CSV出力 |

### ディレクトリ構成

```
/
├── app/                          # Next.js App Router
│   ├── zukan/
│   │   ├── page.tsx              # 図鑑一覧
│   │   └── [id]/page.tsx         # キノコ詳細
│   ├── identify/
│   │   ├── page.tsx              # 識別モード選択
│   │   ├── simple/page.tsx       # 簡易識別（オフライン）
│   │   └── detail/page.tsx       # 詳細識別（Claude）
│   ├── plan/page.tsx             # 採取計画チャット
│   ├── records/
│   │   ├── page.tsx              # 記録一覧・地図
│   │   └── [id]/page.tsx         # 記録詳細
│   └── settings/page.tsx         # 設定
├── components/
│   ├── layout/                   # BottomNav等の共通レイアウト
│   ├── zukan/                    # 図鑑関連コンポーネント
│   ├── identify/                 # 識別関連コンポーネント
│   ├── records/                  # 記録関連コンポーネント
│   └── ui/                       # 汎用UIコンポーネント
├── lib/
│   ├── db.ts                     # Dexie.js IndexedDB設定
│   ├── claude.ts                 # Claude API クライアント
│   └── tfjs.ts                   # TensorFlow.js ラッパー
├── data/
│   └── mushrooms.json            # 図鑑データ（ビルド時同梱）
├── public/
│   └── images/mushrooms/         # 代表写真WebP（同梱）
└── scripts/
    └── collect-data.ts           # 図鑑データ収集スクリプト
```

---

## 6. オフライン戦略

### Service Workerキャッシュ戦略

| リソース | 戦略 | 詳細 |
|---|---|---|
| アプリシェル（HTML/JS/CSS） | Cache First | インストール時にキャッシュ |
| 図鑑JSON | Cache First | ビルド時同梱、更新時のみ再取得 |
| 代表写真（WebP） | Cache First | アプリ同梱（目安：〜24MB） |
| 追加写真 | Stale While Revalidate | 閲覧時にキャッシュ、次回はキャッシュ優先 |
| 地図タイル | Network First | オフライン時はキャッシュ表示 |
| Claude API | Network Only | オフライン時は機能無効表示 |
| TensorFlow.jsモデル | Cache First | 初回DL後はオフライン動作 |

### オフライン時のUI方針

- オフライン状態はヘッダーバナーで常時通知
- オンライン必須機能（Claude API・地図）はグレーアウト＋理由を表示
- 採取記録の新規登録はオフラインでも**完全動作**（GPS取得含む）
- 写真未キャッシュの種はプレースホルダー表示

---

## 7. API連携仕様（Claude API）

### APIキー管理

- ユーザーが設定画面でAnthropicのAPIキーを入力・保存
- `localStorage` の `anthropic_api_key` キーに保存
- APIキー未設定時はClaude連携機能（識別・計画）を非表示にする

### 7.1 詳細識別

| 項目 | 仕様 |
|---|---|
| モデル | `claude-opus-4-5`（Vision対応） |
| 入力 | 画像（Base64）＋図鑑収録種リスト（id・和名・学名） |
| 出力形式 | JSON `{ candidates: [{id, name, confidence, reason}], cautions: string[], similar_toxic: string[] }` |
| 注意書き | 必ず「AI推定・専門家確認推奨」を画面上に付記 |
| エラー処理 | API失敗時はエラーメッセージ表示、リトライボタン表示 |

#### システムプロンプト（詳細識別）

```
あなたはキノコの識別を補助するアシスタントです。
提供された写真と図鑑データをもとに、可能性のあるキノコの種類を提示してください。

【重要な制約】
- 断定的な識別は行わない
- 必ず複数の候補を提示する
- 毒キノコの可能性がある場合は必ず警告する
- 採取の最終判断は専門家または経験者に委ねるよう案内する

出力は必ず以下のJSON形式で返してください：
{
  "candidates": [
    { "id": "図鑑ID or null", "name_ja": "和名", "confidence": "high|medium|low", "reason": "根拠" }
  ],
  "cautions": ["注意点の配列"],
  "similar_toxic": ["似ている毒キノコの和名の配列"]
}
```

### 7.2 採取計画アシスタント

| 項目 | 仕様 |
|---|---|
| モデル | `claude-sonnet-4-5` |
| 会話形式 | マルチターン（セッション中はフルヒストリーを保持） |
| コンテキスト注入 | ユーザーの過去採取記録サマリー＋現在のシーズン情報 |
| 出力 | 自然言語（採取計画・注意点・おすすめスポット等） |

#### システムプロンプト（採取計画）

```
あなたはキノコ採取の安全なアドバイザーです。
ユーザーの採取計画立案を、安全を最優先にサポートしてください。

【コンテキスト】
現在の月: {{current_month}}
ユーザーの過去の採取記録: {{records_summary}}

【ガイドライン】
- 毒キノコとの誤認リスクについて積極的に言及する
- 採取が禁止されているエリア（国立公園等）への注意を促す
- 天気・装備・同行者についても適切にアドバイスする
- 不確かな情報は断定せず、確認を促す
```

---

## 8. 開発フェーズ

### フェーズ一覧

| フェーズ | 名称 | 主な機能 |
|---|---|---|
| Phase 1 | MVP | 図鑑閲覧・検索、シーズンカレンダー、PWA基盤 |
| Phase 2 | 記録機能 | 採取記録登録（GPS・写真・メモ）、地図表示、図鑑連携 |
| Phase 3 | AI連携 | 詳細識別（Claude Vision）、採取計画チャット |
| Phase 4 | 識別強化 | TensorFlow.jsオフライン識別、簡易識別UI |
| Phase 5 | 仕上げ | エクスポート/インポート、パフォーマンス最適化 |

### Phase 1 詳細：図鑑データ収集手順

1. 収録種リストの確定（厚労省毒キノコリスト＋iNaturalist観察数上位＋主要食用種）
2. Wikipedia日本語版 MediaWiki APIで説明文・分類情報を自動取得
3. Wikimedia CommonsよりCC BY-SA写真を取得（**ライセンス確認必須**）
4. 代表写真をWebP変換・リサイズ（最大800px、目安〜80KB/枚）
5. シーズン・毒性・生育地などの構造化データを手動補完
6. `mushrooms.json` として最終化しアプリに同梱

### 各フェーズの完了条件

#### Phase 1 完了条件
- [ ] Next.js PWAとしてインストール可能
- [ ] `mushrooms.json` に最低100種収録
- [ ] 図鑑一覧・詳細・検索・フィルターが動作
- [ ] シーズンカレンダーが表示される
- [ ] オフラインで基本機能が動作する

#### Phase 2 完了条件
- [ ] GPS付きで採取記録を登録できる
- [ ] 記録に写真（複数枚）を添付できる
- [ ] 地図上に記録がプロットされる
- [ ] 図鑑詳細ページに自分の記録が表示される

#### Phase 3 完了条件
- [ ] APIキーを設定すると識別・計画機能が有効になる
- [ ] 写真をアップロードしてClaudeによる識別結果が表示される
- [ ] 識別結果に必ず注意書きが表示される
- [ ] チャット形式で採取計画を立てられる

#### Phase 4 完了条件
- [ ] オフライン状態でカメラから簡易識別できる
- [ ] 簡易識別と詳細識別のUIが明確に区別されている
- [ ] 簡易識別の注意書きが適切に表示される

#### Phase 5 完了条件
- [ ] 採取記録をJSON/CSVでエクスポートできる
- [ ] エクスポートしたデータをインポートして復元できる
- [ ] Lighthouseスコア：Performance 90+、PWA 100

---

## 注意事項・開発上の制約

### 安全性に関する絶対ルール

- **識別結果には必ず注意書きを表示する**（省略不可）
- 簡易識別と詳細識別を**自動で切り替えない**（ユーザーが明示的に選択）
- 毒キノコ情報は**過小表示しない**（毒性ラベルは常に目立つ位置に表示）

### 分類体系の正典（Phase 12 以降）

学名と和名の正典を以下のとおり定める。検証時に各ソース間で不整合があった場合、この優先順位に従って解決する。

| 項目 | 一次ソース | 目的 |
|---|---|---|
| 学名 (accepted name) | **GBIF Backbone Taxonomy** (`api.gbif.org/v1/species/match`) | シノニム解決・分類階層の付与 |
| 学名シノニム | **GBIF** `/species/{key}/synonyms` | 旧名保持・検索ヒット |
| 和名 | **日本産菌類集覧** (日本菌学会, CC BY 4.0) | 国内正式和名の裏取り |
| 分類階層 (order/family/genus) | **GBIF Backbone** | taxonomy フィールドの充填 |
| 生態・特徴テキスト | Wikipedia ja/en + kinoco-zukan.net | description / features の補強 |

- GBIF の `matchType === "EXACT"` かつ `confidence >= 90` を自動適用の閾値とする
- FUZZY / HIGHERRANK / NONE は `docs/verification-issues.md` に記録し人間レビュー
- 学名が SYNONYM として再分類された場合、旧学名は `names.scientific_synonyms[]` に保持し検索対象に含める（ユーザーが旧学名で検索してもヒットさせる）

### ライセンス・著作権

- 図鑑写真はCC BY / CC BY-SAのものを使用し、出典を記録する
- Wikipedia由来のテキストはCC BY-SA 4.0に従いライセンス表記を行う
- iNaturalistの写真は個別にライセンスを確認（CC BY-NDやAll Rights Reservedは使用不可）
- 日本産菌類集覧（日本菌学会）は CC BY 4.0 に従い出典表記（`docs/credits.md`）

### パフォーマンス目標

- 初回インストールサイズ：〜30MB以下（代表写真込み）
- 図鑑一覧の初期表示：2秒以内
- 採取記録登録（オフライン）：即時

---

*最終更新：2025年*
