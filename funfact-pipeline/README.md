# funfact-pipeline

A fully automated, faceless YouTube fun-fact channel. One command researches a
topic (facts verified via web search with source URLs), writes a script,
generates a custom illustration for every segment, synthesizes narration,
assembles a 1080p video with burned-in captions — hard cuts to each new image
as the voiceover reaches it — renders a thumbnail, and uploads to YouTube.

```
1. Topic picker ── Claude + web search: pick topic, verify facts, keep sources
2. Scriptwriter ── Claude structured output: narration + image prompt per segment
3. Image gen ───── FLUX via fal.ai: one 16:9 image per segment
4. Voiceover ───── ElevenLabs: one audio clip per segment (drives image timing)
5. Assembly ────── ffmpeg: hard cuts per segment, captions, optional ducked music
6. Thumbnail ───── Pillow: hook image + title text
7. Upload ──────── YouTube Data API (unlisted by default = your review gate)
```

Roughly **$0.75–$2.25 per video** in API costs depending on the image model and
voice you configure; see the cost notes at the bottom.

## Try it with zero API keys

```bash
cd funfact-pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# ffmpeg must be installed: apt install ffmpeg / brew install ffmpeg

python -m pipeline.run --offline
```

`--offline` uses a canned script, placeholder images, and silent audio, but runs
the **real** ffmpeg assembly and thumbnail stages — you get an actual
`build/<date>/final.mp4` proving the render path works on your machine.

Run the tests the same way: `python -m unittest discover tests`.

## Real setup

### 1. API keys

Copy `.env.example` to `.env`, fill in, and export (or use `direnv`):

| Key | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `FAL_KEY` | fal.ai → dashboard → keys |
| `ELEVENLABS_API_KEY` | elevenlabs.io → profile → API keys |

### 2. YouTube OAuth (one time)

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project and enable the **YouTube Data API v3**.
2. Configure the OAuth consent screen (External, add yourself as a test user).
3. Create an OAuth client ID of type **Desktop app**; download the JSON as
   `client_secret.json` into this directory.
4. Run `python -m pipeline.auth` — a browser opens; approve with the Google
   account that owns the channel. This writes `token.json` (the refresh token).

Both files are gitignored. Keep them private.

### 3. Produce a video

```bash
python -m pipeline.run --skip-upload   # render only; inspect build/<date>/final.mp4
python -m pipeline.run                 # render + upload (unlisted)
python -m pipeline.run --subject space # override the day's subject
```

Uploads are **unlisted** by default: review in YouTube Studio, flip to public.
That is the human quality gate — keep it until you trust the output, then set
`privacy_status: public` in `config.yaml`.

### 4. Automate it

Move this directory to its own repository, copy `deploy/daily-video.yml` to
`.github/workflows/daily-video.yml`, and add the secrets listed at the top of
that file. The workflow runs nightly, uploads the video, commits the updated
topic ledger, and keeps the rendered file as a 7-day run artifact.

## Tuning

Everything editable lives in `config.yaml`:

- **Look**: `style_prefix` is prepended to every image prompt — this is your
  channel's visual identity. `image_model` trades cost for quality
  (`fal-ai/flux/schnell` ≈ $0.01/image, `fal-ai/flux-pro` ≈ $0.05–0.10).
- **Voice**: pick any ElevenLabs voice ID; `eleven_flash_v2_5` halves TTS cost
  vs `eleven_multilingual_v2`. Voice quality is the biggest perceived-quality
  lever on a faceless channel.
- **Length**: `segments_per_video` × ~15–25 s per segment sets video length.
- **Music**: point `music_path` at a royalty-free track (YouTube Audio
  Library); it loops and ducks under narration automatically.
- **Subjects**: edit `subject_wheel`; the pipeline rotates through it and the
  ledger in `state/topics.json` prevents topic repeats.

## Design notes

- **Facts are verified, not vibes.** The researcher may only use facts it
  confirmed via web search, each carrying a source URL that flows into the
  video description's Sources list. An interesting false fact is treated as
  worse than a boring true one.
- **Images match narration by construction.** Each segment's image prompt is
  written in the same structured-output call as its narration, so the
  illustration depicts what is being said at that moment.
- **Per-segment audio drives timing.** Each narration clip's measured duration
  sets exactly how long its image stays on screen — no alignment step.
- **Refusal fallback.** If the primary Claude model declines a request, the
  call retries once on `claude_fallback_model` so a nightly run doesn't die.

## Things YouTube requires / cares about

- Uploads set `containsSyntheticMedia: true` — the required disclosure for
  realistic AI-generated content.
- The upload API costs 1,600 quota units of a default 10,000/day (~6 uploads).
- Monetization policy penalizes "mass-produced or repetitious" content. The
  fact verification, rotating subjects, and a distinctive `style_prefix` are
  your differentiation — invest in them.
- Custom thumbnails require a phone-verified channel (the pipeline warns and
  continues if yours isn't).

## Costs (rough, per ~5-minute video)

| Component | Cheap config | Quality config |
|---|---|---|
| Claude (research + script) | ~$0.30 | ~$0.30 |
| 16 images + retries | ~$0.10 (schnell) | ~$1.30 (pro) |
| ~6.5K chars TTS | ~$0.33 (flash) | ~$0.65 (multilingual) |
| Render + upload | $0 (GitHub Actions) | $0 |
| **Total** | **~$0.75** | **~$2.25** |
