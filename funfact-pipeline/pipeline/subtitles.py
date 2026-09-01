"""Timed subtitles: ElevenLabs character alignment -> ASS file per segment.

The with-timestamps TTS response gives a start/end time for every character
of the narration. Characters are grouped into words, words into short cues
(broken at sentence punctuation or a length cap), and the cues written as an
ASS subtitle track that assembly burns into the clip, so the on-screen text
tracks what the narrator is currently saying.
"""

import json
from pathlib import Path
from typing import List, Tuple

from .config import Config

SENTENCE_END = (".", "!", "?", "…")
CUE_TAIL_PAD = 0.15  # seconds a cue lingers after its last word ends

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narration,DejaVu Sans,{font_size},&H00FFFFFF,&H00FFFFFF,&HB4000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,60,60,130,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def words_from_alignment(alignment: dict) -> List[Tuple[str, float, float]]:
    """Collapse per-character timings into (word, start, end) triples."""
    words = []
    text, start, end = "", 0.0, 0.0
    for ch, ch_start, ch_end in zip(
        alignment["characters"],
        alignment["character_start_times_seconds"],
        alignment["character_end_times_seconds"],
    ):
        if ch.isspace():
            if text:
                words.append((text, start, end))
                text = ""
            continue
        if not text:
            start = ch_start
        text += ch
        end = ch_end
    if text:
        words.append((text, start, end))
    return words


def group_words_into_cues(
    words: List[Tuple[str, float, float]], max_chars: int
) -> List[Tuple[str, float, float]]:
    """Short readable cues: break at sentence ends or the length cap."""
    cues = []
    current: List[Tuple[str, float, float]] = []

    def flush():
        if current:
            cues.append((
                " ".join(w[0] for w in current),
                current[0][1],
                current[-1][2],
            ))
            current.clear()

    for word in words:
        candidate_len = sum(len(w[0]) for w in current) + len(current) + len(word[0])
        if current and candidate_len > max_chars:
            flush()
        current.append(word)
        if word[0].endswith(SENTENCE_END):
            flush()
    flush()
    return cues


def _ass_time(seconds: float) -> str:
    centis = max(0, int(round(seconds * 100)))
    h, rem = divmod(centis, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def write_ass(cfg: Config, alignment_file: Path, out: Path) -> Path:
    """Render one segment's alignment JSON as a burned-in subtitle track."""
    alignment = json.loads(alignment_file.read_text())
    words = words_from_alignment(alignment)
    cues = group_words_into_cues(words, cfg.subtitle_max_chars)

    lines = [ASS_HEADER.format(
        width=cfg.video_width, height=cfg.video_height,
        font_size=cfg.subtitle_font_size,
    )]
    for i, (text, start, end) in enumerate(cues):
        # Linger briefly after the last word, but never into the next cue.
        cue_end = end + CUE_TAIL_PAD
        if i + 1 < len(cues):
            cue_end = min(cue_end, cues[i + 1][1])
        text = text.replace("\\", "\\\\").replace("{", "(").replace("}", ")")
        lines.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(cue_end)},Narration,,0,0,0,,{text}\n"
        )
    out.write_text("".join(lines))
    return out
