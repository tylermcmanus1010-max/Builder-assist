"""Stage 3: generate one image per segment via FLUX, on fal.ai or Replicate.

Offline mode draws Pillow placeholders instead, so the rest of the pipeline
can be exercised without an API key.
"""

import textwrap
import time
from pathlib import Path
from typing import List

import httpx

from .config import Config
from .models import VideoScript

FAL_RUN_URL = "https://fal.run/{model}"
REPLICATE_URL = "https://api.replicate.com/v1/models/{model}/predictions"


def resolve_provider(cfg: Config) -> str:
    """"auto" prefers whichever provider has a key, fal first."""
    if cfg.image_provider != "auto":
        return cfg.image_provider
    if cfg.fal_key:
        return "fal"
    if cfg.replicate_api_token:
        return "replicate"
    return "fal"  # fail in _fal_generate with its missing-key message


def generate_images(cfg: Config, script: VideoScript, out_dir: Path, offline: bool = False) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    provider = resolve_provider(cfg)
    paths = []
    # visual_anchors carries the story's recurring people/places so every
    # image renders them with the same details.
    anchors = f"{script.visual_anchors.strip()} " if script.visual_anchors else ""
    for i, segment in enumerate(script.all_segments):
        path = out_dir / f"segment_{i:02d}.png"
        prompt = cfg.style_prefix + anchors + segment.image_prompt
        if offline:
            _placeholder(prompt, path, cfg.image_width, cfg.image_height, i)
        elif provider == "replicate":
            _replicate_generate(cfg, prompt, path)
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


def _closest_aspect_ratio(width: int, height: int) -> str:
    """Replicate's FLUX models take a named aspect ratio, not pixel sizes."""
    supported = ["1:1", "16:9", "9:16", "21:9", "9:21",
                 "4:3", "3:4", "3:2", "2:3", "4:5", "5:4"]
    target = width / height
    return min(supported, key=lambda r: abs(target - int(r.split(":")[0]) / int(r.split(":")[1])))


def _replicate_generate(cfg: Config, prompt: str, path: Path, retries: int = 3) -> None:
    if not cfg.replicate_api_token:
        raise RuntimeError("REPLICATE_API_TOKEN is not set (or run with --offline)")
    headers = {"Authorization": f"Bearer {cfg.replicate_api_token}", "Prefer": "wait=60"}
    last_error = None
    for attempt in range(retries):
        try:
            response = httpx.post(
                REPLICATE_URL.format(model=cfg.replicate_image_model),
                headers=headers,
                json={"input": {
                    "prompt": prompt,
                    "aspect_ratio": _closest_aspect_ratio(cfg.image_width, cfg.image_height),
                    "num_outputs": 1,
                    "output_format": "png",
                    "megapixels": "1",
                }},
                timeout=120,
            )
            response.raise_for_status()
            prediction = response.json()
            # Prefer: wait usually returns the finished prediction; poll if not.
            deadline = time.monotonic() + 120
            while prediction["status"] not in ("succeeded", "failed", "canceled"):
                if time.monotonic() > deadline:
                    raise RuntimeError(f"prediction {prediction.get('id')} timed out")
                time.sleep(2)
                poll = httpx.get(prediction["urls"]["get"], headers=headers, timeout=30)
                poll.raise_for_status()
                prediction = poll.json()
            if prediction["status"] != "succeeded":
                raise RuntimeError(f"prediction {prediction['status']}: {prediction.get('error')}")
            output = prediction["output"]
            image_url = output[0] if isinstance(output, list) else output
            image_bytes = httpx.get(image_url, timeout=120)
            image_bytes.raise_for_status()
            path.write_bytes(image_bytes.content)
            return
        except (httpx.HTTPError, KeyError, IndexError, RuntimeError) as exc:
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
