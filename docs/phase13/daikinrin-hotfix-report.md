# Phase 13-A Hotfix: 大菌輪 fetcher 改修レポート (2026-04-15)

## 背景

Phase 13-A の `daikinrin.mjs` は MycoBank ID 必須の旧 URL 形式を使っていたが、
GBIF Backbone Taxonomy に MycoBank ID が登録されていないため事実上 0 件解決という
既知 caveat があった。Phase 13-D レビュー UI で「大菌輪 null」が頻発して発覚。

## 修正

- 大菌輪公式 `pages.json`（50,686 件）を 1 度 fetch してキャッシュ
- (scientificName, japaneseName) → entry のマップを構築（parsePagesJson / buildPagesIndex）
- `fetchDaikinrinPage(scientificName, japaneseName)` は内部で lookupEntry し、
  大菌輪側の**正典学名**で URL を組み立てる（GBIF と accepted name が違うケース対応）
- URL 形式と `parseDaikinrinPage` は変更なし

## 結果

- 旧 fetcher: tier0 daikinrin hit = **0 / 62**
- 新 fetcher: tier0 daikinrin hit = **62 / 62（達成率 100%）**
- 既知 caveat「MycoBank ID 0 件解決」は完全解消

## GBIF ↔ 大菌輪の accepted name 差分（2 件）

`fetchDaikinrinPage` は和名経由でも正典学名を取得するため問題なく fetch 可能。

| GBIF accepted (tier0) | 大菌輪 accepted | 和名 |
|---|---|---|
| `Pholiota nameko` | `Pholiota microspora` | ナメコ |
| `Omphalotus guepiniiformis` | `Omphalotus japonicus` | ツキヨタケ |

## tier0 和名と大菌輪和名の不一致（15 件）— 要確認

`data/tier0-species.json` の `japaneseName` が大菌輪の正典和名と乖離している種:

| slug | tier0 wamei | 大菌輪 wamei | 備考 |
|---|---|---|---|
| Amanita_porphyria | カブラテングタケ | コテングタケ | |
| Boletus_sensibilis | ドクヤマドリモドキ | ミヤマイロガワリ | ユーザー指摘の架空和名 |
| Galerina_fasciculata | コレラタケモドキ | コレラタケ | |
| Galerina_vittiformis | ヒメアジロガサモドキ | ケコガサタケ | |
| Inocybe_lacera | ヒメクロアセタケ | クロトマヤタケ | |
| Lactarius_hatsudake | ハツタケ | アカハツ | tier0 の「ハツタケ」は一般的な呼び方だが、大菌輪は「アカハツ」 |
| Leucocoprinus_birnbaumii | キツネノハナガサ | コガネキヌカラカサタケ | |
| Paxillus_involutus | オオコゲチャイグチ | ヒダハタケ | |
| Psathyrella_corrugis | ニガクリタケモドキ | ナヨタケ | |
| Pseudosperma_rimosum | アセタケ | オオキヌハダトマヤタケ | Phase 13-C で一度修正済みだが tier0 は元のまま |
| Psilocybe_subcaerulipes | ヒカゲシビレタケ | アイゾメシバフタケ | |
| Russula_densifolia | ニセクロハツモドキ | クロハツモドキ | |
| Russula_foetens | ツチカブリモドキ | クサハツ | |
| Tricholoma_bakamatsutake | ニセマツタケ | バカマツタケ | 一般的には「バカマツタケ」 |
| Tricholoma_saponaceum | ミネシメジ | ミドリシメジ | |

## 取った措置

**選択肢 A を採用**: 大菌輪の正典和名に 15 件すべて一括置き換え。

- `data/tier0-species.json` の `japaneseName` を大菌輪 `japaneseName` に揃えた
- `editedBy` 配列に hotfix 実施記録を追加
- tier0 から除外した種: なし（全 62 種保持）
- 既存 `generated/articles/<slug>.json` の `aliases` 配列には旧和名（慣用呼称）が残っているため、UI 表示で失うものはない想定

## 既存 generated/articles の扱い

retain（Phase 13-D レビューで新 combined JSON と目視照合）。Phase 13-C 再合成は別 plan 化。
