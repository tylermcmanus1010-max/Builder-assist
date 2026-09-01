"""Stage 2: turn verified research into a structured video script.

One structured-output call produces narration, per-segment image prompts,
captions, and metadata together, so each image prompt is written against the
exact narration it will illustrate.
"""

from .claude import make_client, with_refusal_fallback
from .config import Config
from .models import TopicResearch, VideoScript

SCRIPT_SYSTEM = """You write scripts for a faceless YouTube fun-fact channel. \
Narration is conversational, punchy, and read aloud by a synthetic voice — short \
sentences, no headings, no "point one" scaffolding, no emojis. Every claim must \
come from the verified facts provided; never invent facts. Each segment's \
image_prompt must depict the specific thing its narration describes (concrete \
subjects, settings, actions — not abstract concepts), and must not ask for text \
in the image. Captions are punchy summaries under 60 characters."""

SCRIPT_PROMPT = """Write a video script from this verified research:

{research}

Requirements:
- A hook segment (10-15 seconds of narration) that opens with the single most
  surprising fact and promises more.
- {n} body segments, each covering one fact in 2-4 spoken sentences (~15-25
  seconds each). Carry the fact's source_url through to the segment.
- An outro segment (one or two sentences) inviting viewers to subscribe.
- 3 title options under 70 characters, curiosity-driven but not clickbait lies.
- A YouTube description: 2 short paragraphs, then a "Sources:" list of the
  source URLs used.
- 10-15 search-relevant tags."""


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
