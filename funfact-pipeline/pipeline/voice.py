"""Stage 4: synthesize narration with ElevenLabs, one clip per segment.

Per-segment clips mean each segment's audio duration directly determines how
long its image stays on screen — no forced alignment needed. Offline mode
writes silent WAVs whose length approximates spoken pace.
"""

import wave
from pathlib import Path
from typing import List

import httpx

from .config import Config
from .models import VideoScript

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
WORDS_PER_SECOND = 2.4  # used only for offline silent stand-ins


def synthesize(cfg: Config, script: VideoScript, out_dir: Path, offline: bool = False) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, segment in enumerate(script.all_segments):
        if offline:
            path = out_dir / f"segment_{i:02d}.wav"
            duration = max(2.0, len(segment.narration.split()) / WORDS_PER_SECOND)
            _silent_wav(path, duration)
        else:
            path = out_dir / f"segment_{i:02d}.mp3"
            _elevenlabs_tts(cfg, segment.narration, path)
        paths.append(path)
        print(f"  audio {i + 1}/{len(script.all_segments)}: {path.name}")
    return paths


def _elevenlabs_tts(cfg: Config, text: str, path: Path, retries: int = 3) -> None:
    if not cfg.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set (or run with --offline)")
    last_error = None
    for _ in range(retries):
        try:
            response = httpx.post(
                ELEVENLABS_TTS_URL.format(voice_id=cfg.voice_id),
                params={"output_format": "mp3_44100_128"},
                headers={"xi-api-key": cfg.elevenlabs_api_key},
                json={"text": text, "model_id": cfg.tts_model},
                timeout=120,
            )
            response.raise_for_status()
            path.write_bytes(response.content)
            return
        except httpx.HTTPError as exc:
            last_error = exc
    raise RuntimeError(f"TTS failed after {retries} attempts: {last_error}")


def _silent_wav(path: Path, duration_seconds: float, sample_rate: int = 44100) -> None:
    frames = int(duration_seconds * sample_rate)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * frames)
