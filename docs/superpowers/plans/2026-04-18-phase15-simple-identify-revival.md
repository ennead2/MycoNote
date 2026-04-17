# Phase 15 — 簡易識別の復活（大菌輪統制形質ベース）

計画日: 2026-04-18
対象: tier0 60 + tier1 53 = 113 種

## 背景

Phase 13-F で v2 スキーマから `traits` フィールドを廃止し、簡易識別ページを「準備中」プレースホルダ化した。v2.1 リリース後のユーザー要望で復活させる。

v1 時代の自作 traits（傘色・ヒダ色・柄色・サイズ等）は 300 種分の手動構築データだった。v2 では以下の理由で方針転換する:

- **出典付き・構造化**: 大菌輪（CC BY 4.0）が統制語彙 `element_attribute_value` 体系を整備しており、Trait Circus Database として公開されている
- **スケーラブル**: tier2 以降の追加時も同じパイプラインで形質データが取得できる
- **検証可能**: 大菌輪 hierarchy と同一 key 体系なので、カバレッジ・妥当性を機械的に測定できる

## データソース

| 項目 | 内容 |
|---|---|
| 名称 | Trait Circus Database |
| 提供元 | Atsushi Nakajima (大菌輪) |
| 配布 | `Atsushi/fungi_trait_circus_database` (Hugging Face) |
| ライセンス | CC BY 4.0 |
| 粒度 | 1 trait 1 レコード、`current_name` は MycoBank accepted name |
| 件数 | 4,214,359 行、Parquet 50MB |
| 最終更新 | 2025-09-28 |
| カラム | `trait` / `hitword` / `raw` / `source` / `scientificname` / `current_name` |
| 形質 key 形式 | `element_attribute_value` (例: `pileus_color_brown`) — 大菌輪 hierarchy.php と同一 |
| 注記 | "casual use only" — OSS/個人プロジェクトは OK、学術出版には利用不可 |

補助データ:

- `hierarchy.json` — 大菌輪 `api/trait_search/hierarchy.php` 由来の全 479 エレメント × 属性 × 値の辞書（1.6MB）
- Phase 13-A 既存: `scripts/phase13/trait-circus-prep.py` + `trait-circus.mjs` — 個別種 JSON 化の下地あり

## 対象形質（肉眼観察可能な要素のみ）

顕微鏡観察に依存する要素（シスチジア・担子器・菌糸・アミロイド性・結晶・胞子の微細構造 等）は除外し、以下 **9 要素 × 厳選属性** のみを採用する:

| # | element (en) | element (jp) | 採用属性 |
|---|---|---|---|
| 1 | pileus | 傘 | 色 / 形状 / 表面性状 / 質感 |
| 2 | stipe | 柄 | 色 / 形状 / 表面性状 / 質感 |
| 3 | lamellae | 襞（ひだ） | 色 / 形状 / 発達 |
| 4 | hymenophore | 子実層托（ヒダ＋管孔） | 色 / 形状 / 表面性状 |
| 5 | context | 肉 | 色 / 質感 |
| 6 | fruiting body | 子実体（全体） | 色 / 形状 / 質感 |
| 7 | spore print | 胞子紋 | 色 |
| 8 | annulus | つば | 有無 / 色 |
| 9 | volva | つぼ | 有無 / 色 |

S1 検証で判明した除外項目:

- **tube (管孔)**: Trait Circus 実データでは `hymenophore_*` に完全置換されているため削除
- **taste (味)**: Trait Circus に実データ 0 件のため削除（大菌輪 hierarchy には属性定義あるが記載文抽出段階で落ちている）
- **odor (臭い)**: Trait Circus に実データ 1 件のみのため削除
- 属性「位置」「構造」「アミロイド性」「数量」「発達（一部）」は顕微鏡・化学試薬依存のため除外

味・臭いを復活させたい場合、S2 実装時に AI 合成パイプライン (Phase 13-C) で 113 種分の `context.taste` / `context.odor` のみ生成する選択肢あり。ただし Trait Circus 側に戻し込むか v2 スキーマ側に別フィールド (`trait_hints?: { taste: string; odor: string }` 等) で持つかは要検討。

## ステップ分解

### S1: データ取得・カバレッジ計測（プロトタイプ） — 本計画の実施対象

目的: Trait Circus に 113 種がどれだけ収録されているか、肉眼観察可能な形質でどこまで絞れるかを**測定のみ**する。実装前に現実的な識別精度の見込みを立てる。

成果物:
- `scripts/phase15/fetch_species_traits.py` — Parquet から 113 種分を抽出 → `data/phase15/species-traits-raw.json`
- `scripts/phase15/filter_visible_traits.mjs` — 10 要素 × 厳選属性でフィルタ → `data/phase15/species-traits-visible.json`
- `scripts/phase15/measure_coverage.mjs` — カバレッジレポート生成 → `data/phase15/coverage-report.json`

計測指標:
- 113 種のうち Trait Circus に収録されているか（`scientificname` か `current_name` または synonyms でヒット）
- 各種の肉眼観察可能 trait_key 数（平均・中央値・分布）
- 要素別の埋まり率（傘色 95%, 柄形状 70%, 等）
- 収録ゼロ / 極端に少ない種のリスト

### S2: スキーマ拡張 + データ合成（本実装）

- `src/types/mushroom.ts` に `traits?: string[]` を追加（v2 スキーマ拡張）
- `scripts/phase13/build_v2_mushrooms.mjs` に traits 埋め込み経路を追加
- `src/data/mushrooms.json` に 113 種分を反映

### S3: 識別エンジン実装

- `src/lib/identify-matcher-v2.ts` — 選択 trait_keys のうち、各種 traits に含まれる数 / 選択総数 = スコア
- 同率は safety priority 順（Phase 15 で食用→要注意→猛毒→毒→不明→不食 に改定済み）
- 毒キノコの警告 flag
- ユニットテスト付き

### S4: UI 再実装

- `src/app/identify/simple/page.tsx` — プレースホルダを FeatureSelectorV2 に戻す
- `src/components/identify/FeatureSelectorV2.tsx` — hierarchy の 10 要素を tab / accordion で展開、各値を chip で選択
- `src/components/identify/SimpleIdentifyResultV2.tsx` — スコア棒 + ToxicityBadge + 毒キノコ強調
- 識別モード選択画面 (`/identify`) の「準備中」表示を撤去

### S5: 検証

- 113 種でサンプル識別（既知の組合せ: "傘:赤 + つぼ:白 + ひだ:白" → Amanita muscaria が上位、等）
- トップ 1 / トップ 5 命中率
- カバレッジ不足種へのフォールバック挙動
- e2e テスト追加

## S1 完了後の判断ポイント

| ケース | 次アクション |
|---|---|
| 113 種のカバレッジ >= 90%, 平均 trait_key >= 20 | S2 以降をそのまま実装 |
| カバレッジ 70〜90% or 平均 trait_key 10〜20 | 不足種を AI 合成（Phase 13-C パイプライン再利用）で補完 |
| カバレッジ < 70% or 平均 < 10 | 方針再検討。AI 合成主体 / 別ソース探索 |

### S1 実測結果 (2026-04-18)

| 指標 | 値 | 判定 |
|---|---|---|
| Trait Circus マッチ率 | 112 / 113 (99.1%) | ✅ |
| 肉眼観察可能 trait key 総数 | 480 |  |
| 種あたり平均 trait key | 53.5 | ✅ 目標 20 の 2.5 倍 |
| 中央値 | 49 | ✅ |
| 20 key 以上 | 105 / 112 (93.8%) | ✅ |
| 10 key 未満 | 2 種 | — |
| 0 key | 0 種 | ✅ |

**結論**: `>= 90% & 平均 >= 20` の基準を大幅に超過。S2 以降をそのまま実装可能。

#### カバレッジ低の 2 種（要 AI 補完候補）

- ツノマタタケ (Dacrymyces spathularius): 6 keys — ゼラチン質の小型種、記述が短い
- オオゴムタケ (Trichaleurina tenuispora): 6 keys — 革質の子嚢菌、形態記述が少ない

いずれも誤食リスクが低く、識別候補に上がらなくても実害は小さい。S2 ではそのまま扱う。

#### Trait Circus マッチ失敗 (1 種)

- ウラベニホテイシメジ (Entoloma sarcopus): tier1 の希少種で Trait Circus 未収録

実害対策: S2 実装時に AI 合成で traits を補完、または `trait_circus_missing: true` フラグ付与で UI 側スキップ。

## 非スコープ（Phase 15 では対応しない）

- tier2 種の追加（本計画書は tier0+tier1 = 113 種のみ）
- 記述文→trait 自動抽出（AI 合成を使う場合でも Phase 13-C の既存プロンプトを流用、新規開発しない）
- 学名以外による突合（synonyms は `src/data/mushrooms.json` の `scientific_synonyms` で対応済み）
- 大菌輪の `trait_score` (logpLR) 再現 — オフライン対応のためシンプルなマッチ率のみ採用

## ライセンス・帰属表示

- `DESIGN.md` の sources ポリシーに従い、`docs/credits.md` と設定画面 > ライセンスセクションに以下を追記:
  - Trait Circus Database (CC BY 4.0) / Atsushi Nakajima
  - 大菌輪 統制形質 hierarchy (CC BY 4.0)

## 参考

- [大菌輪 形質検索](https://mycoscouter.coolblog.jp/daikinrin/trait_search.html)
- [fungi_trait_circus_database](https://huggingface.co/datasets/Atsushi/fungi_trait_circus_database)
- 既存 Phase 13-A 成果物: `scripts/phase13/trait-circus-prep.py`, `trait-circus.mjs`
- 既存 Phase 13-F で削除: `identify-matcher.ts`, `SimpleIdentifyResult.tsx`, `FeatureSelector.tsx`（git 履歴参照）
