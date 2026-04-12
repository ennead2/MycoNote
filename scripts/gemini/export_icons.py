"""
Export D3 variant to PWA icon sizes.

- 192x192 (manifest)
- 512x512 (manifest, maskable)
- 32x32 (favicon)
- 180x180 (apple-touch-icon)

All written as PNG.
"""

from pathlib import Path
from PIL import Image

SCRIPT_DIR = Path(__file__).parent
SRC = SCRIPT_DIR / "output" / "variant_d3_refined_emblem.jpg"
PUBLIC_ICONS = SCRIPT_DIR.parent.parent / "public" / "icons"
PUBLIC_ROOT = SCRIPT_DIR.parent.parent / "public"

TARGETS = [
    (PUBLIC_ICONS / "icon-192x192.png", 192),
    (PUBLIC_ICONS / "icon-512x512.png", 512),
    (PUBLIC_ICONS / "icon-32x32.png", 32),
    (PUBLIC_ICONS / "apple-touch-icon.png", 180),
]


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"source not found: {SRC}")

    src_img = Image.open(SRC).convert("RGB")
    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)

    for dest, size in TARGETS:
        resized = src_img.resize((size, size), Image.LANCZOS)
        resized.save(dest, format="PNG", optimize=True)
        print(f"[saved] {dest} ({size}x{size})")

    # favicon.ico (multi-size)
    favicon_path = PUBLIC_ROOT / "favicon.ico"
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [src_img.resize(s, Image.LANCZOS) for s in ico_sizes]
    ico_imgs[0].save(favicon_path, format="ICO", sizes=ico_sizes, append_images=ico_imgs[1:])
    print(f"[saved] {favicon_path} (multi-size ICO)")


if __name__ == "__main__":
    main()
