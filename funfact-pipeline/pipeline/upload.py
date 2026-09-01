"""Stage 7: upload to YouTube via the Data API v3.

Auth model: run `python -m pipeline.auth` once locally to mint token.json
(a refresh token); CI restores it from a secret. Uploads default to unlisted
so you review in YouTube Studio and flip to public — that's the human gate.
"""

import json
from pathlib import Path
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from .config import Config

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def _credentials(cfg: Config) -> Credentials:
    token_path = Path(cfg.yt_token_path)
    if not token_path.exists():
        raise RuntimeError(
            f"{token_path} not found - run `python -m pipeline.auth` once to authorize"
        )
    creds = Credentials.from_authorized_user_info(
        json.loads(token_path.read_text()), SCOPES
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json())
    return creds


def upload_video(
    cfg: Config,
    video_path: Path,
    title: str,
    description: str,
    tags: list,
    thumbnail_path: Optional[Path] = None,
) -> str:
    youtube = build("youtube", "v3", credentials=_credentials(cfg))

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": cfg.category_id,
        },
        "status": {
            "privacyStatus": cfg.privacy_status,
            "selfDeclaredMadeForKids": False,
            # Required disclosure: narration and imagery are AI-generated
            "containsSyntheticMedia": True,
        },
    }
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  upload {int(status.progress() * 100)}%")
    video_id = response["id"]
    print(f"  uploaded: https://www.youtube.com/watch?v={video_id}")

    if thumbnail_path and thumbnail_path.exists():
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(thumbnail_path)),
            ).execute()
        except Exception as exc:  # custom thumbnails need a verified channel
            print(f"  thumbnail upload failed (channel not verified?): {exc}")

    return video_id
