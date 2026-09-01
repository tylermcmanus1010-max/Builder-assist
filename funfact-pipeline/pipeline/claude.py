"""Claude API helpers: client construction and a refusal fallback.

Refusal fallback: safety classifiers can decline a request (HTTP 200 with
stop_reason "refusal"). Extremely unlikely for fun-fact content, but when it
happens we retry once on the configured fallback model rather than losing the
nightly run. Remove `with_refusal_fallback` if you'd rather fail loudly.
"""

from typing import Callable

import anthropic

from .config import Config


def make_client(cfg: Config) -> anthropic.Anthropic:
    if not cfg.anthropic_api_key:
        # Fall through to the SDK's own resolution (ANTHROPIC_AUTH_TOKEN,
        # `ant auth login` profile) before failing.
        return anthropic.Anthropic()
    return anthropic.Anthropic(api_key=cfg.anthropic_api_key)


def with_refusal_fallback(cfg: Config, call: Callable[[str], "anthropic.types.Message"]):
    """Run `call(model)` on the primary model; on a refusal, retry once on the fallback."""
    response = call(cfg.claude_model)
    if response.stop_reason == "refusal":
        detail = ""
        if response.stop_details:
            detail = f" ({response.stop_details.category}: {response.stop_details.explanation})"
        print(f"  primary model declined{detail}; retrying on {cfg.claude_fallback_model}")
        response = call(cfg.claude_fallback_model)
        if response.stop_reason == "refusal":
            raise RuntimeError(f"Both models declined this request{detail}")
    return response
