"""One-time local OAuth flow: mints token.json for YouTube uploads.

Prereq: a Google Cloud project with the YouTube Data API v3 enabled and an
OAuth client of type "Desktop app", downloaded as client_secret.json (see
README). Run:

    python -m pipeline.auth

A browser opens; approve access with the Google account that owns the
channel. The resulting token.json contains the refresh token — store its
contents as the YT_TOKEN secret in GitHub Actions.
"""

from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

from .config import load_config
from .upload import SCOPES


def main() -> None:
    cfg = load_config()
    secret = Path(cfg.yt_client_secret_path)
    if not secret.exists():
        raise SystemExit(f"Missing {secret} - download it from Google Cloud Console (README has steps)")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
    creds = flow.run_local_server(port=0)
    Path(cfg.yt_token_path).write_text(creds.to_json())
    print(f"Wrote {cfg.yt_token_path} - keep it private; add its contents as the YT_TOKEN CI secret")


if __name__ == "__main__":
    main()
