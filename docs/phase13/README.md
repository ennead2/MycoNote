# Phase 13: 大菌輪ベース RAG 方式 図鑑再構築

設計書: [../superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md](../superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md)

## サブフェーズ

- [x] Phase 13-A: データソース収集基盤 — [計画書](../superpowers/plans/2026-04-13-phase13a-data-source-foundation.md)
- [x] Phase 13-B: 種選定 + スコアリング — [計画書](../superpowers/plans/2026-04-13-phase13b-species-selection-scoring.md)
- [x] Phase 13-B': シノニム正規化層追加 — [計画書](../superpowers/plans/2026-04-14-phase13b-prime-synonym-normalization.md)
- [x] Phase 13-C: AI 合成パイプライン — [計画書](../superpowers/plans/2026-04-14-phase13c-ai-synthesis.md) / [設計書](../superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md) / [生成ログ](./generation-log.md)
- [ ] Phase 13-D: レビューツール拡張
- [ ] Phase 13-E: 軽量スキーマ移行
- [ ] Phase 13-F: v2.0 リリース

## Phase 13-A の使い方

5 ソース（大菌輪・Wikipedia ja/en・厚労省自然毒・林野庁特用林産物・Trait Circus）から学名指定で一次情報を集約する CLI。

### 1. Python 依存をインストール（初回のみ）

```bash
pip install -r scripts/phase13/requirements.txt
```

### 2. Trait Circus Parquet を species 別 JSON に変換（初回のみ、約 3 分）

```bash
python scripts/phase13/trait-circus-prep.py --download
python scripts/phase13/trait-circus-prep.py
```

`.cache/phase13/trait-circus/by-species/<scientific_name>.json` に約 4 万種の trait JSON が生成される。

### 3. 学名 + MycoBank ID で全ソース取得

```bash
node scripts/phase13/fetch_sources.mjs \
  --name "Morchella esculenta" \
  --mycobank 247978 \
  --out .cache/phase13/combined/Morchella_esculenta.json
```

`--out` を省略すると stdout に JSON 出力。

### 出力 JSON 形式

```json
{
  "scientificName": "Morchella esculenta",
  "japaneseName": "アミガサタケ",
  "taxonomy": { "phylum": "...", "class": "...", "order": "...", "family": "...", "genus": "..." },
  "synonyms": [...],
  "mycoBankId": 247978,
  "observations": { "domestic": 288, "overseas": 12670 },
  "externalLinks": [...],
  "sources": {
    "daikinrin": { ... },
    "wikipediaJa": { "title": "...", "extract": "..." },
    "wikipediaEn": { ... },
    "mhlw": null,
    "rinya": { ... },
    "traitCircus": { "summary": { "pileus": { "color": [...] }, ... } }
  },
  "combinedAt": "..."
}
```

`japaneseName` は daikinrin → mhlw の順で fallback。どのソースも取れない場合は `null`。

## キャッシュ

- `.cache/phase13/<namespace>/*.json` — ソース別キャッシュ（gitignore 済）
  - `daikinrin/`, `wikipedia-ja/`, `wikipedia-en/`, `mhlw-index/`, `mhlw-detail/`, `rinya/`, `trait-circus/by-species/`
- `.cache/phase13/combined/*.json` — オーケストレータの統合出力

キャッシュ無効化は該当ファイル/ディレクトリを削除して再実行。

## 既知の制約

- **MycoBank ID は手動指定**: 自動解決は Phase 13-B で実装予定（GBIF backbone 経由）
- **daikinrin 未登録種**: HTTP 404 で `daikinrin: null`、他ソースは継続取得
- **Trait Circus データ範囲**: Tricholoma など一部の属を含まない種がある（データ側制約）
- **PDF 詳細ページ**: 厚労省で混在。本文抽出は Phase 13-C で `pdfplumber` 経由

## Phase 13-B / 13-B' の使い方

日本産菌類集覧 + Tier 0 手動リストからシグナルを集約し、重み付けスコアで tier 分類した `data/species-ranking.json` を出力する。

### 実行

```bash
# 全量実行（3,145 候補、concurrency 3 推奨）
node scripts/phase13/build_ranking.mjs --concurrency 3

# スモーク実行
node scripts/phase13/build_ranking.mjs --limit 500 --concurrency 3
```

### Phase 13-B' で追加された正規化層

- 全候補を GBIF Backbone Taxonomy の **accepted name** に正規化
- 旧名/新名の checklist 登録が 1 エントリに自動統合（例: `Amanita hemibapha` ↔ `A. caesareoides`）
- シグナル収集器は accepted → synonyms[] の順に試行（Wikipedia, iNat, GBIF observations）
- Tier 0 指名も正規化、pool 不在の種は `tier0Forced: true` で強制追加

### Phase 13-B' 本番実行統計 (2026-04-14)

| 指標 | Phase 13-B | Phase 13-B' |
|---|---|---|
| 候補総数 | 3,145 | 2,906 (accepted で merge) |
| tier0 完全一致 | 52/73 (71%) | 68/68 (100%) |
| GBIF 国内観察 hit | 292 (9.3%) | 642 (22.1%) |
| iNat 写真 hit | 537 (17.1%) | 604 (20.8%) |
| 毒性判定 | 195 (6.2%) | 240 (8.3%) |
| status=SYNONYM (統合された旧名) | - | 607 件 |

### 既知の caveat

- 複数和名を持つ種（例 `Omphalotus guepiniiformis` ツキヨタケ）では、`japaneseName`（primary）が checklist 処理順依存。`japaneseNames[]` には全異名が含まれるが、先頭が最も代表的な和名とは限らない。将来的には tier0 doc の wamei を primary 優先する heuristic を検討。
- MycoBank ID は依然として 0 件解決（GBIF の identifiers に MycoBank が登録されていない既知問題）。Phase 13-C で daikinrin index スクレイプ等別経路を検討。

## Phase 13-C の使い方

Phase 13-A/B の成果物（combined source + ranking）を入力として Claude Opus 4.6 で記事 JSON を合成する。

### 1. prepare（対象解決 + プロンプト書き出し）

```bash
node scripts/phase13/generate_articles.mjs --prepare
```

`.cache/phase13/prompts/manifest.json` と `.cache/phase13/prompts/<slug>.txt` が生成される。

### 2. 合成（Claude Code セッション内）

manifest の各 slug について Agent ツールで `model: "opus"` を指定して発射。concurrency 5 推奨。
出力は `.cache/phase13/generated/<slug>.json`。

### 3. 検証

```bash
node scripts/phase13/generate_articles.mjs --validate
```

`.cache/phase13/generation-report.json` に各 slug の pass / needs_regeneration を出力。

### 4. 採用候補の commit

pass 判定を `generated/articles/` にコピーして commit。tier0 batch #1（62 種）の成果と傾向は [生成ログ](./generation-log.md) を参照。

詳細は [計画書](../superpowers/plans/2026-04-14-phase13c-ai-synthesis.md) を参照。
