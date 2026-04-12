"""
MycoNote 記録マップ用カスタムピン生成スクリプト

Design: 「現代の民藝図鑑」aesthetic に沿った円形エンブレム型ピン。
- キノコのシルエットを中央に配置
- Moss primary (#2F5233) + washi cream (#EDE3D0) の 2 色構成
- 複数バリアントを生成してユーザーが選ぶ

使い方:
    python scripts/gemini/generate_map_pin.py

後処理:
    python scripts/gemini/export_map_pin.py <variant_name>
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"
load_dotenv(SCRIPT_DIR / ".env")

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set. Edit scripts/gemini/.env and add your key.")
    sys.exit(1)

from google import genai
from google.genai import types

client = genai.Client(api_key=API_KEY)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 注意:
# - 背景は PURE WHITE (#FFFFFF) を明示指定 → 後処理で color-key 透明化
# - ピンは画像中央、周囲に余白を取る
# - 雫形 (pointed bottom) ではなく、「円形メダリオン + 下端が少し尖った」中間形
# - フラットイラスト、影は軽く

PIN_VARIANTS = [
    {
        "name": "pin_a_balloon_mushroom",
        "prompt": """A classic map pin icon for a Japanese mushroom field guide app, mingei-style.
Shape: rounded teardrop / balloon silhouette — circular head with a short pointed tail at the bottom.
Color: deep forest moss green fill (#2F5233), thin cream outline (#EDE3D0, 2px).
Inside the circular head: a simple stylized mushroom silhouette in cream washi color (#EDE3D0),
centered, clearly visible at small sizes. Single mushroom cap + stem, not cluttered.
Very soft drop shadow directly under the tail tip — just enough to feel "floating above a map".
Background: pure flat WHITE (#FFFFFF), no gradients, no texture, no other elements.
The pin occupies roughly the center 60% of the square frame with generous white margin on all sides.
Pin is upright, tail points straight down, perfectly symmetric.
Style: clean flat illustration with a touch of woodblock-print softness, like a traditional apothecary mark.
NO TEXT, NO letters, NO numbers. NO ring of dots or other decoration around the pin.
Square 1:1 format, 2K resolution.
""",
    },
    {
        "name": "pin_b_medallion_emblem",
        "prompt": """A circular medallion-style map pin for a mushroom field guide, Japanese mingei aesthetic.
Shape: perfectly round circle (no pointed tail) with a subtle raised-stamp look, like a seal or crest.
Outer ring: thin cream (#EDE3D0) border.
Inner fill: deep forest moss green (#2F5233).
Inside the circle: a simple mushroom silhouette in cream washi (#EDE3D0), centered, confident silhouette.
Directly under the circle, centered, a very small thin dark-green triangle — implies "this location" without being a full balloon tail.
Very soft circular drop shadow below the circle for subtle depth.
Background: pure flat WHITE (#FFFFFF), nothing else.
The circle takes about 60% of the frame width, generous white margin.
Style: looks like a stamp / handmade seal. Flat, not skeuomorphic.
NO TEXT, NO letters, NO numbers.
Square 1:1 format, 2K resolution.
""",
    },
    {
        "name": "pin_c_woodcut_droplet",
        "prompt": """A map location pin rendered in Japanese mokuhanga (woodblock print) style.
Shape: classic location-pin teardrop — circular top, narrowing to a pointed bottom tip.
Color palette: deep moss green (#2F5233) as the main fill, cream washi (#EDE3D0) for the mushroom and thin outline.
Inside the circular top: a bold single mushroom silhouette in cream, with very slight woodgrain texture suggesting hand-carving.
Pin edges slightly uneven — hand-crafted mingei feel, not sharp geometric.
Soft shadow under the tip.
Background: pure flat WHITE (#FFFFFF), nothing else.
Pin centered, ~60% of frame, generous white margin.
NO TEXT, NO letters, NO numbers.
Square 1:1 format, 2K resolution.
""",
    },
    {
        "name": "pin_d_minimal_kamon",
        "prompt": """A minimal family-crest (kamon) style map pin icon for a mushroom app.
Shape: a tall rounded droplet silhouette — basically a circle with a short rounded triangular tail at bottom,
rendered as a pure cream washi silhouette (#EDE3D0) with a bold deep-moss-green (#2F5233) mushroom cut out of its center.
The cutout mushroom is a confident negative-space shape (reverse figure-ground).
Thin moss-green outline (#2F5233, 2px) around the entire pin shape for definition.
Very subtle shadow under the tip.
Background: pure flat WHITE (#FFFFFF), nothing else.
Pin centered, ~60% of frame, generous white margin on all sides.
Style: like an edo-era family crest — bold, symmetric, instantly legible even at 24px.
NO TEXT, NO letters, NO numbers.
Square 1:1 format, 2K resolution.
""",
    },
]


def generate_pin(variant: dict) -> Path | None:
    name = variant["name"]
    prompt = variant["prompt"]
    output_path = OUTPUT_DIR / f"{name}.jpg"

    print(f"\n[generating] {name} ...")
    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="1:1",
                    image_size="2K",
                ),
            ),
        )
        for part in response.parts:
            if part.text:
                print(f"  [text] {part.text[:200]}")
            elif part.inline_data:
                image = part.as_image()
                image.save(output_path)
                print(f"  [saved] {output_path}")
                return output_path
    except Exception as e:
        print(f"  [error] {e}")
        return None

    return None


def main() -> None:
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Generating {len(PIN_VARIANTS)} pin variants...")

    results = []
    for i, variant in enumerate(PIN_VARIANTS):
        path = generate_pin(variant)
        if path:
            results.append(path)
        if i < len(PIN_VARIANTS) - 1:
            time.sleep(3)

    print(f"\n[done] Generated {len(results)}/{len(PIN_VARIANTS)} pin variants.")
    for p in results:
        print(f"  - {p}")

    # 比較 HTML を生成
    html_path = OUTPUT_DIR / "compare_pins.html"
    html = ["<!doctype html><meta charset='utf-8'>",
            "<title>MycoNote Map Pin variants</title>",
            "<style>body{font-family:sans-serif;background:#F5F1E8;padding:2rem;}",
            "h1{color:#2F5233}",
            ".grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;max-width:1000px}",
            ".card{background:#fff;border:1px solid #ccc;border-radius:8px;padding:1rem;text-align:center}",
            ".card img{max-width:100%;height:auto;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/20px 20px}",
            ".card h2{font-size:14px;margin:0.5rem 0 0}",
            ".mini{margin-top:0.5rem;display:flex;gap:0.5rem;justify-content:center;align-items:center}",
            ".mini img{width:32px;height:32px;background:#E8E1D0}",
            ".mini img+img{width:48px;height:48px}",
            "</style>",
            "<h1>MycoNote Map Pin variants — pick one</h1>",
            "<p>Chequered background shows where transparent will end up. Mini previews (32px, 48px) show Leaflet-sized output.</p>",
            "<div class='grid'>"]
    for p in results:
        fn = p.name
        html.append(
            f"<div class='card'><img src='{fn}' alt='{fn}'><h2>{p.stem}</h2>"
            f"<div class='mini'><img src='{fn}'><img src='{fn}'></div></div>"
        )
    html.append("</div>")
    html_path.write_text("\n".join(html), encoding="utf-8")
    print(f"  - {html_path}  ← 比較用 HTML")


if __name__ == "__main__":
    main()
