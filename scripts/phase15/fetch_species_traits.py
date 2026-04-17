#!/usr/bin/env python3
"""
Phase 15 S1: Trait Circus Parquet から tier0+tier1 の 113 種分だけ抽出して
単一 JSON (`data/phase15/species-traits-raw.json`) を出力する。

Parquet は Phase 13-A と共有の `.cache/phase13/trait-circus/` を使い回す。
未取得なら --download で取得。

突合ルール:
  1. current_name で完全一致
  2. scientific_synonyms (mushrooms.json) のどれかが current_name または
     scientificname と一致
  3. 上記で見つからない種は "missing" として記録

Usage:
  python scripts/phase15/fetch_species_traits.py --download
  python scripts/phase15/fetch_species_traits.py

Source: Atsushi/fungi_trait_circus_database (CC BY 4.0)
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
MUSHROOMS_JSON = ROOT / "src" / "data" / "mushrooms.json"
OUT_JSON = ROOT / "data" / "phase15" / "species-traits-raw.json"


def download_parquet() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if PARQUET_PATH.exists():
        size_mb = PARQUET_PATH.stat().st_size // (1 << 20)
        print(f"Parquet already exists: {PARQUET_PATH} ({size_mb} MB)")
        return
    print(f"Downloading Parquet from {PARQUET_URL} ...")
    res = requests.get(PARQUET_URL, stream=True, timeout=300)
    res.raise_for_status()
    with open(PARQUET_PATH, "wb") as f:
        for chunk in res.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    size_mb = PARQUET_PATH.stat().st_size // (1 << 20)
    print(f"Saved to {PARQUET_PATH} ({size_mb} MB)")


def load_target_species() -> list[dict]:
    """mushrooms.json から id / scientific / synonyms を抽出。"""
    with open(MUSHROOMS_JSON, "r", encoding="utf-8") as f:
        rows = json.load(f)
    out = []
    for m in rows:
        out.append(
            {
                "id": m["id"],
                "ja": m["names"]["ja"],
                "scientific": m["names"]["scientific"],
                "synonyms": m["names"].get("scientific_synonyms", []) or [],
                "safety": m["safety"],
            }
        )
    return out


def extract(targets: list[dict]) -> dict:
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

    # current_name と scientificname の両方を見る。
    current_set = set(df["current_name"].dropna().unique())
    scientific_set = set(df["scientificname"].dropna().unique())

    results: list[dict] = []
    missing_species: list[dict] = []

    for t in targets:
        match_name: str | None = None
        match_mode: str = ""

        # 1. current_name 完全一致
        if t["scientific"] in current_set:
            match_name = t["scientific"]
            match_mode = "current_name_exact"
        else:
            # 2. synonym のいずれかが current_name
            for syn in t["synonyms"]:
                if syn in current_set:
                    match_name = syn
                    match_mode = "synonym_current_name"
                    break
            # 3. scientificname 側の完全一致（current_name 欠損ケース救済）
            if match_name is None and t["scientific"] in scientific_set:
                # scientificname でフィルタして current_name を確定（1 番多いもの）
                sub = df[df["scientificname"] == t["scientific"]]
                top = (
                    sub["current_name"].dropna().mode()
                    if not sub["current_name"].dropna().empty
                    else None
                )
                if top is not None and len(top) > 0:
                    match_name = str(top.iloc[0])
                    match_mode = "scientificname_then_current"

        if match_name is None:
            missing_species.append(
                {
                    "id": t["id"],
                    "ja": t["ja"],
                    "scientific": t["scientific"],
                    "synonyms": t["synonyms"],
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
                "scientificname": str(r.get("scientificname") or ""),
            }
            for _, r in rows.iterrows()
        ]
        results.append(
            {
                "id": t["id"],
                "ja": t["ja"],
                "scientific": t["scientific"],
                "matched_via": match_mode,
                "matched_current_name": match_name,
                "trait_count_raw": len(traits),
                "trait_key_count_unique": len({tt["trait"] for tt in traits}),
                "traits": traits,
            }
        )

    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "parquet_rows_total": len(df),
        "target_species": len(targets),
        "matched_species": len(results),
        "missing_species_count": len(missing_species),
        "missing_species": missing_species,
        "species": results,
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--download", action="store_true", help="Download Parquet if missing")
    args = p.parse_args()

    if args.download:
        download_parquet()

    targets = load_target_species()
    print(f"Target species (mushrooms.json): {len(targets)}")

    out = extract(targets)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    size_kb = OUT_JSON.stat().st_size // 1024
    print(f"Wrote {OUT_JSON} ({size_kb} KB)")

    print(f"\n=== S1 Match Summary ===")
    print(f"  matched:  {out['matched_species']} / {out['target_species']}")
    print(f"  missing:  {out['missing_species_count']}")
    if out["missing_species"]:
        print("\nMissing species:")
        for m in out["missing_species"][:20]:
            print(f"  - {m['ja']} ({m['scientific']})")
        if len(out["missing_species"]) > 20:
            print(f"  ... and {len(out['missing_species']) - 20} more")


if __name__ == "__main__":
    main()
