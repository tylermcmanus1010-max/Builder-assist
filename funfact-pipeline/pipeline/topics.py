"""Stage 1: pick a topic and verify facts with web search.

Uses Claude with the server-side web search tool so every fact that reaches
the script carries a real source URL. The topic ledger (state/topics.json)
prevents the channel from repeating itself.
"""

import json
from typing import Optional

from .claude import make_client, with_refusal_fallback
from .config import Config
from .models import TopicResearch
from .state import TopicLedger

RESEARCH_SYSTEM = """You are the researcher for a nighttime-stories YouTube \
channel: dramatic true stories told in a calm, soothing voice that listeners \
fall asleep to. You pick one real story, verify 8-12 facts about it using web \
search, and report only facts you could confirm in a reputable source. Discard \
anything you cannot verify — an interesting false detail is worse than a plain \
true one. Choose stories with genuine drama (a disappearance, a disaster, a \
mystery, a desperate escape) and strong atmosphere. Order the facts as a \
narrative arc: the setting and the people, the rising tension, the turning \
point, and the aftermath or enduring mystery. Prefer facts rich in visual, \
sensory detail — they will be illustrated."""

RESEARCH_PROMPT = """Story theme for tonight: {subject}

Stories already told (do NOT repeat or closely overlap these):
{used_topics}

Pick one specific, dramatic true story within the theme, verify facts about it
with web search, then output ONLY a JSON object (no other text, no code fences)
matching this shape:

{{
  "topic": "...",
  "subject_area": "{subject}",
  "angle": "one sentence on why this hooks viewers",
  "facts": [
    {{"fact": "...", "source_url": "https://...", "source_name": "..."}}
  ]
}}"""


def pick_topic(cfg: Config, ledger: TopicLedger, subject_override: Optional[str] = None) -> TopicResearch:
    client = make_client(cfg)
    subject = subject_override or ledger.next_subject(cfg.subject_wheel)
    used = ledger.used_topics()
    used_text = "\n".join(f"- {t}" for t in used[-60:]) if used else "(none yet)"

    user_content = RESEARCH_PROMPT.format(subject=subject, used_topics=used_text)
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}]

    def call(model: str):
        messages = [{"role": "user", "content": user_content}]
        # Server tools can pause a long turn (stop_reason "pause_turn");
        # re-send with the paused assistant turn appended to resume it.
        for _ in range(6):
            response = client.messages.create(
                model=model,
                max_tokens=16000,
                system=RESEARCH_SYSTEM,
                tools=tools,
                messages=messages,
            )
            if response.stop_reason != "pause_turn":
                return response
            messages.append({"role": "assistant", "content": response.content})
        raise RuntimeError("Research turn still paused after 6 continuations")

    response = with_refusal_fallback(cfg, call)
    text = "".join(block.text for block in response.content if block.type == "text")
    return TopicResearch.model_validate(_extract_json(text))


def _extract_json(text: str) -> dict:
    """Parse the final JSON object out of a response that may include prose or fences."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in research response:\n{text[:500]}")
    return json.loads(text[start:end + 1])
