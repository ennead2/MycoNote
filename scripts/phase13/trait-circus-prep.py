#!/usr/bin/env python3
"""
Trait Circus Parquet を species 別 JSON に変換する。

Usage:
  python scripts/phase13/trait-circus-prep.py --download
  python scripts/phase13/trait-circus-prep.py
  python scripts/phase13/trait-circus-prep.py --species "Morchella esculenta"

Source: Atsushi/fungi_trait_circus_database (CC BY 4.0)
"""
import argparse
import json
import os
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = ROOT / '.cache' / 'phase13' / 'trait-circus'
PARQUET_PATH = CACHE_DIR / 'fungi_trait_circus_database.parquet'
PARQUET_URL = (
    'https://huggingface.co/datasets/Atsushi/fungi_trait_circus_database/'
    'resolve/main/fungi_trait_circus_database.parquet'
)


def download_parquet():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if PARQUET_PATH.exists():
        print(f'Parquet already exists: {PARQUET_PATH}')
        return
    print(f'Downloading Parquet from {PARQUET_URL}...')
    res = requests.get(PARQUET_URL, stream=True, timeout=120)
    res.raise_for_status()
    with open(PARQUET_PATH, 'wb') as f:
        for chunk in res.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    print(f'Saved to {PARQUET_PATH} ({PARQUET_PATH.stat().st_size // (1 << 20)} MB)')


def convert(species_filter=None):
    if not PARQUET_PATH.exists():
        print('Parquet not found. Run with --download first.', file=sys.stderr)
        sys.exit(1)
    print(f'Reading {PARQUET_PATH}...')
    df = pd.read_parquet(PARQUET_PATH)
    required = {'trait', 'hitword', 'raw', 'source', 'scientificname', 'current_name'}
    missing = required - set(df.columns)
    if missing:
        print(f'Missing columns: {missing}', file=sys.stderr)
        sys.exit(1)

    if species_filter:
        df = df[df['current_name'] == species_filter]
        print(f'Filtered to {len(df)} rows for "{species_filter}"')

    out_dir = CACHE_DIR / 'by-species'
    out_dir.mkdir(parents=True, exist_ok=True)

    grouped = df.groupby('current_name')
    count = 0
    for name, group in grouped:
        if not isinstance(name, str) or not name.strip():
            continue
        safe = name.replace('/', '_').replace(' ', '_')
        out_path = out_dir / f'{safe}.json'
        traits = [
            {
                'trait': row['trait'],
                'hitword': row['hitword'],
                'raw': row['raw'],
                'source': row['source'],
                'scientificname': row['scientificname'],
            }
            for _, row in group.iterrows()
        ]
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump({'currentName': name, 'traits': traits}, f, ensure_ascii=False, indent=2)
        count += 1
    print(f'Wrote {count} species files to {out_dir}')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--download', action='store_true', help='Download Parquet')
    p.add_argument('--species', help='Only convert this species (for testing)')
    args = p.parse_args()

    if args.download:
        download_parquet()
    convert(species_filter=args.species)


if __name__ == '__main__':
    main()
