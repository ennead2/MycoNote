# Phase 3: AI連携 — 設計書

> MycoNote Phase 3 設計リファレンス
> Version 1.0 — 2026-04-09

---

## 1. 概要

Phase 3はMycoNoteにClaude API連携を追加し、以下の2機能を提供する。

- **詳細識別**: 写真からキノコの種類をAIが推定する
- **採取計画チャット**: 安全な採取計画をAIと対話形式で立案する

### スコープ

| 含まれる | 含まれない |
|---------|-----------|
| Claude APIクライアント (`fetch`ベース) | 簡易識別 (Phase 4) |
| 詳細識別画面 (複数枚写真対応) | TensorFlow.js (Phase 4) |
| 識別モード選択画面 | エクスポート/インポート (Phase 5) |
| 採取計画チャット (ストリーミング) | |
| チャット履歴のIndexedDB永続化 | |
| APIキー設定UI | |

### 前提条件

- Static Export (サーバーなし) — ブラウザから直接Anthropic APIを呼び出す
- 各ユーザーが自分のAPIキーを設定画面で入力して使用する
- APIキーは `localStorage` に保存（サーバーに送信されない）

---

## 2. アーキテクチャ

### 新規・変更ファイル

```
src/
├── lib/
│   ├── claude.ts              # [新規] Claude APIクライアント
│   └── db.ts                  # [変更] chatSessionsテーブル追加
├── types/
│   └── chat.ts                # [新規] チャット・識別関連の型定義
├── constants/
│   ├── prompts.ts             # [新規] システムプロンプト定数
│   └── ui-text.ts             # [変更] Phase 3用テキスト追加
├── components/
│   ├── identify/
│   │   ├── PhotoUploader.tsx   # [新規] 複数枚写真選択・プレビュー
│   │   └── IdentifyResult.tsx  # [新規] 識別結果表示
│   └── plan/
│       ├── PlanForm.tsx        # [新規] 構造化ヒアリングフォーム
│       ├── ChatMessage.tsx     # [新規] チャットメッセージバブル
│       ├── ChatInput.tsx       # [新規] メッセージ入力欄
│       └── ChatHistory.tsx     # [新規] チャット履歴一覧
├── app/
│   ├── identify/
│   │   ├── page.tsx            # [変更] モード選択画面に書き換え
│   │   └── detail/page.tsx     # [新規] 詳細識別画面
│   ├── plan/page.tsx           # [変更] 採取計画画面に書き換え
│   └── settings/page.tsx       # [変更] APIキー設定セクション追加
```

### データフロー

```
[設定画面] → localStorage に APIキー保存
                ↓
[詳細識別] 写真選択 → Base64変換 → claude.ts → Anthropic API → JSON結果表示
                ↓
[採取計画] フォーム入力 → コンテキスト構築 → claude.ts → ストリーミング応答 → IndexedDB保存
```

### APIキー管理

- `localStorage.getItem('anthropic_api_key')` で読み取り
- `lib/claude.ts` の各関数がキーを引数で受け取る（グローバル状態に依存しない）
- キー未設定時: 識別タブ・計画タブで「APIキーを設定してください」＋設定画面へのリンク表示

---

## 3. Claude APIクライアント (`lib/claude.ts`)

### 方式

`fetch` で `https://api.anthropic.com/v1/messages` を直接呼び出す薄いラッパー。
Anthropic SDKは使用しない（ブラウザ直接呼び出しとの相性・バンドルサイズの観点）。

### CORSヘッダー

ブラウザからの直接呼び出しには `anthropic-dangerous-direct-browser-access: true` ヘッダーが必要。

### 関数

```typescript
// APIキー取得
getApiKey(): string | null

// 詳細識別（通常レスポンス）
identifyMushroom(params: {
  apiKey: string;
  images: Base64Image[];
  mushroomList: CompactMushroom[];
}): Promise<IdentifyResult>

// 採取計画チャット（ストリーミング）
streamPlanChat(params: {
  apiKey: string;
  messages: ChatMessage[];
  context: PlanContext;
  onChunk: (text: string) => void;
}): Promise<void>
```

### モデル

| 機能 | モデル | 理由 |
|------|--------|------|
| 詳細識別 | `claude-opus-4-6` | 最高精度のVision対応 |
| 採取計画チャット | `claude-sonnet-4-6` | 高速・低コスト |

### エラーハンドリング

| HTTPステータス | ユーザー向けメッセージ |
|---------------|---------------------|
| 401 | APIキーが無効です。設定画面で確認してください。 |
| 429 | リクエストが多すぎます。しばらく待ってから再試行してください。 |
| 500+ | サーバーエラーが発生しました。再試行してください。 |
| ネットワークエラー | オフラインのためAI機能を使用できません。 |

各画面にリトライボタンを表示する。

---

## 4. 型定義 (`types/chat.ts`)

```typescript
interface Base64Image {
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface CompactMushroom {
  id: string;
  name_ja: string;
  scientific: string;
  toxicity: string;
}

interface IdentifyResult {
  candidates: IdentifyCandidate[];
  cautions: string[];
  similar_toxic: string[];
}

interface IdentifyCandidate {
  id: string | null;
  name_ja: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanContext {
  date?: string;
  location?: string;
  targetSpecies?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  currentMonth: number;
  recordsSummary: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: PlanContext;
  created_at: string;
  updated_at: string;
}
```

---

## 5. システムプロンプト (`constants/prompts.ts`)

### 詳細識別

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

### 採取計画

```
あなたはキノコ採取の安全なアドバイザーです。
ユーザーの採取計画立案を、安全を最優先にサポートしてください。

【コンテキスト】
現在の月: {{current_month}}
予定日: {{date}}
場所: {{location}}
ターゲット種: {{target_species}}
経験レベル: {{experience_level}}
ユーザーの過去の採取記録: {{records_summary}}

【ガイドライン】
- 毒キノコとの誤認リスクについて積極的に言及する
- 採取が禁止されているエリア（国立公園等）への注意を促す
- 天気・装備・同行者についても適切にアドバイスする
- 不確かな情報は断定せず、確認を促す
```

---

## 6. 画面設計

### 6.1 識別モード選択画面 (`/identify`)

- フォレストテーマ（ダークグリーン）
- **詳細識別カード**: ホワイト系背景で「オンライン・Claude AI」タグ付き。タップで `/identify/detail` へ遷移
- **簡易識別カード**: ダーク系背景・半透明 (opacity: 0.5)、「Phase 4で追加予定」タグ表示、タップ無効
- 「要オンライン」「要APIキー」のタグで前提条件を明示
- 画面下部に注意書き: 「どちらの識別もAIによる推定です。採取の最終判断は必ず専門家または経験者に確認してください。」
- APIキー未設定時: 詳細識別カードに「APIキーを設定してください」＋設定画面リンク表示

### 6.2 詳細識別画面 (`/identify/detail`)

テーマ: **ホワイト系**（分析感のあるクリーンなUI）

#### 入力状態
- 上部に注意書き（黄色左ボーダー）: 「AI推定です。採取の最終判断は専門家に確認してください。」
- 写真選択エリア: グリッド表示、+ボタンでカメラ/ギャラリーから追加（複数枚可）
- ヒントテキスト: 「異なる角度の写真で識別精度が向上します」
- 「識別を開始」ボタン（forest-green）
- ローディング中はスピナー表示

#### 結果状態
- 注意書きは結果画面でも常時表示
- 候補種をカード形式で表示:
  - 和名（太字）、学名（灰色）、信頼度バッジ（高=緑、中=オレンジ、低=赤）
  - 根拠テキスト
  - 図鑑収録種の場合は図鑑詳細へのリンク
- **類似毒キノコ警告**: 赤い左ボーダーの警告枠で目立たせる
- 「図鑑で詳しく見る」ボタン（図鑑収録種の場合）
- 「もう一度識別する」ボタン

### 6.3 採取計画画面 (`/plan`)

テーマ: **フォレストテーマ**（ダークグリーン）

#### ヒアリングフォーム (Step 1)
- ヘッダー右に「履歴」ボタン → チャット履歴一覧へ
- 入力項目:
  - 📅 予定日（日付ピッカー）
  - 📍 場所（テキスト入力）
  - 🍄 探したいキノコ（任意、図鑑から選択）
  - 🎯 経験レベル（初心者 / 中級者 / 上級者 の3択ボタン）
- 「計画を相談する」ボタン → チャット画面へ遷移

#### チャット画面 (Step 2)
- ヘッダー: 戻るボタン + 「採取計画」タイトル + セッション概要（日付・場所）
- メッセージ表示:
  - AIメッセージ: 左寄せ、ダークグリーン背景、ロボットアイコン付き
  - ユーザーメッセージ: 右寄せ、グリーン背景
- ストリーミング応答: テキストが逐次表示される
- 下部に入力欄 + 送信ボタン（丸形）
- メッセージ送信のたびにIndexedDBに自動保存
- オフライン時: 入力欄を無効化、「オフラインのため送信できません」表示

### 6.4 チャット履歴一覧

- ヘッダー: 戻るボタン + 「チャット履歴」タイトル
- セッションカード:
  - タイトル（自動生成: 「{場所} {目的}」形式）
  - 作成日、場所、予定日
  - 最後のメッセージプレビュー（1行、省略表示）
  - メッセージ数
  - 削除ボタン（🗑）
- タップでチャット再開（過去メッセージ表示 + 続きが書ける）
- 下部に「新しい計画を作成」ボタン → ヒアリングフォームへ
- 新しい順にソート

### 6.5 設定画面 (`/settings`)

既存画面にAPIキー設定セクションを**最上部**に追加。

#### APIキー設定セクション
- セクションタイトル: 「AI機能（Claude API）」
- APIキー入力欄: マスク表示（`sk-ant-•••••xxYz`）
- 表示/非表示トグル（👁ボタン）
- 接続確認ステータス: 保存時にAPIへ短いテストメッセージ（`"test"`）を送信し、200応答なら緑丸=成功、それ以外は赤丸=失敗を表示
- 保存ボタン + 削除ボタン（赤系で視覚的に区別）
- 説明テキスト: 「APIキーはこの端末のlocalStorageに保存されます。サーバーには送信されません。」
- Anthropic Consoleへのリンク

既存セクション（アプリ情報、ライセンス）は変更なし。

---

## 7. IndexedDB スキーマ変更

既存の `db.ts` (Dexie) に `chatSessions` テーブルを追加。

```typescript
// DBバージョンをインクリメント
db.version(2).stores({
  records: 'id, mushroom_id, observed_at',
  chatSessions: 'id, created_at, updated_at',
});
```

### チャットセッションの永続化タイミング
- ヒアリングフォーム送信時: 新規セッション作成（context + 空のmessages）
- メッセージ送受信のたびに: messages配列を更新、updated_atを更新
- タイトル自動生成: `{場所} {目的}` 形式。場所未設定時は `採取計画 {日付}`

### オフライン時の挙動
- ✅ 履歴一覧の閲覧 — IndexedDB読み取りのみ
- ✅ 過去チャットの閲覧 — IndexedDB読み取りのみ
- ❌ 新規チャット作成 — API通信が必要
- ❌ メッセージ送信 — API通信が必要

---

## 8. テスト方針

### ユニットテスト
- `lib/claude.ts`: API呼び出しのモック、エラーハンドリング、レスポンスパース
- `types/chat.ts`: 型の整合性（コンパイル時チェック）
- `constants/prompts.ts`: プロンプト生成関数のテスト（コンテキスト注入）

### コンポーネントテスト
- `PhotoUploader`: 写真追加・削除・プレビュー表示
- `IdentifyResult`: 候補表示、信頼度バッジ色、毒キノコ警告表示
- `PlanForm`: フォーム入力・バリデーション
- `ChatMessage`: メッセージバブルの表示（AI/ユーザー）
- `ChatHistory`: セッション一覧表示・削除

### E2Eテスト
- APIキー設定フロー（保存・削除・接続テスト）
- 詳細識別フロー（写真選択→識別→結果表示）※APIモック
- 採取計画フロー（ヒアリング→チャット→履歴保存→再開）※APIモック
- APIキー未設定時の誘導表示
- オフライン時の挙動（履歴閲覧可、送信不可）

---

## 9. 安全性ルール

仕様書の絶対ルールに準拠:

1. **識別結果には必ず注意書きを表示する** — 入力画面・結果画面の両方で常時表示
2. **簡易識別と詳細識別を自動で切り替えない** — モード選択画面でユーザーが明示的に選択
3. **毒キノコ情報は過小表示しない** — 類似毒キノコ警告を赤枠で目立たせる
4. **識別結果の注意書きテキスト**: 「AI推定です。採取の最終判断は専門家に確認してください。」
5. **計画チャットのガイドライン**: 毒キノコ誤認リスク・禁止エリア・装備について積極的に言及

---

## 10. Phase 3 完了条件

仕様書 Section 8 より:

- [ ] APIキーを設定すると識別・計画機能が有効になる
- [ ] 写真をアップロードしてClaudeによる識別結果が表示される
- [ ] 識別結果に必ず注意書きが表示される
- [ ] チャット形式で採取計画を立てられる

追加条件:
- [ ] チャット履歴がIndexedDBに保存され、オフラインで閲覧できる
- [ ] ストリーミング応答が正常に表示される
- [ ] APIキー未設定時の適切な誘導が動作する
- [ ] ユニットテスト・E2Eテストがすべてパスする
