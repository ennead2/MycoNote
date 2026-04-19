#!/usr/bin/env python3
"""Phase 17 S7: Trait Circus Parquet から大菌輪 4204 件の trait を lookup。

入力:
  - .cache/phase13/daikinrin-pages.json (大菌輪 pages index)
  - .cache/phase13/trait-circus/fungi_trait_circus_database.parquet (DL 必要)

出力:
  - data/phase17/trait-circus-lookup.json
    { "<scientificName>": { "traits": [...], "matched_via": "...", "trait_count": N } }
  - data/phase17/trait-circus-missing.json (unmatched 学名リスト)

マッチルール (Phase 15 fetch_species_traits.py と同じ):
  1. current_name 完全一致
  2. scientificname 完全一致 (current_name fallback)
  3. (Phase 17 は synonyms 合算なし、S4 完了後 2nd pass で追加する想定)

使い方:
  python scripts/phase17/fetch_all_species_traits.py --download
  python scripts/phase17/fetch_all_species_traits.py
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = ROOT / ".cache" / "phase13" / "trait-circus"
PARQUET_PATH = CACHE_DIR / "fungi_trait_circus_database.parquet"
PARQUET_URL = (
    "https://huggingface.co/datasets/Atsushi/fungi_trait_circus_database/"
    "resolve/main/fungi_trait_circus_database.parquet"
)
PAGES_JSON = ROOT / ".cache" / "phase13" / "daikinrin-pages.json"
OUT_LOOKUP = ROOT / "data" / "phase17" / "trait-circus-lookup.json"
OUT_MISSING = ROOT / "data" / "phase17" / "trait-circus-missing.json"


def download_parquet() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if PARQUET_PATH.exists():
        size_mb = PARQUET_PATH.stat().st_size // (1 << 20)
        print(f"Parquet already exists: {PARQUET_PATH} ({size_mb} MB)")
        return
    print(f"Downloading Parquet from {PARQUET_URL} ...")
    res = requests.get(PARQUET_URL, stream=True, timeout=600)
    res.raise_for_status()
    with open(PARQUET_PATH, "wb") as f:
        for chunk in res.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    size_mb = PARQUET_PATH.stat().st_size // (1 << 20)
    print(f"Saved to {PARQUET_PATH} ({size_mb} MB)")


def load_targets() -> list[dict]:
    """大菌輪 pages.json の和名付き 4204 件 + override 4 件の学名リスト。"""
    pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
    with_ja = [e for e in pages["entries"] if e.get("japaneseName")]
    # override 分 (4 件中 3 件は大菌輪に scientific ページあり、1 件はなし)
    overrides_path = ROOT / "data" / "phase17" / "ja-name-overrides.json"
    if overrides_path.exists():
        overrides = json.loads(overrides_path.read_text(encoding="utf-8"))
        existing_scis = {e["scientificName"] for e in with_ja}
        for o in overrides:
            if o["scientificName"] not in existing_scis:
                with_ja.append(
                    {
                        "scientificName": o["scientificName"],
                        "japaneseName": o["japaneseName"],
                        "mycoBankId": o.get("mycoBankId"),
                    }
                )
    return with_ja


def extract(targets: list[dict]) -> tuple[dict, list[dict]]:
    if not PARQUET_PATH.exists():
        print("Parquet not found. Run with --download first.", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {PARQUET_PATH} ...")
    df = pd.read_parquet(PARQUET_PATH)
    required = {"trait", "hitword", "raw", "source", "scientificname", "current_name"}
    missing = required - set(df.columns)
    if missing:
        print(f"Missing columns: {missing}", file=sys.stderr)
        sys.exit(1)
    print(f"Total Parquet rows: {len(df):,}")

    current_set = set(df["current_name"].dropna().unique())
    scientific_set = set(df["scientificname"].dropna().unique())
    print(f"current_name unique: {len(current_set):,}")
    print(f"scientificname unique: {len(scientific_set):,}")

    lookup = {}
    missing_targets = []

    for t in targets:
        sci = t["scientificName"]
        match_name = None
        match_mode = ""

        if sci in current_set:
            match_name = sci
            match_mode = "current_name_exact"
        elif sci in scientific_set:
            # scientificname でフィルタして current_name を確定（mode）
            sub = df[df["scientificname"] == sci]
            top = sub["current_name"].dropna().mode()
            if len(top) > 0:
                match_name = str(top.iloc[0])
                match_mode = "scientificname_then_current"

        if match_name is None:
            missing_targets.append(
                {
                    "scientificName": sci,
                    "japaneseName": t.get("japaneseName"),
                }
            )
            continue

        rows = df[df["current_name"] == match_name]
        traits = [
            {
                "trait": str(r["trait"]),
                "hitword": str(r.get("hitword") or ""),
                "raw": str(r.get("raw") or ""),
                "source": str(r.get("source") or ""),
            }
            for _, r in rows.iterrows()
        ]
        lookup[sci] = {
            "matched_current_name": match_name,
            "matched_via": match_mode,
            "trait_count": len(traits),
            "traits": traits,
        }

    return lookup, missing_targets


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--download", action="store_true", help="Parquet を必要ならダウンロード")
    args = p.parse_args()

    if args.download:
        download_parquet()

    targets = load_targets()
    print(f"Target species (大菌輪 ja + override): {len(targets)}")

    lookup, missing = extract(targets)
    print(f"Matched: {len(lookup)} / Missing: {len(missing)}")

    OUT_LOOKUP.parent.mkdir(parents=True, exist_ok=True)
    OUT_LOOKUP.write_text(json.dumps(lookup, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_MISSING.write_text(json.dumps(missing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_LOOKUP} ({OUT_LOOKUP.stat().st_size // 1024} KB)")
    print(f"Wrote {OUT_MISSING}")


if __name__ == "__main__":
    main()
