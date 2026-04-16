# Phase 13-F: v2.0 リリース — v1 完全廃棄、v2 60 種で新規構築

作成日: 2026-04-16
ステータス: **承認済 (2026-04-16) — Step 1 着手可能**
前提: Phase 13-D / 13-E 完了、`generated/articles/approved/` に tier0 60 件配置済

---

## 1. 目的と方針転換

**v1 (300 種) を一切参照せず、v2 (60 種) のみで `src/data/mushrooms.json` を作り直す。**

### 理由

v1 は AI 生成主体で構築されたデータで、Phase 12 の検証で 96 件にハルシネーション疑い
（架空種・学名不一致）が残存し、人間レビューが完了していない。**信頼できないデータを
ベースにユーザーへ提供することは仕様上の許容範囲を超える**ため、v1 全体を破棄して
v2 (CC BY 出典明記・人間レビュー済) のみで再出発する。

### トレードオフ（受容）

- **収録種が 300 → 60 に縮小**: ユーザーが過去に登録した「キノコ」の多くは図鑑に存在しなくなる
- **v1 で取得済の写真資産（2,800 枚）も全廃棄**: tier0 60 種分は Phase 13-G で再取得
- **簡易識別 (`/identify/simple`) は当面停止**: traits が v2 にないため
- **既存ユーザーの記録・栞は ID 紐付けが切断される**（記録自体は保持、表示はテキストのみ）

これらは「ハルシネーションを排除する」という品質目標のために許容する。

### Phase 13 全体の最終ゴール

| Phase | 内容 | 結果 |
|---|---|---|
| 13-A〜E | データ収集→候補選定→AI 合成→レビュー | tier0 60 種が approved/ に確定 |
| **13-F** | **v2 60 種で本体を作り直し、v1 を完全撤去** | **mushrooms.json = 60 種** |
| 13-G | v2 60 種の画像取得（iNat + Wikipedia 再構築） | 画像配備 |
| 13-H 以降 | tier1 / tier2 を v2 で生成（200 → 500 規模へ拡張） | 図鑑成長 |

---

## 2. 入出力

### 2.1 入力

| ファイル | 用途 |
|---|---|
| `generated/articles/approved/<slug>.json` × 60 | v2 本文（description / features / cooking / poisoning / caution / similar / season / habitat / regions / tree / aliases / sources / notes） |
| `data/species-ranking.json` | safety + scientificName + japaneseName の正典 |
| `data/tier0-species.json` | 和名 override（`ja_wiki_source_override`）と rationale |

**v1 mushrooms.json は参照しない**（破棄前提）。

### 2.2 出力

| ファイル | 内容 |
|---|---|
| `src/data/mushrooms.json` | **v2 60 種のみ**で完全置換 |
| `src/types/mushroom.ts` | スキーマを v2 に合わせて再設計 |
| `data/v2-build-report.json` | 構築レポート（種別 safety 内訳・スキーマ違反等） |

---

## 3. 新スキーマ（v2 専用、v1 互換性なし）

### 3.1 型定義

```ts
export type Safety = 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly';

export interface MushroomTaxonomy {
  order?: string;
  family?: string;
  genus?: string;
}

export interface SeasonRange {
  start_month: number;  // 1-12
  end_month: number;    // 1-12
}

export interface SimilarSpecies {
  ja: string;
  note: string;
  v1_id?: never;       // v1 互換は廃止
  scientific?: string;
}

export interface SourceCitation {
  name: string;
  url: string;
  license: string;
}

export interface Mushroom {
  /** scientific name を underscore 区切りにした slug。例: amanita_muscaria */
  id: string;

  names: {
    ja: string;
    scientific: string;
    aliases?: string[];
    /** GBIF で確認された旧学名 */
    scientific_synonyms?: string[];
  };

  taxonomy?: MushroomTaxonomy;
  safety: Safety;                // ← v1 の toxicity を改名
  season: SeasonRange[];         // ← 常に array
  habitat: string[];
  regions: string[];
  tree_association?: string[];

  description: string;
  features: string;
  cooking_preservation: string | null;
  poisoning_first_aid: string | null;
  caution: string | null;

  similar_species: SimilarSpecies[];

  sources: SourceCitation[];     // 必須
  notes?: string;                // dev only

  // 画像系（Phase 13-G で埋める。13-F 時点では空でも build 可）
  image_local: string | null;
  images_remote: string[];
  images_remote_credits?: string[];

  // ↓↓↓ v1 から削除するもの ↓↓↓
  // toxicity              → safety に改名
  // traits                → 廃止（Phase 14 で再設計）
  // verified              → 廃止（v2 は全件 verified 前提）
  // source_url            → 廃止（sources[] に統一）
}
```

### 3.2 削除する v1 型・ロジック

- `Toxicity` enum（`edible_caution` / `deadly_toxic`）→ `Safety` (`caution` / `deadly`) に置換
- `MushroomTraits` 型と関連 trait enums 全部 → 削除
- `traits?: MushroomTraits` フィールド → 削除
- `source_url` フィールド → 削除（sources[] に統合）
- `verified?: boolean` → 削除（v2 全件 true 前提）

### 3.3 id 命名規則

- v1: `matsutake`、`benitengutake` 等のローマ字和名（不統一）
- v2: **scientific name の underscore 化**（小文字、特殊文字は `_`）
  - `Amanita muscaria` → `amanita_muscaria`
  - `Boletus edulis` → `boletus_edulis`
  - 既存ファイル名 `Amanita_muscaria.json` を小文字化するだけ

---

## 4. 実装ステップ

### Step 1: 型定義刷新

- `src/types/mushroom.ts` を §3.1 に従って書き換え
- `Toxicity` → `Safety` の renaming は全コードに波及するため一括 rename ツール使用
- `MushroomTraits` / `traits` / `source_url` / `verified` を全箇所から削除
- `similar_species: string[]` → `SimilarSpecies[]` への型変更

### Step 2: 簡易識別機能の停止

- `/identify/simple` ページを「準備中」プレースホルダに置き換え
  - メッセージ: 「簡易識別は v2 データ移行に伴い一時停止中です。AI 識別をご利用ください。」
  - 「AI 識別へ」ボタンで `/identify/detail` に誘導
- 識別モード選択画面 (`/identify`) で簡易識別カードを「準備中」グレー表示
- `src/lib/identify-simple/` 配下のロジック・テストは **削除はせず保持**（Phase 14 で再生成時に参考になる）
  - import 元がなければ build 時に dead code として除外される

### Step 3: 構築スクリプト `scripts/phase13/build_v2_mushrooms.mjs`

入力:
- `--approved-dir generated/articles/approved`
- `--ranking data/species-ranking.json`
- `--tier0 data/tier0-species.json`
- `--out src/data/mushrooms.json`
- `--report data/v2-build-report.json`

処理フロー:

1. ranking.json から tier=0 行を全件取得 → `byScientific` Map
2. tier0-species.json の `ja_wiki_source_override` を考慮して japaneseName 最終決定
3. approved/*.json を 60 件読み込み
4. 各 article + ranking entry をマージして v2 schema に整形:
   - `id` = scientific を underscore 小文字化
   - `names.ja` = override or tier0 japaneseName
   - `names.scientific` = ranking scientificName
   - `names.aliases` = article.names.aliases
   - `names.scientific_synonyms` = ranking.synonyms?
   - `safety` = `normalizeSafety(ranking.signals.toxicity)`
   - `taxonomy` = ranking.taxonomy or null
   - `season` = article.season（既に array）
   - `habitat / regions / tree_association` = article から
   - `description / features / cooking / poisoning / caution` = article から
   - `similar_species` = article.similar_species（v1_id 解決はしない、v2 60 種内に同名があれば後続で resolveSimilarLinks で id を埋める）
   - `sources` = article.sources
   - `notes` = article.notes
   - `image_local` = null（Phase 13-G で埋める）
   - `images_remote` = []
5. `similar_species[].id`: v2 60 種内で `ja` または `scientific` 一致を逆引きして `id` を埋める（type は `SimilarSpecies` に `id?: string` 追加）
6. 出力 mushrooms.json は配列形式で 60 entries
7. レポート出力: safety 別カウント、similar_species 解決率、欠損フィールド等

### Step 4: 既存ユーザーデータの IndexedDB マイグレーション (v3 → v4)

**bookmarks**:
- 既存 `mushroomId` を v2 60 種の id 集合と照合
- ヒットしないものは **削除**（参照先が消えた栞は残す意味がない）
- マイグレーションログを設定画面に表示: 「v2 移行に伴い X 件の栞が削除されました」

**records**:
- 既存 `mushroom_id` を v2 60 種と照合
- ヒットしないものは `mushroom_id = null`、`mushroom_name_ja` は保持
- 結果: 記録自体は残り、図鑑へのリンクが切れた状態（ユーザーが手動で再リンク可能）
- マイグレーションログ: 「v2 移行に伴い X 件の記録の種紐付けがリセットされました」

**実装**:
- `src/lib/migrations/v3-to-v4.ts` 新設、`db.version(4).upgrade()` で実行
- マイグレーション結果を `migrations` テーブル（新設）に記録、設定画面で参照
- unit test で各種ケース（hit / miss / 全削除）をカバー

### Step 5: UI 改修

#### 5-1: MushroomDetail

- **sources セクション**新設: `<a href={url} target="_blank">{name} ({license})</a>` のリスト
- **caution** が非 null なら InfoBanner（severity=caution）で本文末尾に表示
- **season array** 表示: 複数期間を「7-10月 / 12-2月」形式でカンマ区切り、SeasonBar は最初の期間のみ描画（or 重ね描画）
- 既存の **`scientific_synonyms`** 表示は維持（GBIF 由来として有用）
- `verified` バッジは削除（全件 v2 で同等品質）
- `traits` セクション削除

#### 5-2: 図鑑一覧 (`/zukan`)

- `toxicity` フィルタ → `safety` フィルタへリネーム（UI 文言は「毒性」のまま）
- `traits` フィルタ（傘の色等）は削除（trait データ無し）
  - 検索フィルタ全項目から `capColor` 削除
- 件数表示「60種」になる
- 空状態メッセージ「データを v2 に移行中です。順次拡充されます。」

#### 5-3: 記録 / 栞画面

- マイグレーション完了通知バナー（初回のみ）
- リンク切れ記録: 種名はテキストで表示、「種を再選択」ボタンで MushroomCombobox を開く

#### 5-4: ホーム画面

- 「今月の旬」ロジックは v2 60 種から season で抽出（既存ロジック流用、データ件数が減るだけ）
- 60 種の中で旬の種が無い月もあり得る → EmptyState 表示

### Step 6: テスト

- `scripts/phase13/build_v2_mushrooms.test.mjs`: fixture 駆動 unit test
  - normalizeSafety / id 生成 / similar_species 解決 / 欠損フィールド
- `src/lib/migrations/v3-to-v4.test.ts`: マイグレーション unit test
  - bookmarks 全削除 / records ID リセット / 既に v4 の場合は no-op
- `src/data/mushrooms.test.ts`: 60 種が読み込めること、scientific_synonyms 検索ヒット
- `src/components/zukan/MushroomDetail.test.tsx`: sources / season array / caution 表示
- E2E: `/zukan` 一覧 60 件、代表 v2 種詳細、識別簡易の準備中表示
- 既存テストで削除になる v1 専用テスト（traits / verified 等）は削除

### Step 7: Phase 13-G（画像取得）と一括化

本番デプロイは 13-G 完了後に行うため、本ステップで 13-G を待ち合わせる。

- 13-G で 60 種の画像取得（iNaturalist + Wikipedia 再構築 + 撮影者クレジット）
- mushrooms.json の `image_local` / `images_remote` / `images_remote_credits` を埋める
- 13-F の構築スクリプトを再実行して画像フィールド込みの最終 mushrooms.json を生成

### Step 8: ビルド・デプロイ

- `pnpm test` 全 PASS
- `pnpm build` で 60 種分の動的生成ページ + 共通ページが成功
- 静的ページ数: 313 → 約 73 (60 種 + 13 共通) に減る
- Vercel preview で:
  - ホーム / 図鑑 / 詳細 / 識別 / 計画 / 設定 全画面の表示確認
  - 画像 60 種すべて表示されること
  - 既存ユーザーとして preview に入って bookmarks/records がマイグレーションされる挙動確認
  - 起動時バナーが表示され dismiss できること
- 確認後 main マージ → 本番デプロイ

### Step 9: アナウンス（最小範囲）

- 起動時バナー（×ボタンで dismiss、`localStorage` で再表示抑止）
- 設定画面 > お知らせセクションに恒久掲載
- README 更新: 「v2.0 リリース、データ刷新、収録種一時縮小」
- GitHub Release / ブログ / SNS 告知は **行わない**

---

## 5. 決定事項

- **v1 完全廃棄**: `src/data/mushrooms.json` を v2 60 種で完全置換。v1 の文章・画像参照を一切残さない
- **v1 バックアップ保持**: `src/data/mushrooms-v1-archive.json` として git 内に静的アーカイブ。本体コードからは import しない
- **id は scientific 由来 slug に統一**: 既存 ID 体系も廃止
- **traits 機能停止**: 簡易識別ページは「準備中」プレースホルダ表示
- **画像配備とセットでリリース**: Phase 13-F + 13-G を 1 PR にまとめ、画像欠落のないまま本番デプロイ
- **bookmarks 不一致は削除、records 不一致は ID リセット（記録は残す）**
- **toxicity → safety にリネーム**: 型・フィールド名の整合性
- **`verified` フィールドは廃止**: v2 全件が同等品質扱い
- **season UI は単一 SeasonBar**: 仕様上 v2 種は被り無し。複数期間表示の特殊 UI は不要
- **起動時バナー文言**:
  > ✓ データを刷新しました
  > 2026年4月、出典付き・人間レビュー済みの 60 種で図鑑を作り直しました。
  > 収録種は順次拡充されます。詳細は設定 > お知らせをご覧ください。
- **設定画面に「お知らせ」セクション新設**: 移行の詳細（v1 廃棄理由・bookmarks/records への影響・画像欠落 → 対応中）を恒久掲載
- **外部告知は最小範囲**: 起動時バナー + README 更新のみ。GitHub Release / ブログ / SNS 告知は不要

---

## 7. ロールバック計画

- mushrooms.json は git で v1 に戻せる
- IndexedDB v4 マイグレーションは破壊的（bookmarks 削除）なため、**Vercel preview で十分テスト後に本番デプロイ**
- 万一本番後問題発覚時:
  - bookmarks: ユーザー手動再登録になる（バックアップなし）
  - records: mushroom_id null の記録は残るので影響軽微
  - mushrooms.json revert + db v3 互換層を緊急リリース

---

## 8. 完了条件

- [ ] `src/data/mushrooms.json` が v2 60 種のみ、v1 由来データゼロ
- [ ] スキーマが v2 化（traits/verified/toxicity/source_url 削除、safety/sources/caution/season array 追加）
- [ ] 簡易識別ページが「準備中」表示
- [ ] 既存ユーザーの bookmarks/records が IndexedDB v4 マイグレーションで適切に処理
- [ ] sources セクション・caution・multi-season が詳細ページに表示
- [ ] 全テスト PASS（v1 専用テストは削除済）
- [ ] 本番ビルド成功
- [ ] Vercel preview で目視確認

---

## 9. 後続計画

- **Phase 13-G**: v2 60 種の画像取得（iNat + Wikipedia パイプライン再実行 + 撮影者クレジット）
  - **本リリースに含める**（Step 7 で待ち合わせ）。Phase 13-F 単独ではデプロイしない
- **Phase 13-H**: tier1 50 種 → tier2 100 種を順次 v2 化（approved/ を増やしていく）
- **Phase 14**: traits を v2 description / features から Claude で構造化、簡易識別を再開
