"""Offline unit tests - no network, no API keys. ffmpeg-dependent checks skip
themselves when ffmpeg is absent."""

import shutil
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline.assemble import build_music_command, build_segment_command, probe_duration
from pipeline.config import Config
from pipeline.models import VideoScript
from pipeline.run import offline_fixture
from pipeline.state import TopicLedger
from pipeline.voice import _silent_wav

HAVE_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


class TestModels(unittest.TestCase):
    def test_fixture_script_round_trips(self):
        _, script = offline_fixture()
        restored = VideoScript.model_validate_json(script.model_dump_json())
        self.assertEqual(len(restored.all_segments), len(script.all_segments))
        self.assertEqual(restored.all_segments[0].caption, script.hook.caption)


class TestLedger(unittest.TestCase):
    def test_rotation_and_recording(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            ledger = TopicLedger(tmp)
            wheel = ["a", "b", "c"]
            self.assertEqual(ledger.next_subject(wheel), "a")
            ledger.record("topic one", "a")
            self.assertEqual(ledger.next_subject(wheel), "b")
            # reload from disk
            ledger2 = TopicLedger(tmp)
            self.assertEqual(ledger2.used_topics(), ["topic one"])
            self.assertEqual(ledger2.next_subject(wheel), "b")


class TestCommands(unittest.TestCase):
    def setUp(self):
        self.cfg = Config()

    def test_segment_command_shape(self):
        cmd = build_segment_command(
            self.cfg, Path("img.png"), Path("aud.mp3"), Path("cap.txt"),
            duration=12.5, out=Path("out.mp4"), font="/font.ttf",
        )
        joined = " ".join(cmd)
        self.assertIn("drawtext", joined)
        self.assertIn("-t 12.500", joined)
        self.assertIn("crop=1920:1080", joined)
        # Hard cuts only: image is held static, no motion or transition filters
        self.assertNotIn("zoompan", joined)
        self.assertNotIn("fade", joined)

    def test_caption_optional(self):
        cmd = build_segment_command(
            self.cfg, Path("img.png"), Path("aud.mp3"), None,
            duration=10.0, out=Path("out.mp4"), font=None,
        )
        self.assertNotIn("drawtext", " ".join(cmd))

    def test_music_command_ducks(self):
        cmd = build_music_command(self.cfg, Path("v.mp4"), Path("m.mp3"), Path("f.mp4"))
        self.assertIn("volume=0.12", " ".join(cmd))


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg not installed")
class TestFfmpegIntegration(unittest.TestCase):
    def test_silent_wav_duration_probes_correctly(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "s.wav"
            _silent_wav(wav, 3.0)
            self.assertAlmostEqual(probe_duration(wav), 3.0, delta=0.1)


if __name__ == "__main__":
    unittest.main()
