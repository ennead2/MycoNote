# Phase 13: 大菌輪ベース RAG 方式 図鑑再構築

設計書: [../superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md](../superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md)

## サブフェーズ

- [x] Phase 13-A: データソース収集基盤 — [計画書](../superpowers/plans/2026-04-13-phase13a-data-source-foundation.md)
- [ ] Phase 13-B: 種選定 + スコアリング
- [ ] Phase 13-C: AI 合成パイプライン
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
