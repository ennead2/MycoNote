"""
Variant D (Washi Emblem) をベースに微調整バリアントを生成する。

改善ポイント:
- きのこシルエットを大きく（32pxでも読めるように）
- シルエットの形をもう少しきのこらしく明確化
- 和紙テクスチャと反転配色（森色のきのこ on 和紙クリーム）は維持
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image

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

# base: Variant D
BASE_IMAGE_PATH = OUTPUT_DIR / "variant_d_washi_emblem.jpg"
if not BASE_IMAGE_PATH.exists():
    print(f"ERROR: base image not found: {BASE_IMAGE_PATH}")
    sys.exit(1)

base_img = Image.open(BASE_IMAGE_PATH)

# 3 refinement directions
REFINEMENTS = [
    {
        "name": "variant_d1_bigger_mushroom",
        "prompt": """Keep this design style exactly: washi paper circular medallion on deep forest moss green (#2F5233) background,
dark moss-colored mushroom silhouette on cream washi (#EDE3D0).

Changes needed:
1. Make the mushroom silhouette SIGNIFICANTLY LARGER — it should fill about 65-70% of the medallion diameter (currently only ~40%)
2. The mushroom silhouette itself should be more iconic and symmetric — a clear cap over a clear stem, like a kamon (Japanese family crest)
3. Keep ALL other elements: washi fiber texture, medallion embossing, background green, cream color
4. No text, no letters.

This is a PWA app icon so the mushroom needs to be readable at 32px.
Square 1:1 format.""",
    },
    {
        "name": "variant_d2_no_medallion",
        "prompt": """Refine this design: remove the circular medallion border. Instead, make the ENTIRE SQUARE the washi cream (#EDE3D0) surface,
with a large dark moss green (#2F5233) mushroom silhouette taking up about 70% of the square.

Keep the washi paper fiber texture throughout the cream surface.
Keep the confident, mingei-craft feel.
Mushroom should be iconic and symmetric (cap + stem).
No text, no letters.
Square 1:1 PWA app icon, needs to read at 32px.""",
    },
    {
        "name": "variant_d3_refined_emblem",
        "prompt": """Keep this exact design concept (washi circular medallion emblem on moss green background),
but refine with these specific changes:

1. The mushroom silhouette: make it larger (60% of medallion), and redraw it as a clear hanga-style woodblock print shape — confident outline, slightly organic (not geometric)
2. The washi texture: increase visibility of paper fibers slightly (still subtle)
3. The medallion edge: keep the subtle embossing
4. Color: inverted scheme preserved — dark moss (#1E3621 or #2F5233) mushroom on cream washi (#EDE3D0)
5. Background: deep moss green (#2F5233)

This should feel like a traditional apothecary seal or handmade botanical guide marker — confident, scholarly, warm.
No text, no letters.
Square 1:1 format for PWA app icon.""",
    },
]


def refine(variant: dict) -> Path | None:
    name = variant["name"]
    prompt = variant["prompt"]
    output_path = OUTPUT_DIR / f"{name}.jpg"

    print(f"\n[refining] {name} ...")
    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[prompt, base_img],
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
    print(f"Base: {BASE_IMAGE_PATH}")
    print(f"Output dir: {OUTPUT_DIR}")

    results = []
    for i, v in enumerate(REFINEMENTS):
        p = refine(v)
        if p:
            results.append(p)
        if i < len(REFINEMENTS) - 1:
            time.sleep(3)

    print(f"\n[done] {len(results)}/{len(REFINEMENTS)} refined.")
    for p in results:
        print(f"  - {p}")


if __name__ == "__main__":
    main()
