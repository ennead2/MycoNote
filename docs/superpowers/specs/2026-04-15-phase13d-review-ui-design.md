# Phase 13-D: v2 レビュー UI 設計書

> 作成日: 2026-04-15
> 親設計書: [2026-04-13-phase13-daikinrin-rag-rewrite-design.md](./2026-04-13-phase13-daikinrin-rag-rewrite-design.md) §8

---

## 1. 目的とスコープ

### 1.1 目的

Phase 13-C で合成された `generated/articles/*.json` × 62 件（tier0）を人間が最終判定するための dev-only レビュー UI を構築する。

### 1.2 スコープ

| 含まれる | 含まれない |
|---|---|
| Phase 13-C tier0 62 件の記事審査 | v1 既存図鑑の並列比較表示 |
| 3 択判定（approve / concern / reject）+ concern 時のセクション指定 | インライン本文編集機能 |
| 警告バッジ表示 | warning 付き記事の自動フィルタ |
| hero_image による画面内完結の同定確認 | Google 画像検索タブ自動操作（ボタン 1 つだけ残す） |
| approve 済みの `approved/` サブディレクトリへのコピー | Phase 13-F の v2.0 リリース作業（mushrooms.json 組み立て） |
| Phase 13-G 以降の Tier 1+ 審査（同一ツールで拡張可） | 初回実装時の Tier 1+ 対応 |

### 1.3 前提

- v2 記事と v1 本文の差分比較は**行わない**（Phase 13-C の議論で C を選択）。代わりに右パネルに combined JSON のソース抜粋を表示し、「v2 本文がソース由来か」を確認する
- 実利用者は開発者本人のみ。PC Chrome での使用前提、モバイル非対応
- 既存の `scripts/review/`（Phase 12-F v1 レビュー）は一切変更しない

---

## 2. 全体構成

### 2.1 ディレクトリ

```
scripts/review-v2/
├── server.mjs      — Node HTTP サーバー（port 3031）
├── index.html
├── app.js          — vanilla JS、フレームワーク非依存
├── style.css
├── server.test.mjs — server ロジックの unit test
├── fixtures/       — テスト用サンプル記事 + combined JSON
└── README.md
```

**採用技術**: vanilla JS + HTML + CSS、ビルド不要（Phase 12-F `scripts/review/` と同じ作法）。Next.js 本体には一切影響しない dev-only ツール。

### 2.2 入出力

**入力**:
- `generated/articles/*.json` × 62（Phase 13-C の合成結果）
- `.cache/phase13/combined/<slug>.json`（Phase 13-A の combined JSON、右パネル表示用）
- `.cache/phase13/generation-report.json`（Phase 13-C の警告情報）

**出力**:
- `scripts/temp/review-v2-progress.json` — 判定記録（自動追記、autosave）
- `generated/articles/approved/<slug>.json` — approve 済み記事のコピー（Phase 13-F の入力になる）

### 2.3 port 割り当て

- Phase 12-F `scripts/review/` — port 3030
- Phase 13-D `scripts/review-v2/` — **port 3031**
- 両者は独立して起動可能

---

## 3. 画面レイアウト

### 3.1 構造

```
┌──────────────────────────────────────────────────────────────────┐
│ [ヘッダー] Phase 13-D Review  [23/62]  progress bar  [warning only]│
├──────────────────────────────────────────────────────────────────┤
│ [hero_image 320px]   マツタケ / Tricholoma matsutake             │
│                      safety: edible   season: [9,10]   ⚠ w:2    │
│                      [Google 画像検索で開く ↗]                   │
├────────────────────────────────┬─────────────────────────────────┤
│ v2 Article (LEFT, scrollable)  │ Sources (RIGHT, scrollable)      │
│                                │                                  │
│ ▸ 概要                         │ ▸ Wikipedia ja 抜粋             │
│ ▸ 形態的特徴                   │ ▸ Wikipedia en 抜粋             │
│ ▸ 発生・生態                   │ ▸ 大菌輪 本文                   │
│ ▸ 類似種・見分け方             │ ▸ 厚労省（毒種のみ）           │
│ ▸ 食用利用・食文化             │ ▸ 林野庁（食用のみ）           │
│ ▸ [warnings 付き赤下線]        │ ▸ Trait Circus（構造化）        │
├──────────────────────────────────────────────────────────────────┤
│ [1 Approve]  [2 Concern]  [3 Reject]   Note: [_____________]     │
│ concern 時のみ表示:                                              │
│   □ 概要  □ 形態  □ 発生  □ 類似種  □ 食用  □ 中毒  □ 雑学     │
│   □ 構造化フィールド（taxonomy/season/safety 等）                │
├──────────────────────────────────────────────────────────────────┤
│ [← 前] [→ 次]          62 件中 approved:20 / concern:2 / reject:1│
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 レイアウト規則

- 2 カラム（左: v2 記事 / 右: ソース）は CSS Grid
- 左右スクロール独立、種切替時は両カラムともスクロール位置リセット
- hero_image は種ヘッダ内に固定、記事本文と常に可視
- warning 付き該当セクションは文中赤下線 + hover で詳細表示

---

## 4. 判定フロー

### 4.1 3 択の定義

| 判定 | 意味 | server 側の動作 |
|---|---|---|
| **approve** | 記事として採用可、本番投入 OK | `approved/<slug>.json` にコピー |
| **concern** | 一部問題あり、プロンプト改善 or 部分再生成が必要 | セクション + メモを progress.json に記録 |
| **reject** | 全面再生成が必要（ソース不足 / 大規模誤り） | メモを progress.json に記録 |

**判定変更時**:
- approve → concern/reject: `approved/<slug>.json` を削除
- concern/reject → approve: `approved/<slug>.json` を新規コピー

### 4.2 キーボード操作

| キー | 動作 |
|---|---|
| `1` | Approve（判定を保存し、次へ自動遷移） |
| `2` | Concern（判定を保存し、セクションチェックボックスにフォーカス。Enter で次へ遷移） |
| `3` | Reject（判定を保存し、次へ自動遷移） |
| `0` | 判定クリア |
| `N` | メモ欄フォーカス |
| `Enter` / `→` | 次の種へ |
| `←` | 前の種へ |
| `Tab` | concern セクション間を移動 |
| `G` | Google 画像検索を新タブで開く（学名クエリ） |

### 4.3 autosave と復元

- 全判定は `scripts/temp/review-v2-progress.json` に都度書き込み（Phase 12-F と同じ autosave 作法）。concern 時はセクションチェックボックス変更やメモ更新のたびに追加 autosave（debounce 300ms）
- ブラウザ閉じて再開時は progress.json から状態復元、未判定の次の種へ自動ジャンプ
- progress.json 形式:
  ```json
  {
    "started_at": "2026-04-15T...",
    "last_updated": "2026-04-15T...",
    "decisions": {
      "Tricholoma_matsutake": {
        "decision": "approve",
        "sections": [],
        "note": "",
        "reviewed_at": "2026-04-15T..."
      },
      "Entoloma_sinuatum": {
        "decision": "concern",
        "sections": ["similar_species", "caution"],
        "note": "類似種セクションで出典番号が合っていない",
        "reviewed_at": "2026-04-15T..."
      }
    }
  }
  ```

---

## 5. 実装コンポーネント

### 5.1 server.mjs

Node HTTP サーバー（想定 ~250 行）。エンドポイント:

| Method | Path | 用途 |
|---|---|---|
| GET | `/` | `index.html` |
| GET | `/api/articles` | 一覧返却（slug, 和名, 学名, safety, warnings 数, 判定状態） |
| GET | `/api/articles/:slug` | 記事 JSON + combined ソース JSON をマージして返却 |
| POST | `/api/decisions` | 判定保存（`{slug, decision, sections[], note}`） |
| DELETE | `/api/decisions/:slug` | 判定クリア |
| GET | `/static/*` | 静的ファイル（app.js, style.css） |

**判定保存の原子性**:
- POST `/api/decisions` で `progress.json` 更新 → `approved/<slug>.json` コピー/削除を **逐次実行**
- いずれかが失敗したら HTTP 500 で全体エラー、progress.json は更新前の状態を保持
- 原子性を完璧に保証はしないが、単一プロセス・単一ユーザーの dev ツールなので十分

### 5.2 app.js

vanilla JS（想定 ~400 行）。責務分割:

- **Store** — 現在の種 index、判定状態、progress 管理
- **Renderer** — 記事セクション / ソースパネル / ヘッダ描画
- **KeyHandler** — キーボードイベント → Store 操作
- **API** — fetch ラッパー

モジュール分割は ES Module の `<script type="module">` を使用。

### 5.3 style.css

- 既存 `scripts/review/style.css` からカラー/タイポグラフィを流用（DESIGN.md の色トークン準拠）
- 2 カラムレイアウトは CSS Grid、モバイル対応なし（PC Chrome 専用）
- warning 赤下線、safety バッジ、decision ボタンの active 状態を定義

### 5.4 警告表示仕様

Phase 13-C の `generation-report.json` の warning 構造:
```json
{
  "slug": "Pholiota_squarrosa",
  "warnings": ["V8: caution に出典番号 [N] が一度も出現しない"]
}
```

UI の処理:
- カード上部に `⚠ warnings: 2` のバッジ
- 警告本文にセクション名が含まれる場合、そのセクションタイトルの横に小アイコンを追加
- 警告の詳細は hover ツールチップで全文表示
- 警告は approve のブロッカーにしない（レビュワーの判断に委ねる）

---

## 6. テスト戦略

### 6.1 server.mjs の unit test

`scripts/review-v2/server.test.mjs` で以下を検証:

- `GET /api/articles` が 62 件 + warning 情報を返却
- `GET /api/articles/:slug` が記事 + combined ソースをマージして返却
- `POST /api/decisions` で approve → `approved/<slug>.json` がコピーされる
- approve → concern で `approved/<slug>.json` が削除される
- `DELETE /api/decisions/:slug` で progress.json から該当 slug が消える
- progress.json 形式が仕様通り

テストフィクスチャ:
- `scripts/review-v2/fixtures/generated-articles/` にサンプル記事 3〜5 件
- `scripts/review-v2/fixtures/combined/` に対応 combined JSON
- `scripts/review-v2/fixtures/generation-report.json` に warning サンプル

### 6.2 app.js の手動確認

ブラウザ実行なので unit test なし。実装完了後、実データで以下を手動確認:
- 62 件の一覧が表示され、未判定の最初の種へジャンプする
- キーボード 1/2/3 で判定できる
- concern 時のセクション選択が動く
- warning バッジが正しい位置に出る
- autosave が動く（ブラウザ閉じて再開で状態復元）

---

## 7. リスクと対策

| リスク | 対策 |
|---|---|
| progress.json の書き込み競合 | 単一ユーザー前提で排他制御なし。必要なら file lock を後付け |
| `approved/` コピーと progress.json の不整合 | server 側で逐次実行、異常時は HTTP 500 でクライアントに通知 |
| Phase 13-G 以降の Tier 1+ 拡張時の互換性 | 入力ディレクトリをハードコードせず、`--articles-dir` CLI オプションで切替可能にする |
| combined JSON が欠損している種 | ソースパネルを「情報なし」表示、記事審査自体は続行可能 |

---

## 8. 成功基準

- tier0 62 件すべてに判定が付く（approve / concern / reject のいずれか）
- approve 分が `generated/articles/approved/` に揃う
- progress.json に judged_at タイムスタンプ付きで完全な履歴が残る
- server.test.mjs の全テストが pass
- Phase 13-F の v2.0 リリース作業で `approved/` ディレクトリをそのまま入力として使える

---

## 9. 実装計画への引き渡し

次ステップで `writing-plans` skill を呼び、本設計を Task 分割した実装計画に落とす。想定 Task:

- **Task 1**: ディレクトリ構成 + `README.md`
- **Task 2**: `server.mjs` のエンドポイント骨格 + unit test
- **Task 3**: `/api/articles` と `/api/articles/:slug` の実装 + test
- **Task 4**: `/api/decisions` の保存 + approved/ コピー/削除 + test
- **Task 5**: `index.html` + `style.css` の骨組み（2 カラム Grid レイアウト）
- **Task 6**: `app.js` の Store + API + 初期描画
- **Task 7**: Renderer（記事セクション、ソースパネル、ヘッダ、warning バッジ）
- **Task 8**: KeyHandler（1/2/3/0/N/Enter/←→/Tab/G）
- **Task 9**: concern のセクションチェックボックス + メモ欄
- **Task 10**: 実データで手動確認、progress 履歴の動作検証
