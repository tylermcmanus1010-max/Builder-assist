"""Stage 5: assemble the video with ffmpeg.

Each segment is rendered as its own clip — Ken Burns pan/zoom over the
segment's image for exactly the length of its narration, caption burned in,
short fade at each end — then the clips are concatenated and optional
background music is ducked underneath. Command builders are separated from
execution so they can be unit-tested without running ffmpeg.
"""

import subprocess
from pathlib import Path
from typing import List, Optional

from .config import Config, find_font
from .models import SegmentAssets

FADE_SECONDS = 0.25
AUDIO_TAIL_PAD = 0.45  # breathing room after each narration clip


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def build_segment_command(
    cfg: Config,
    image: Path,
    audio: Path,
    caption_file: Optional[Path],
    duration: float,
    out: Path,
    index: int,
    font: Optional[str],
) -> List[str]:
    total_frames = max(1, int(duration * cfg.fps))
    # Alternate zoom direction per segment so the motion doesn't feel looped
    if index % 2 == 0:
        zoom = f"1+0.10*on/{total_frames}"
    else:
        zoom = f"1.10-0.10*on/{total_frames}"

    filters = [
        "scale=3840:-2",  # oversample before zoompan to avoid jitter
        (
            f"zoompan=z='{zoom}':d=1:"
            "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={cfg.video_width}x{cfg.video_height}:fps={cfg.fps}"
        ),
        f"fade=t=in:st=0:d={FADE_SECONDS}",
        f"fade=t=out:st={max(0.0, duration - FADE_SECONDS):.3f}:d={FADE_SECONDS}",
    ]
    if caption_file and font:
        filters.append(
            f"drawtext=fontfile={font}:textfile={caption_file}:"
            "fontsize=54:fontcolor=white:borderw=3:bordercolor=black@0.85:"
            "x=(w-text_w)/2:y=h-160"
        )
    filter_complex = f"[0:v]{','.join(filters)}[v];[1:a]apad[a]"

    return [
        "ffmpeg", "-y", "-loop", "1", "-framerate", str(cfg.fps), "-i", str(image),
        "-i", str(audio),
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "[a]",
        "-t", f"{duration:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
        str(out),
    ]


def build_music_command(cfg: Config, video: Path, music: Path, out: Path) -> List[str]:
    return [
        "ffmpeg", "-y", "-i", str(video),
        "-stream_loop", "-1", "-i", str(music),
        "-filter_complex",
        (
            f"[1:a]volume={cfg.music_volume}[m];"
            "[0:a][m]amix=inputs=2:duration=first:dropout_transition=3[a]"
        ),
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        str(out),
    ]


def assemble(
    cfg: Config,
    images: List[Path],
    audios: List[Path],
    captions: List[str],
    build_dir: Path,
) -> List[SegmentAssets]:
    """Render per-segment clips + the final video. Returns segment metadata."""
    clips_dir = build_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    font = find_font(cfg)
    if font is None:
        print("  warning: no usable font found; captions will be skipped")

    assets = []
    for i, (image, audio, caption) in enumerate(zip(images, audios, captions)):
        duration = probe_duration(audio) + AUDIO_TAIL_PAD
        caption_file = None
        if caption and font:
            caption_file = clips_dir / f"caption_{i:02d}.txt"
            caption_file.write_text(caption)
        clip = clips_dir / f"clip_{i:02d}.mp4"
        command = build_segment_command(cfg, image, audio, caption_file, duration, clip, i, font)
        subprocess.run(command, check=True, capture_output=True)
        assets.append(SegmentAssets(
            index=i, image_path=str(image), audio_path=str(audio),
            duration_seconds=duration, caption=caption,
        ))
        print(f"  clip {i + 1}/{len(images)}: {duration:.1f}s")

    concat_list = clips_dir / "concat.txt"
    concat_list.write_text(
        "".join(f"file 'clip_{i:02d}.mp4'\n" for i in range(len(images)))
    )
    concatenated = build_dir / "video_nomusic.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
         "-c", "copy", str(concatenated)],
        check=True, capture_output=True,
    )

    final = build_dir / "final.mp4"
    music = Path(cfg.music_path) if cfg.music_path else None
    if music and music.exists():
        subprocess.run(build_music_command(cfg, concatenated, music, final),
                       check=True, capture_output=True)
    else:
        concatenated.rename(final)
    return assets
