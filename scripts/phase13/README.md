# Phase 13 Data Ingestion Pipeline

学名を指定して一次ソースから構造化データを収集する CLI。

## Usage

```bash
node scripts/phase13/fetch_sources.mjs --name "Morchella esculenta"
```

出力: `.cache/phase13/combined/<scientific_name>.json`

## Sources

- 大菌輪 (CC BY 4.0) — 学名・和名・分類・GBIF 観察数
- Wikipedia ja/en (CC BY-SA 4.0) — 本文
- 厚労省 自然毒 (政府標準利用規約) — 中毒症状（28種）
- 林野庁 特用林産物 (政府標準利用規約) — 俗説否定・栽培情報
- Trait Circus (CC BY 4.0) — 統制形質

## Setup

Parquet 前処理（初回のみ）：

```bash
pip install pandas pyarrow
python scripts/phase13/trait-circus-prep.py --download
```
