"""Topic ledger: persistent memory of what the channel has already covered."""

import json
from datetime import date
from pathlib import Path
from typing import List, Optional


class TopicLedger:
    def __init__(self, state_dir: str):
        self.path = Path(state_dir) / "topics.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            self.data = json.loads(self.path.read_text())
        else:
            self.data = {"entries": []}

    def used_topics(self) -> List[str]:
        return [entry["topic"] for entry in self.data["entries"]]

    def next_subject(self, wheel: List[str]) -> str:
        """Rotate through the subject wheel so consecutive videos vary."""
        if not wheel:
            raise ValueError("subject_wheel is empty")
        return wheel[len(self.data["entries"]) % len(wheel)]

    def record(self, topic: str, subject: str, video_id: Optional[str] = None) -> None:
        self.data["entries"].append({
            "date": date.today().isoformat(),
            "topic": topic,
            "subject": subject,
            "video_id": video_id,
        })
        self.path.write_text(json.dumps(self.data, indent=2) + "\n")
