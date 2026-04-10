# Phase 5c: 図鑑データ拡充 実装計画

> **Status:** 完了 (2026-04-10)
> **Note:** 本ドキュメントは完了後に記録用として作成

**Goal:** 図鑑データを13種から100種に拡充し、仕様書の最低100種収録条件を達成する

**Architecture:** `src/data/mushrooms.json` に全データを集約。各エントリには基本情報・毒性・シーズン・生息地・特徴テキスト・類似種クロスリファレンス・識別用 traits を含む。静的ビルド時に全種の詳細ページを SSG 生成。

**Tech Stack:** Next.js 16, TypeScript, Vitest

---

## データ設計

### 毒性カテゴリ別 目標数

| カテゴリ | 既存 | 追加 | 合計 |
|---------|------|------|------|
| 食用 (edible) | 5 | 35 | 40 |
| 食用要注意 (edible_caution) | 1 | 9 | 10 |
| 毒 (toxic) | 3 | 18 | 21 |
| 猛毒 (deadly_toxic) | 3 | 7 | 10 |
| 不食 (inedible) | 1 | 18 | 19 |
| **合計** | **13** | **87** | **100** |

### 選定方針

- 日本国内で遭遇頻度の高い種を優先
- 食用種と間違えやすい毒キノコを網羅（安全性重視）
- 類似種ペアを意識（ウラベニホテイシメジ↔クサウラベニタケ等）
- 各シーズン・各生息環境をカバー
- 全種に traits データを付与し、簡易識別（Phase 4）の精度を向上

---

## ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 変更 | `src/data/mushrooms.json` | 87種追加、既存13種の similar_species 更新 |
| 変更 | `src/data/mushrooms.test.ts` | 件数アサーション更新 (13→100) |
| 変更 | `src/lib/identify-matcher.test.ts` | teeth gill_type テスト修正 |

---

### Task 1: 種リスト策定

- [x] 食用35種の選定（マイタケ、ブナシメジ、タマゴタケ等）
- [x] 食用要注意9種の選定（ナラタケ、ヒトヨタケ、ツルタケ等）
- [x] 毒18種の選定（クサウラベニタケ、テングタケ、ドクササコ等）
- [x] 猛毒7種の選定（ニセクロハツ、コレラタケ、ドクフウセンタケ等）
- [x] 不食18種の選定（マンネンタケ、ツチグリ、キヌガサタケ等）

### Task 2: データ生成

- [x] 食用キノコ35種の JSON データ作成
  - 和名・学名・別名、毒性、シーズン、生息地、地域
  - 説明文、形態的特徴、類似種、共生樹種
  - 識別用 traits（gill_type, cap_color, cap_shape, cap_size 等）
- [x] 毒・猛毒キノコ25種の JSON データ作成
  - 上記に加え、caution（注意書き）を全種に付与
  - 毒素名、症状、致死性、応急処置情報を含む
- [x] 食用要注意・不食キノコ27種の JSON データ作成
  - 食用要注意には caution を付与
  - 不食のうち危険な混同のおそれがある種（クロハツ等）にも caution を付与

### Task 3: データ統合

- [x] 3カテゴリのデータを結合スクリプトで mushrooms.json に統合
- [x] 既存13種の similar_species を新種に合わせて更新
  - shiitake: +mukitake
  - enokitake: +koreratake
  - hiratake: +usuhiratake
  - tamago-tengu-take: +kotamagotengutake, kurotamagotengutake, shirotamagotengutake
  - doku-tsuru-take: +shirotamagotengutake, fukurotsuru-take
  - beni-tengu-take: +tengutake, tamagotake
  - tsukiyo-take: +mukitake, usuhiratake
  - nigakuri-take: +kuritake
- [x] 重複 ID チェック、必須フィールドバリデーション

### Task 4: テスト修正・検証

- [x] `mushrooms.test.ts`: 件数 13→100、毒性フィルター件数更新
- [x] `identify-matcher.test.ts`: teeth テスト修正（ヤマブシタケ等が追加されたため）
- [x] 全157テスト通過確認
- [x] `next build` 成功確認（113静的ページ生成）

---

## 追加された主な種（抜粋）

### 食用
マイタケ、ブナシメジ、ホンシメジ、タマゴタケ、クリタケ、ムキタケ、コウタケ、ヤマドリタケ（ポルチーニ）、アンズタケ（シャントレル）、キクラゲ、ハナビラタケ、ヤマブシタケ 等

### 毒・猛毒
クサウラベニタケ（中毒件数最多）、テングタケ、ドクササコ（先端紅斑型）、ドクヤマドリ、ニセクロハツ（横紋筋融解症）、コレラタケ（アマトキシン）、ドクフウセンタケ（オレラニン） 等

### 食用要注意
ナラタケ（生食不可）、ヒトヨタケ（アルコール併用不可）、ツルタケ（猛毒種に酷似） 等
