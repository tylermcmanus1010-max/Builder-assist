"""Pipeline orchestrator.

    python -m pipeline.run                  # full run: research -> upload
    python -m pipeline.run --offline        # no API keys: canned script, placeholder
                                            # images, silent audio; real ffmpeg render
    python -m pipeline.run --skip-upload    # produce final.mp4 but don't upload
    python -m pipeline.run --subject space  # override today's subject-wheel pick

Artifacts land in build/<date>/ with a manifest.json describing the run.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from .assemble import assemble
from .config import load_config
from .images import generate_images
from .models import RunManifest, Segment, TopicResearch, SourcedFact, VideoScript
from .state import TopicLedger
from .thumbnail import make_thumbnail
from .voice import synthesize


def offline_fixture() -> tuple:
    """A tiny canned research+script pair for keyless end-to-end runs."""
    facts = [
        SourcedFact(fact="Octopuses have three hearts.", source_url="https://example.com/octopus",
                    source_name="Example Marine Institute"),
        SourcedFact(fact="Two hearts stop beating when an octopus swims.",
                    source_url="https://example.com/octopus", source_name="Example Marine Institute"),
    ]
    research = TopicResearch(topic="Octopus hearts", subject_area="ocean life",
                             angle="An animal whose hearts stop when it swims", facts=facts)
    script = VideoScript(
        topic=research.topic,
        visual_anchors="A reddish-brown octopus with golden eyes, deep blue "
                       "moonlit water, scattered pale coral.",
        hook=Segment(narration="This animal has three hearts. And two of them stop every time it swims.",
                     image_prompt="an octopus gliding through deep blue water",
                     caption="Three hearts. Really."),
        segments=[
            Segment(narration="Octopuses pump blood with three separate hearts. One serves the "
                              "body, and two push blood through the gills.",
                    image_prompt="diagram-style illustration of an octopus with three glowing hearts",
                    caption="1 body heart + 2 gill hearts",
                    source_url="https://example.com/octopus"),
            Segment(narration="When an octopus swims, the two gill hearts actually stop beating. "
                              "That is why they prefer crawling - swimming exhausts them.",
                    image_prompt="an octopus crawling along a colorful reef floor",
                    caption="Swimming stops 2 of them",
                    source_url="https://example.com/octopus"),
        ],
        outro=Segment(narration="Subscribe for a new fact every day.",
                      image_prompt="a friendly octopus waving a tentacle goodbye",
                      caption="Subscribe"),
        title_options=["The Animal With Three Hearts", "Why Octopuses Hate Swimming"],
        description="Octopuses have three hearts - and swimming stops two of them.\n\nSources:\nhttps://example.com/octopus",
        tags=["octopus", "fun facts", "ocean"],
    )
    return research, script


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Run the fun-fact video pipeline")
    parser.add_argument("--offline", action="store_true",
                        help="no API calls: canned script, placeholder images, silent audio")
    parser.add_argument("--skip-upload", action="store_true", help="stop after rendering")
    parser.add_argument("--subject", help="override the subject wheel for this run")
    parser.add_argument("--fresh", action="store_true",
                        help="ignore an existing script.json instead of resuming it")
    parser.add_argument("--out", help="build directory (default: build/<date>)")
    args = parser.parse_args(argv)

    cfg = load_config()
    ledger = TopicLedger(cfg.state_dir)
    run_date = date.today().isoformat()
    build_dir = Path(args.out) if args.out else Path(cfg.build_dir) / run_date
    build_dir.mkdir(parents=True, exist_ok=True)

    script_path = build_dir / "script.json"
    research = None
    if args.offline:
        print("[1/7] topic research (offline fixture)")
        print("[2/7] scriptwriting (offline fixture)")
        research, script = offline_fixture()
    elif script_path.exists() and not args.fresh:
        # Resume support: keep the interrupted run's script so its cached
        # images and audio still match (--fresh forces a new story).
        print("[1/7] topic research (reusing script.json from interrupted run)")
        print("[2/7] scriptwriting (reusing script.json)")
        script = VideoScript.model_validate_json(script_path.read_text())
        print(f"      {len(script.all_segments)} segments, title: {script.title_options[0]}")
    else:
        from .scriptwriter import write_script
        from .topics import pick_topic

        print("[1/7] topic research (Claude + web search)")
        research = pick_topic(cfg, ledger, subject_override=args.subject)
        print(f"      topic: {research.topic} ({len(research.facts)} verified facts)")
        print("[2/7] scriptwriting")
        script = write_script(cfg, research)
        print(f"      {len(script.all_segments)} segments, title: {script.title_options[0]}")

    script_path.write_text(script.model_dump_json(indent=2))

    print("[3/7] image generation")
    images = generate_images(cfg, script, build_dir / "images", offline=args.offline)

    print("[4/7] voiceover")
    audios = synthesize(cfg, script, build_dir / "audio", offline=args.offline)

    print("[5/7] video assembly")
    captions = [segment.caption for segment in script.all_segments]
    assemble(cfg, images, audios, captions, build_dir)
    video_path = build_dir / "final.mp4"

    print("[6/7] thumbnail")
    title = script.title_options[0]
    thumb_path = make_thumbnail(cfg, images[0], title, build_dir / "thumbnail.jpg")

    manifest = RunManifest(
        date=run_date, topic=script.topic, title=title,
        description=script.description, tags=script.tags,
        video_path=str(video_path), thumbnail_path=str(thumb_path),
        offline=args.offline,
    )

    if args.skip_upload or args.offline:
        print("[7/7] upload skipped")
    else:
        from .upload import upload_video

        print(f"[7/7] uploading ({cfg.privacy_status})")
        manifest.youtube_video_id = upload_video(
            cfg, video_path, title, script.description, script.tags, thumb_path
        )
        subject_area = research.subject_area if research else ""
        ledger.record(script.topic, subject_area, manifest.youtube_video_id)

    (build_dir / "manifest.json").write_text(manifest.model_dump_json(indent=2))
    print(f"done: {video_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
