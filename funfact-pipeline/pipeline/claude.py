"""Claude API helpers: client construction and a refusal fallback.

Refusal fallback: safety classifiers can decline a request (HTTP 200 with
stop_reason "refusal"). Extremely unlikely for fun-fact content, but when it
happens we retry once on the configured fallback model rather than losing the
nightly run. Remove `with_refusal_fallback` if you'd rather fail loudly.
"""

import os
from typing import Callable, Optional

import anthropic
import httpx

from .config import Config

_API_BASE = "https://api.anthropic.com"
_workspace_id_cache: Optional[str] = None
_workspace_id_resolved = False


def _resolve_workspace_id(api_key: str) -> Optional[str]:
    """A personal or service-account key that isn't scoped to a single
    workspace must send anthropic-workspace-id on every request. Resolve the
    id from the environment; failing that, probe a free endpoint to tell such
    a key apart from one that needs no header (workspace-scoped or legacy),
    and fail fast with instructions instead of erroring on the first paid
    call. Non-admin keys cannot list workspaces, so the id itself can only
    come from the user (Console -> Settings -> Workspaces)."""
    global _workspace_id_cache, _workspace_id_resolved
    if _workspace_id_resolved:
        return _workspace_id_cache
    ws = (
        os.environ.get("ANTHROPIC_WORKSPACE_ID")
        or os.environ.get("FUNFACT_ANTHROPIC_WORKSPACE_ID")
    )
    if not ws:
        response = httpx.get(
            f"{_API_BASE}/v1/models?limit=1",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
            timeout=30,
        )
        if response.status_code == 200:
            # Key works without the header; remember the acting workspace if
            # the API reports one, though sending it back is not required.
            ws = response.headers.get("anthropic-workspace-id")
        elif (
            response.status_code == 400
            and "anthropic-workspace-id" in response.text
        ):
            raise RuntimeError(
                "This Anthropic API key is identity-linked and not scoped to "
                "a workspace, so every request must name one. Set "
                "ANTHROPIC_WORKSPACE_ID (or FUNFACT_ANTHROPIC_WORKSPACE_ID) "
                "to the workspace id from Console -> Settings -> Workspaces "
                "(wrkspc_...), or create a key scoped to a single workspace."
            )
        # Any other failure: leave ws unset and let the Messages API report
        # the real error (bad key, network, etc.) with full context.
    _workspace_id_cache = ws
    _workspace_id_resolved = True
    return ws


def make_client(cfg: Config) -> anthropic.Anthropic:
    if not cfg.anthropic_api_key:
        # Fall through to the SDK's own resolution (ANTHROPIC_AUTH_TOKEN,
        # `ant auth login` profile) before failing.
        return anthropic.Anthropic()
    workspace_id = _resolve_workspace_id(cfg.anthropic_api_key)
    # Pin the official endpoint: some managed environments export an
    # ANTHROPIC_BASE_URL for their own tooling, which would otherwise
    # silently redirect our calls.
    return anthropic.Anthropic(
        api_key=cfg.anthropic_api_key,
        base_url=_API_BASE,
        default_headers={"anthropic-workspace-id": workspace_id} if workspace_id else None,
    )


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
