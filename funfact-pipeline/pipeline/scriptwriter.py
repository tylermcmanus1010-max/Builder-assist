"""Stage 2: turn verified research into a structured video script.

One structured-output call produces narration, per-segment image prompts,
captions, and metadata together, so each image prompt is written against the
exact narration it will illustrate.
"""

from .claude import make_client, with_refusal_fallback
from .config import Config
from .models import TopicResearch, VideoScript

SCRIPT_SYSTEM = """You write scripts for a nighttime-stories YouTube channel: \
dramatic true stories narrated calmly, for listeners winding down to sleep. \
Narration is slow, warm, and flowing — longer unhurried sentences, gentle \
transitions, vivid but soothing imagery, quiet gravity instead of excitement. \
No headings, no "point one" scaffolding, no emojis, nothing jarring or loud. \
Every claim must come from the verified facts provided; never invent facts.

Visual consistency rules:
- First write visual_anchors: a compact description (under 60 words) fixing the
  recurring people, places, and objects of this story — era, clothing, hair,
  colors, weather, time of night. Details stated there are canon.
- Each segment's image_prompt must depict only what that segment's narration
  describes, restating the relevant anchor details word-for-word so every image
  shows the same people and places the same way. Concrete subjects, settings,
  and actions — never abstract concepts, and never text in the image.
Captions are quiet summaries under 60 characters."""

SCRIPT_PROMPT = """Write tonight's story script from this verified research:

{research}

Requirements:
- A hook segment (2-3 unhurried spoken sentences) that welcomes the listener,
  invites them to get comfortable, and sets the scene of the story with a hint
  of the mystery or drama to come.
- {n} body segments telling the story in narrative order — setting, rising
  tension, turning point, aftermath — each 4-6 spoken sentences (~25-40 seconds).
  Each segment covers one fact or beat; carry the fact's source_url through.
- An outro segment (two or three soft sentences) wishing the listener a good
  night and gently inviting them to subscribe for more stories.
- 3 title options under 70 characters that promise a calm, dramatic story
  (e.g. "A Sleepy Story About ..."), curiosity-driven but not clickbait lies.
- A YouTube description: 2 short paragraphs, then a "Sources:" list of the
  source URLs used.
- 10-15 search-relevant tags (include sleep-story and relaxation terms)."""


def write_script(cfg: Config, research: TopicResearch) -> VideoScript:
    client = make_client(cfg)
    prompt = SCRIPT_PROMPT.format(
        research=research.model_dump_json(indent=2),
        n=cfg.segments_per_video,
    )

    def call(model: str):
        return client.messages.parse(
            model=model,
            # The SDK requires streaming when max_tokens implies a possible
            # >10-minute response (above ~21k tokens); a full script fits in
            # far less, so stay under the non-streaming limit.
            max_tokens=16000,
            system=SCRIPT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            output_format=VideoScript,
        )

    response = with_refusal_fallback(cfg, call)
    script: VideoScript = response.parsed_output
    return script
