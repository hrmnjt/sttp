"""Make a small, locally hosted gruvbox-toned portrait from an approved photo.

Usage: uv run --no-project --with pillow python design/dither-avatar.py INPUT.jpg OUTPUT.png
The source image is not stored in this repository.
"""

import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

if len(sys.argv) != 3:
    raise SystemExit("usage: dither-avatar.py INPUT.jpg OUTPUT.png")

source = Image.open(sys.argv[1]).convert("RGB")
source = ImageOps.fit(
    source, (128, 128), method=Image.Resampling.LANCZOS, centering=(0.5, 0.47)
)
source = ImageEnhance.Contrast(source).enhance(1.12)
colors = ("#282828", "#665c54", "#bdae93", "#ebdbb2")
values = [int(color[i : i + 2], 16) for color in colors for i in (1, 3, 5)]
palette = Image.new("P", (1, 1))
palette.putpalette(values + [0] * (768 - len(values)))
portrait = source.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG)
portrait = portrait.convert("RGB").resize((384, 384), Image.Resampling.NEAREST)
Path(sys.argv[2]).parent.mkdir(parents=True, exist_ok=True)
portrait.save(sys.argv[2], optimize=True)
