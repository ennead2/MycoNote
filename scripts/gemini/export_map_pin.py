"""
Post-process a chosen map pin variant:
  1. Remove the white background → transparent alpha channel
  2. Auto-crop to content bounding box (trim excess white margin)
  3. Resize to @1x and @2x Leaflet icon sizes
  4. Save PNGs to public/icons/map-pin.png + map-pin@2x.png

Usage:
    python scripts/gemini/export_map_pin.py pin_a_balloon_mushroom

The argument is the variant name (= file stem under output/). Defaults to
pin_a_balloon_mushroom if omitted.

Tuning:
    --threshold N    pixels with R,G,B all >= N are treated as background.
                     Default 240. Lower (220) if pale washi details leak out.
    --size W,H       @1x pixel size. Default 48,48.
    --no-trim        skip auto-crop of the transparent margin.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"
PUBLIC_ICONS = SCRIPT_DIR.parent.parent / "public" / "icons"


def remove_white_background(img: Image.Image, threshold: int) -> Image.Image:
    """Map near-white pixels to transparent, keep everything else fully opaque.

    Uses per-pixel brightness: any pixel where all three channels are >=
    `threshold` becomes transparent. Slight ramp avoids harsh edges at the
    boundary — pixels in [threshold-8, threshold] fade to partial alpha.
    """
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    ramp_lo = max(0, threshold - 8)
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            m = min(r, g, b)
            if m >= threshold:
                pixels[x, y] = (r, g, b, 0)
            elif m >= ramp_lo:
                # Linear fade across the narrow band so edges don't halo.
                alpha = int(255 * (threshold - m) / (threshold - ramp_lo))
                pixels[x, y] = (r, g, b, alpha)
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    """Crop away fully-transparent rows/cols. Keeps 2px padding for safety."""
    assert img.mode == "RGBA"
    bbox = img.getbbox()
    if not bbox:
        return img
    pad = 2
    w, h = img.size
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w, right + pad)
    bottom = min(h, bottom + pad)
    return img.crop((left, top, right, bottom))


def fit_into_square(img: Image.Image, out_size: int) -> Image.Image:
    """Scale image preserving aspect so its longer side = out_size, then
    paste centered on a transparent square canvas of side out_size."""
    assert img.mode == "RGBA"
    w, h = img.size
    scale = out_size / max(w, h)
    new = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (out_size, out_size), (0, 0, 0, 0))
    canvas.paste(new, ((out_size - new.width) // 2, (out_size - new.height) // 2), new)
    return canvas


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("variant", nargs="?", default="pin_a_balloon_mushroom",
                    help="variant name (filename stem under output/)")
    ap.add_argument("--threshold", type=int, default=240,
                    help="background-white threshold 0-255 (default 240)")
    ap.add_argument("--size", default="48",
                    help="@1x output size in pixels, default 48")
    ap.add_argument("--no-trim", action="store_true")
    args = ap.parse_args()

    src = OUTPUT_DIR / f"{args.variant}.jpg"
    if not src.exists():
        raise SystemExit(f"source not found: {src}")

    size_1x = int(args.size)
    size_2x = size_1x * 2

    print(f"source: {src}")
    img = Image.open(src)
    img = remove_white_background(img, args.threshold)
    print(f"  removed background (threshold={args.threshold})")

    if not args.no_trim:
        before = img.size
        img = trim_alpha(img)
        print(f"  trimmed alpha: {before} → {img.size}")

    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)

    # @2x first (larger, crisper), then downscale for @1x
    out_2x = fit_into_square(img, size_2x)
    out_1x = fit_into_square(img, size_1x)

    dest_1x = PUBLIC_ICONS / "map-pin.png"
    dest_2x = PUBLIC_ICONS / "map-pin@2x.png"
    out_1x.save(dest_1x, format="PNG", optimize=True)
    out_2x.save(dest_2x, format="PNG", optimize=True)
    print(f"[saved] {dest_1x} ({size_1x}x{size_1x})")
    print(f"[saved] {dest_2x} ({size_2x}x{size_2x})")


if __name__ == "__main__":
    main()
