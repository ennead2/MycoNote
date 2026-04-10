# Phase 4: 簡易識別（特徴ベース） — 設計書

> MycoNote Phase 4 設計リファレンス
> Version 1.0 — 2026-04-09

---

## 1. 概要

Phase 4は当初TensorFlow.jsによるオンデバイス画像分類を予定していたが、以下の理由からルールベースの特徴マッチング方式に変更する。

- 既存の公開キノコ分類モデルは欧米データ中心で、日本のキノコ（図鑑収録種）をカバーしない
- カスタムモデルの学習には大量のデータとGPU環境が必要でコストが高い
- 図鑑データ拡充（100種以上）に連動して自動的に精度が向上するルールベースが長期的に合理的

### 方式

ユーザーがキノコの形態的特徴（傘の色・形・ヒダのタイプ等）を選択し、図鑑データの構造化特徴との重み付きスコアマッチングで上位5候補を表示する。

### スコープ

| 含まれる | 含まれない |
|---------|-----------|
| 構造化特徴データ（`MushroomTraits`）の型定義・図鑑データ追加 | TensorFlow.js / 画像ベースAI |
| 重み付きスコアマッチングエンジン | カスタムモデル学習 |
| 簡易識別UI（ダークグリーンテーマ） | 詳細識別の変更 |
| 識別モード選択画面の更新（簡易識別カード有効化） | |
| 参考写真プレビュー（入力時）・図鑑写真サムネイル（結果） | |

---

## 2. 図鑑データの構造化特徴

### 型定義

既存の `Mushroom` 型に `traits` フィールドを追加する。

```typescript
type GillType = 'gills' | 'pores' | 'teeth' | 'none';
type CapColor = 'white' | 'brown' | 'red' | 'yellow' | 'orange' | 'gray' | 'black';
type CapShape = 'flat' | 'convex' | 'funnel' | 'hemisphere' | 'conical';
type CapSize = 'small' | 'medium' | 'large';
type GillAttachment = 'free' | 'attached' | 'decurrent' | 'sinuate';
type StalkColor = 'white' | 'brown' | 'yellow' | 'gray';
type StalkFeature = 'ring' | 'volva' | 'hollow' | 'fibrous';
type Bruising = 'blue' | 'red' | 'yellow' | 'none';
type Substrate = 'broadleaf' | 'conifer' | 'grass' | 'deadwood';

interface MushroomTraits {
  gill_type: GillType[];
  cap_color: CapColor[];
  cap_shape: CapShape[];
  cap_size: CapSize;
  gill_attachment?: GillAttachment[];
  stalk_color?: StalkColor[];
  stalk_features?: StalkFeature[];
  bruising?: Bruising[];
  substrate?: Substrate[];
}
```

- 色・形・タイプは配列（1つのキノコが複数の特徴を持つことがある）
- `cap_size` のみ単一値
- 追加項目（`gill_attachment` 以降）はオプショナル
- 既存の `mushrooms.json` 13種すべてにこのデータを手動追加する

### データ例

```json
{
  "id": "kuritake",
  "traits": {
    "gill_type": ["gills"],
    "cap_color": ["brown", "orange"],
    "cap_shape": ["convex"],
    "cap_size": "medium",
    "gill_attachment": ["attached"],
    "stalk_color": ["brown"],
    "stalk_features": ["ring"],
    "bruising": ["none"],
    "substrate": ["deadwood"]
  }
}
```

---

## 3. マッチングアルゴリズム

### 重み設定

```typescript
const WEIGHTS: Record<string, number> = {
  gill_type:       3,   // 科レベル分類で決定的
  cap_color:       2,   // 観察しやすく絞り込みに有効
  cap_shape:       2,   // 種の特定に寄与
  cap_size:        1,   // 補助的
  gill_attachment: 3,   // 属レベル判別で必須
  stalk_color:     1,   // 補助的
  stalk_features:  3,   // テングタケ科判別に重要
  bruising:        3,   // イグチ類で決定的
  substrate:       2,   // 候補を大きく絞れる
  season:          1,   // 季節フィルター
};
```

### スコア計算ロジック

1. ユーザーが選択した各特徴について、図鑑データとの一致を判定
2. 配列フィールド（色・形など）はユーザー入力が配列内に含まれれば一致
3. 一致した特徴の重みを合算 → ユーザーが入力した特徴の重み合計で割ってパーセント化
4. 未入力の追加項目はスコア計算から除外（分母にも含めない）
5. 上位5件を表示
6. 季節：現在月が種のシーズン範囲外の場合、スコアを50%に半減

### 毒キノコの特別処理

- 候補の `similar_species` に毒キノコ（`toxic` / `deadly_toxic`）がいる場合、その毒キノコもスコアに関わらず候補に含める（5件を超える場合あり）
- 毒性が `toxic` / `deadly_toxic` の候補は赤枠・赤テキストで強調表示

### 関数シグネチャ

```typescript
interface IdentifyInput {
  gill_type?: GillType;
  cap_color?: CapColor;
  cap_shape?: CapShape;
  cap_size?: CapSize;
  gill_attachment?: GillAttachment;
  stalk_color?: StalkColor;
  stalk_features?: StalkFeature;
  bruising?: Bruising;
  substrate?: Substrate;
}

interface MatchResult {
  mushroom: Mushroom;
  score: number;           // 0〜100
  matchedTraits: string[]; // 一致した特徴名の配列
  isToxicWarning: boolean; // similar_species経由で追加された毒キノコか
}

function matchMushrooms(input: IdentifyInput, currentMonth: number): MatchResult[];
```

---

## 4. 画面設計

### 4.1 簡易識別画面 (`/identify/simple`)

テーマ: **ダークグリーン**（詳細識別のホワイト系と明確に区別）

#### 入力画面

- **上部に参考写真**を幅いっぱい × 高さ180pxで大きく表示。「写真を変更」ボタンでカメラ/ギャラリーから再選択可能。写真は任意（なくても特徴入力のみで識別可能）
- **注意書き**（黄色左ボーダー）: 「簡易判定です。採取判断には使用しないでください。」
- **必須4項目**をチップ選択で入力:
  1. 🔬 ヒダのタイプ（ヒダ / 管孔 / 針状 / なし）
  2. 🎨 傘の色（白 / 茶 / 赤 / 黄 / 橙 / 灰 / 黒）
  3. 🍄 傘の形（平 / まんじゅう / 漏斗 / 半球 / 円錐）
  4. 📏 傘のサイズ（小 〜5cm / 中 5〜15cm / 大 15cm〜）— 1行表示
- **「もっと絞り込む」トグル**で追加6項目を展開:
  5. ヒダの付き方（離生 / 直生 / 垂生 / 湾生）
  6. 柄の色（白 / 茶 / 黄 / 灰）
  7. 柄の特徴（つば有 / つぼ有 / 中空 / 繊維状）
  8. 変色反応（青変 / 赤変 / 黄変 / なし）
  9. 発生場所（広葉樹林 / 針葉樹林 / 草地 / 倒木上）
  10. 発生時期（現在の月を自動入力、変更可能）
- **「候補を検索」ボタン**

#### 結果画面

- **注意書き**を結果画面でも常時表示
- **上位5候補**をカード形式で表示:
  - 左に図鑑写真サムネイル（56×56px）
  - 種名・毒性バッジ（食用=緑、毒=赤、猛毒=赤）
  - スコアバー（パーセント表示）
  - 高スコア候補には一致した特徴項目を表示
  - 毒キノコ: 赤枠・赤テキスト、サムネイルに⚠バッジ
- **アクションボタン**:
  - 「条件を変える」→ 入力画面に戻る
  - 「詳細識別へ」→ `/identify/detail` に遷移
- 各候補タップで図鑑詳細ページ（`/zukan/[id]`）に遷移

### 4.2 識別モード選択画面の更新 (`/identify`)

- 簡易識別カードを有効化（opacity 解除、タップで `/identify/simple` へ遷移）
- 「Phase 4で追加予定」タグを削除
- 説明文を「写真を見ながら特徴を選択し、候補種を表示します。通信不要で現地でも使えます。」に変更
- タグを「📴 オフライン対応」に変更

---

## 5. ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 変更 | `src/types/mushroom.ts` | `MushroomTraits` 型・特徴値の型追加、`Mushroom` に `traits` フィールド追加 |
| 変更 | `src/data/mushrooms.json` | 13種すべてに `traits` データ追加 |
| 新規 | `src/lib/identify-matcher.ts` | 重み付きスコアマッチングエンジン |
| 新規 | `src/lib/identify-matcher.test.ts` | マッチングエンジンのテスト |
| 新規 | `src/components/identify/FeatureSelector.tsx` | 特徴選択UI（必須 + 追加展開） |
| 新規 | `src/components/identify/FeatureSelector.test.tsx` | FeatureSelectorのテスト |
| 新規 | `src/components/identify/SimpleIdentifyResult.tsx` | 簡易識別結果表示 |
| 新規 | `src/components/identify/SimpleIdentifyResult.test.tsx` | SimpleIdentifyResultのテスト |
| 新規 | `src/app/identify/simple/page.tsx` | 簡易識別ページ |
| 変更 | `src/app/identify/page.tsx` | 簡易識別カード有効化 |
| 変更 | `src/constants/ui-text.ts` | 簡易識別用テキスト追加 |
| 新規 | `e2e/phase4-simple-identify.spec.ts` | Phase 4 E2Eテスト |

---

## 6. テスト方針

### ユニットテスト

- **マッチングエンジン** (`identify-matcher.test.ts`):
  - 全必須項目一致 → 高スコア
  - 部分一致 → 中程度スコア
  - 不一致 → 低スコア
  - 未入力項目がスコア計算から除外されること
  - 季節外の種がスコア半減すること
  - 毒キノコが `similar_species` 経由で強制追加されること
  - 上位5件が正しい順序で返ること
- **特徴データ整合性** (`mushrooms.test.ts` 追加):
  - 全13種に `traits` フィールドが存在すること
  - 必須項目（`gill_type`, `cap_color`, `cap_shape`, `cap_size`）が全種で埋まっていること

### コンポーネントテスト

- **FeatureSelector**: 必須項目の選択・解除、追加項目の展開/折りたたみ、選択状態のコールバック
- **SimpleIdentifyResult**: 候補5件表示、スコアバー、毒キノコ赤枠強調、写真サムネイル表示

### E2Eテスト

- 簡易識別フロー（特徴選択 → 候補表示 → 図鑑遷移）
- 識別モード選択画面で簡易識別カードが有効・タップ可能
- 注意書きが入力画面・結果画面の両方で常時表示
- 「詳細識別へ」リンクが `/identify/detail` に遷移

---

## 7. Phase 4 完了条件

仕様書 Section 8 より（方式変更を反映）:

- [ ] オフライン状態で特徴ベースの簡易識別ができる
- [ ] 簡易識別と詳細識別のUIが明確に区別されている（ダークグリーン vs ホワイト）
- [ ] 簡易識別の注意書きが適切に表示される（「簡易判定：採取判断に使用しないこと」）
- [ ] 必須4項目で候補5件が表示される
- [ ] 毒キノコが赤枠で強調表示される
- [ ] 全ユニットテスト・E2Eテストがパスする
