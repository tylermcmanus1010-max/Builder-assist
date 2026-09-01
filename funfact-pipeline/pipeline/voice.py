"""Stage 4: synthesize narration with ElevenLabs, one clip per segment.

Per-segment clips mean each segment's audio duration directly determines how
long its image stays on screen — no forced alignment needed. The
with-timestamps endpoint also returns character-level timings, saved as
segment_XX.align.json next to each clip so assembly can burn subtitles that
track the narration word by word. Offline mode writes silent WAVs (no
alignment) whose length approximates spoken pace.
"""

import base64
import json
import wave
from pathlib import Path
from typing import List, Optional

import httpx

from .config import Config
from .models import VideoScript

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
WORDS_PER_SECOND = 2.4  # used only for offline silent stand-ins


def alignment_path_for(audio: Path) -> Path:
    """Where a segment's timing data lives, next to its audio clip."""
    return audio.with_name(audio.stem + ".align.json")


def synthesize(cfg: Config, script: VideoScript, out_dir: Path, offline: bool = False) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    segments = script.all_segments
    paths, todo = [], []
    for i, segment in enumerate(segments):
        path = out_dir / (f"segment_{i:02d}.wav" if offline else f"segment_{i:02d}.mp3")
        # Resume support: a clip from an interrupted run is complete when its
        # timing data was also written, so it can be skipped, not re-billed.
        cached = path.exists() and (offline or alignment_path_for(path).exists())
        paths.append(path)
        if not cached:
            todo.append((i, segment, path))

    if not offline and todo:
        _check_quota(cfg, sum(len(seg.narration) for _, seg, _ in todo))

    for i, segment, path in todo:
        if offline:
            duration = max(2.0, len(segment.narration.split()) / WORDS_PER_SECOND)
            _silent_wav(path, duration)
        else:
            _elevenlabs_tts(cfg, segment.narration, path)
        print(f"  audio {i + 1}/{len(segments)}: {path.name}")
    if len(todo) < len(segments):
        print(f"  ({len(segments) - len(todo)} clips reused from a previous run)")
    return paths


def _check_quota(cfg: Config, characters_needed: int) -> None:
    """Fail before the first paid call when the ElevenLabs quota can't cover
    the remaining narration. Best-effort: an unreachable endpoint doesn't block."""
    try:
        response = httpx.get(
            "https://api.elevenlabs.io/v1/user/subscription",
            headers={"xi-api-key": cfg.elevenlabs_api_key},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        remaining = data["character_limit"] - data["character_count"]
    except (httpx.HTTPError, KeyError, ValueError):
        return
    if characters_needed > remaining:
        raise RuntimeError(
            f"ElevenLabs quota too low: {characters_needed} characters of narration "
            f"left to synthesize, but only {remaining} remain on the "
            f"'{data.get('tier', 'unknown')}' plan. Upgrade the plan or wait for the "
            "monthly reset, then re-run — finished clips are reused automatically."
        )


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
                json={
                    "text": text,
                    "model_id": cfg.tts_model,
                    "voice_settings": {
                        "stability": cfg.voice_stability,
                        "similarity_boost": cfg.voice_similarity_boost,
                        "style": cfg.voice_style,
                        "speed": cfg.voice_speed,
                    },
                },
                timeout=180,
            )
            if response.status_code in (401, 402, 403) and "quota" in response.text:
                # Out of characters: retrying can't help, and the raw 401 is
                # misleading (the key itself is fine).
                raise RuntimeError(f"ElevenLabs quota exhausted: {response.text[:300]}")
            response.raise_for_status()
            payload = response.json()
            path.write_bytes(base64.b64decode(payload["audio_base64"]))
            alignment = payload.get("alignment")
            if alignment:
                alignment_path_for(path).write_text(json.dumps(alignment))
            return
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            last_error = exc
    raise RuntimeError(f"TTS failed after {retries} attempts: {last_error}")


def _silent_wav(path: Path, duration_seconds: float, sample_rate: int = 44100) -> None:
    frames = int(duration_seconds * sample_rate)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * frames)
