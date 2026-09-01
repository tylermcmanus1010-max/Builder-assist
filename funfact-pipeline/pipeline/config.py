"""Configuration loading: config.yaml for channel settings, env vars for secrets."""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config.yaml"


@dataclass
class Config:
    # Content
    channel_name: str = "Nighttime Stories"
    subject_wheel: List[str] = field(default_factory=lambda: [
        "unsolved disappearances", "shipwrecks and maritime disasters",
        "doomed expeditions", "ghost towns and abandoned places",
        "lost civilizations", "daring escapes and heists",
        "wilderness survival", "historical mysteries",
        "legends and cursed treasures", "strange events no one can explain",
    ])
    segments_per_video: int = 12
    style_prefix: str = (
        "Atmospheric painterly night scene, cinematic, muted deep blues with "
        "warm lamplight accents, soft mist, dreamlike calm, "
        "no text, no words, no letters. "
    )

    # Models / services
    claude_model: str = "claude-opus-5"
    claude_fallback_model: str = "claude-opus-4-8"
    image_provider: str = "auto"  # "fal", "replicate", or "auto" (first provider with a key)
    image_model: str = "fal-ai/flux/schnell"
    replicate_image_model: str = "black-forest-labs/flux-schnell"
    image_width: int = 1920
    image_height: int = 1088  # multiple of 32 for FLUX; cropped to 1080 at assembly
    voice_id: str = "nPczCjzI2devNBz1zQrb"  # Brian: deep, resonant, comforting
    tts_model: str = "eleven_multilingual_v2"
    # Delivery tuned for sleep content: high stability evens out the read,
    # zero style keeps it understated, speed < 1 slows the pace.
    voice_stability: float = 0.75
    voice_similarity_boost: float = 0.75
    voice_style: float = 0.0
    voice_speed: float = 0.85

    # Video
    fps: int = 30
    video_width: int = 1920
    video_height: int = 1080
    music_path: Optional[str] = None  # royalty-free track; ducked under narration
    music_volume: float = 0.12
    font_path: Optional[str] = None  # auto-detected if None
    subtitle_font_size: int = 56
    subtitle_max_chars: int = 42  # max characters per timed subtitle cue

    # Upload
    privacy_status: str = "unlisted"  # review gate: flip to public in YouTube Studio
    category_id: str = "27"  # Education

    # Paths
    state_dir: str = str(PROJECT_ROOT / "state")
    build_dir: str = str(PROJECT_ROOT / "build")

    # Secrets (env only, never in config.yaml)
    anthropic_api_key: Optional[str] = None
    fal_key: Optional[str] = None
    replicate_api_token: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    yt_client_secret_path: str = str(PROJECT_ROOT / "client_secret.json")
    yt_token_path: str = str(PROJECT_ROOT / "token.json")


def _load_dotenv(path: Path) -> None:
    """Load KEY=value lines from .env into the environment (no override)."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def load_config(path: Optional[Path] = None) -> Config:
    _load_dotenv(PROJECT_ROOT / ".env")
    cfg = Config()
    config_path = path or DEFAULT_CONFIG_PATH
    if config_path.exists():
        data = yaml.safe_load(config_path.read_text()) or {}
        for key, value in data.items():
            if hasattr(cfg, key) and not key.endswith(("_key", "_secret_path", "_token_path", "_api_token")):
                setattr(cfg, key, value)
    # FUNFACT_ANTHROPIC_API_KEY is a fallback name for platforms that reserve
    # or strip the standard ANTHROPIC_API_KEY variable (e.g. Claude Code
    # remote environments).
    cfg.anthropic_api_key = (
        os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("FUNFACT_ANTHROPIC_API_KEY")
    )
    cfg.fal_key = os.environ.get("FAL_KEY")
    cfg.replicate_api_token = os.environ.get("REPLICATE_API_TOKEN")
    cfg.elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY")
    cfg.yt_client_secret_path = os.environ.get("YT_CLIENT_SECRET_PATH", cfg.yt_client_secret_path)
    cfg.yt_token_path = os.environ.get("YT_TOKEN_PATH", cfg.yt_token_path)
    return cfg


def find_font(cfg: Config) -> Optional[str]:
    """Locate a usable TTF for captions/thumbnails."""
    if cfg.font_path and Path(cfg.font_path).exists():
        return cfg.font_path
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    return None
