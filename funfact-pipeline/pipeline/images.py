"""Stage 3: generate one image per segment via FLUX on fal.ai.

Offline mode draws Pillow placeholders instead, so the rest of the pipeline
can be exercised without an API key.
"""

import textwrap
from pathlib import Path
from typing import List

import httpx

from .config import Config
from .models import VideoScript

FAL_RUN_URL = "https://fal.run/{model}"


def generate_images(cfg: Config, script: VideoScript, out_dir: Path, offline: bool = False) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, segment in enumerate(script.all_segments):
        path = out_dir / f"segment_{i:02d}.png"
        prompt = cfg.style_prefix + segment.image_prompt
        if offline:
            _placeholder(prompt, path, cfg.image_width, cfg.image_height, i)
        else:
            _fal_generate(cfg, prompt, path)
        paths.append(path)
        print(f"  image {i + 1}/{len(script.all_segments)}: {path.name}")
    return paths


def _fal_generate(cfg: Config, prompt: str, path: Path, retries: int = 3) -> None:
    if not cfg.fal_key:
        raise RuntimeError("FAL_KEY is not set (or run with --offline)")
    last_error = None
    for attempt in range(retries):
        try:
            response = httpx.post(
                FAL_RUN_URL.format(model=cfg.image_model),
                headers={"Authorization": f"Key {cfg.fal_key}"},
                json={
                    "prompt": prompt,
                    "image_size": {"width": cfg.image_width, "height": cfg.image_height},
                    "num_images": 1,
                },
                timeout=120,
            )
            response.raise_for_status()
            image_url = response.json()["images"][0]["url"]
            image_bytes = httpx.get(image_url, timeout=120)
            image_bytes.raise_for_status()
            path.write_bytes(image_bytes.content)
            return
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            last_error = exc
    raise RuntimeError(f"Image generation failed after {retries} attempts: {last_error}")


def _placeholder(prompt: str, path: Path, width: int, height: int, seed: int) -> None:
    from PIL import Image, ImageDraw

    palette = [(41, 70, 120), (120, 60, 41), (44, 105, 78), (99, 52, 110), (140, 108, 34)]
    img = Image.new("RGB", (width, height), palette[seed % len(palette)])
    draw = ImageDraw.Draw(img)
    wrapped = textwrap.fill(prompt[:220], width=52)
    draw.multiline_text((80, height // 3), wrapped, fill=(240, 240, 240))
    img.save(path)
