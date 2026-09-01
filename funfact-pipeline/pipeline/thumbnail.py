"""Stage 6: thumbnail — the hook segment's image with the title composited on."""

import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .config import Config, find_font

THUMB_SIZE = (1280, 720)


def make_thumbnail(cfg: Config, source_image: Path, title: str, out: Path) -> Path:
    img = Image.open(source_image).convert("RGB")
    img = img.resize(THUMB_SIZE)
    draw = ImageDraw.Draw(img)

    font_path = find_font(cfg)
    font = ImageFont.truetype(font_path, 88) if font_path else ImageFont.load_default()

    lines = textwrap.wrap(title.upper(), width=16)[:3]
    y = THUMB_SIZE[1] - 130 - (len(lines) - 1) * 100
    for line in lines:
        draw.text((60, y), line, font=font, fill="white",
                  stroke_width=8, stroke_fill="black")
        y += 100

    img.save(out, quality=90)
    return out
