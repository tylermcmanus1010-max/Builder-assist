"""Pydantic models shared across pipeline stages.

VideoScript is the contract between the scriptwriter and every downstream
stage: each segment carries its narration *and* the image prompt that
illustrates it, so images always reflect what is being said.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class SourcedFact(BaseModel):
    fact: str
    source_url: str
    source_name: str


class TopicResearch(BaseModel):
    topic: str
    subject_area: str
    angle: str = Field(description="The hook/framing that makes this topic compelling")
    facts: List[SourcedFact]


class Segment(BaseModel):
    narration: str = Field(description="Spoken narration for this segment")
    image_prompt: str = Field(
        description="Image-generation prompt depicting exactly what the narration describes, "
                    "restating the relevant visual anchors word-for-word"
    )
    caption: str = Field(description="Short on-screen caption, max 60 characters")
    source_url: Optional[str] = None


class VideoScript(BaseModel):
    topic: str
    visual_anchors: str = Field(
        default="",
        description="Recurring people, places, and objects with fixed visual details "
                    "(era, clothing, colors, weather) repeated in every image prompt "
                    "so the pictures stay consistent across the video",
    )
    hook: Segment
    segments: List[Segment]
    outro: Segment
    title_options: List[str] = Field(min_length=1, max_length=5)
    description: str
    tags: List[str]

    @property
    def all_segments(self) -> List[Segment]:
        return [self.hook, *self.segments, self.outro]


class SegmentAssets(BaseModel):
    """Filesystem paths for one segment's generated assets."""

    index: int
    image_path: str
    audio_path: str
    duration_seconds: float
    caption: str


class RunManifest(BaseModel):
    """Everything produced by one pipeline run, written to build/<date>/manifest.json."""

    date: str
    topic: str
    title: str
    description: str
    tags: List[str]
    video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    youtube_video_id: Optional[str] = None
    offline: bool = False
