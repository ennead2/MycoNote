"""
MycoNote アプリアイコン生成スクリプト

DESIGN.md の「現代の民藝図鑑」方針に基づき、
PWA 用アプリアイコン候補を複数生成する。

使い方:
    python scripts/gemini/generate_app_icon.py
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

# MycoNote デザインシステムに基づくアイコンプロンプト候補
# 各候補は異なる表現アプローチを試す
ICON_VARIANTS = [
    {
        "name": "variant_a_serif_mingei",
        "prompt": """A modern mingei-style app icon for a Japanese mushroom field guide PWA.
Design: A single stylized mushroom silhouette (simple cap + stem, not cute or cartoony),
rendered in cream color (#EDE3D0) on a deep forest moss green background (#2F5233).
Style: Japanese mingei folk-craft aesthetic meets modern minimal flat design.
The mushroom should feel like a woodblock print (hanga) — confident brush strokes, not sharp vectors.
Very subtle washi paper texture visible in the background.
NO TEXT. NO letters. NO words.
Icon must be centered with generous padding (safe zone) so it works as a maskable PWA icon.
The design is symmetric, calm, and suggests "a small handbook of the forest."
Square format, no rounded corners (OS will mask).
""",
    },
    {
        "name": "variant_b_illustrated_woodcut",
        "prompt": """A Japanese woodblock print (mokuhanga) style app icon for a mushroom field guide.
Design: A single iconic shiitake-like mushroom rendered as if carved from wood,
with visible grain texture in the cream-colored cap (#EDE3D0) and stem.
Background: deep moss green (#2F5233) with a subtle warm radial gradient.
Style: modern interpretation of edo-period botanical illustration.
Slightly imperfect edges to suggest hand-craft (mingei).
NO TEXT, NO letters, NO numbers.
Centered with safe padding for maskable PWA icon.
Mood: quiet, intentional, "artisan's reference book."
Square 1:1 format, flat design, no drop shadows.
""",
    },
    {
        "name": "variant_c_symbol_minimal",
        "prompt": """A minimal geometric app icon for a mushroom identification app.
Design: Single stylized mushroom — two simple shapes (semi-circle cap over rectangle stem),
rendered in cream color (#EDE3D0) on deep forest moss green (#2F5233).
Style: inspired by Japanese family crests (kamon) — bold, symmetric, instantly recognizable.
Zero decoration. No illustration detail. Pure silhouette.
Subtle 2% noise texture on the background for warmth.
NO TEXT, NO letters.
Generous safe zone padding for maskable PWA icon.
Mood: confident, classical, like a traditional seal or mark.
Square 1:1 format.
""",
    },
    {
        "name": "variant_d_washi_emblem",
        "prompt": """A refined emblem-style app icon for a Japanese mushroom field guide.
Design: A circular washi-paper medallion centered on a deep forest moss green (#2F5233) square background.
Inside the medallion: a single mushroom silhouette in deep moss (#1E3621) on cream washi (#EDE3D0).
Add extremely subtle indentation/embossing around the medallion edge.
Very subtle washi paper fiber texture visible in the cream area.
NO TEXT, NO letters, NO numbers.
Centered with safe zone padding for maskable PWA icon.
Style: mingei meets modern — like a handmade stamp or traditional apothecary label.
Mood: timeless, warm, scholarly.
Square 1:1 format, flat design.
""",
    },
]


def generate_icon(variant: dict) -> Path:
    """Generate a single icon variant and save it."""
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
    print(f"Generating {len(ICON_VARIANTS)} icon variants...")

    results = []
    for i, variant in enumerate(ICON_VARIANTS):
        path = generate_icon(variant)
        if path:
            results.append(path)
        if i < len(ICON_VARIANTS) - 1:
            time.sleep(3)  # rate-limit friendly

    print(f"\n[done] Generated {len(results)}/{len(ICON_VARIANTS)} icons.")
    for p in results:
        print(f"  - {p}")


if __name__ == "__main__":
    main()
