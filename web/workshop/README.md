# Agent Workshop

A 2D job-site floor where every Claude agent that worked on Builder Assist
appears as a figure at a workstation, animated by what it was actually doing.

`index.html` is **generated**. Do not hand-edit it — edit the generator and
rebuild. The page is fully self-contained (inline CSS + JS, timeline baked in
as JSON, no external hosts at all) so it can ship as a published Artifact
under the CSP described in `docs/BUILD-CONSTRAINTS.md`.

## Regenerate

```sh
cd /home/user/Builder-assist
node tools/build-workshop.mjs                 # newest run (wf_5ca353b6-853)
node tools/build-workshop.mjs wf_c47259ff-d2b # a named run under the workflows dir
node tools/build-workshop.mjs /abs/path/to/wf # any directory of transcripts
```

It writes `web/workshop/index.html` and prints a summary: agents found, the
station each was assigned, per-agent event counts, the kind histogram and the
wall-clock span.

Verify afterwards, and look at the screenshot — a canvas that paints nothing
still produces zero console errors:

```sh
OUT_DIR=/tmp/v-workshop node tools/verify-artifacts.mjs web/workshop/index.html
```

## Where the data comes from

```
/root/.claude/projects/-home-user-Builder-assist/<session>/subagents/
  workflows/wf_<id>/
    agent-<agentId>.jsonl        one JSON object per line, the agent transcript
    agent-<agentId>.meta.json    {agentType, description?, spawnDepth}
    journal.jsonl                {"type":"started"|"result", agentId, result?}
  agent-<agentId>.jsonl          agents spawned outside a workflow (see below)
```

The generator also picks up **sibling agents** — transcripts that live one
level up, in `subagents/`, and are not a copy of any workflow transcript —
when their activity window overlaps the selected run. That is how the agent
that built this page appears on its own floor.

Everything is read from disk at build time. Nothing is inferred, smoothed or
invented: each event on the timeline is one line that exists in a transcript.

## Event schema

The page embeds a single JSON object in
`<script id="workshop-data" type="application/json">`:

```jsonc
{
  "runId": "wf_5ca353b6-853",
  "workflowDir": "/root/.claude/.../wf_5ca353b6-853",
  "capturedAt": "2026-08-26T22:20:49.123Z",   // when the generator ran
  "t0Iso":      "2026-08-26T22:00:01.134Z",   // first recorded event
  "tEndIso":    "2026-08-26T22:19:54.618Z",
  "span": 1193484,                             // ms, t0 -> last event
  "agents": [
    {
      "id": "ad8aeb3f3e8c07dd9",
      "short": "ad8aeb",
      "name": "Site Troubleshooting",  // display name
      "role": "troubleshoot",          // derived role
      "station": "screens",            // which workstation to draw
      "task": "troubleshoot website functionality across every published artifact",
      "sibling": false,                // spawned outside the workflow dir
      "startT": 0,                     // ms since t0
      "lastT": 1193484,
      "doneT": null,                   // ms, or null if never finished
      "count": 94,                     // events on the timeline
      "lines": 118                     // raw transcript lines
    }
  ],
  "events": [
    { "t": 1443, "agent": 0, "kind": "read", "tool": "Read",
      "label": "docs/BUILD-CONSTRAINTS.md" }
  ]
}
```

* `t` — milliseconds since the first recorded event of the run.
* `agent` — index into `agents`.
* `kind` — the activity the figure performs.
* `tool` — the raw tool name (or `thinking` / `text` / `journal`).
* `label` — short, real text: the Bash `description`, the file path, the
  pattern, the artifact action, or the agent's own words. Truncated, never
  paraphrased.

### Tool → activity

| transcript item | `kind` | the figure |
| --- | --- | --- |
| `Read` `Grep` `Glob` `LS` `NotebookRead` | `read` | leans over a sheet, head bobbing down the page |
| `Write` `Edit` `MultiEdit` `NotebookEdit` | `write` | arms alternating, typing |
| `Bash` `BashOutput` `KillShell` | `run` | pulls a lever, floor gauge sweeps |
| `Artifact` | `publish` | raises a sheet overhead |
| `WebFetch` `WebSearch` | `fetch` | hand up, signal arcs |
| any other tool | `run` | (safe default) |
| `thinking` block | `think` | still, pulsing thought bubble |
| `text` block | `say` | speech bubble with the actual text |
| `journal.jsonl` `{"type":"result"}` | `done` | tools down, station light goes green |

Two states are computed at replay time rather than recorded:

* `idle` — more than 90 s of timeline time since the agent's last event.
* `waiting` — the playhead is before the agent's first event; the figure is
  drawn faded and the card reads **Not started**.

The journal carries no timestamp, so a `done` marker is placed on the agent's
last recorded event.

## Identity and station mapping

Agents are identified from the **first user message** of their transcript, in
this order:

1. a line starting `YOUR TRACK: <name>` (build prompts) — line-anchored, so a
   prompt that merely quotes the phrase is not mistaken for a track;
2. a transcript that *opens* with `Independent verification of the …`;
3. a transcript that *opens* with `Call the Artifact tool with action "read" …`
   — named from the journal result's artifact title;
4. the `description` field in `agent-<id>.meta.json`;
5. the journal result name;
6. failing all of that, `Agent <first 6 of id>` at a generic bench.

The resulting text is matched against `ROLES` in `tools/build-workshop.mjs`,
first match wins:

| role | station | what is drawn |
| --- | --- | --- |
| `blueprint` | `drafting` | tilted drafting board + gable house model |
| `troubleshoot` | `screens` | three inspection monitors, one showing a fault |
| `hub` | `timeclock` | wall time clock + rack of punch cards |
| `material` | `shelving` | shelf of material swatches with price tags |
| `verify` | `qc` | clipboard on an easel, checkmarks filling in |
| `workshop` | `modelbench` | a tiny model of this very workshop |
| *(no match)* | `bench` | toolbox and hand tools |

`meta.json` does **not** carry a label, which is why identity is derived from
the prompt text. Agents that cannot be classified get a generic bench and a
name built from their id rather than a guess — the page never claims a role it
cannot substantiate.

## Adding a new station type

1. Add an entry to `ROLES` near the top of `tools/build-workshop.mjs`:

   ```js
   { role: 'safety', station: 'toolboard', name: 'Safety Review',
     re: /\b(safety|osha|fall protection)\b/i },
   ```

   Order matters — the first regex that matches the derived text wins, so put
   narrow patterns above broad ones.

2. Add a matching branch in `drawStation(kind, ph, st)` inside the page
   template. Draw in the cell's unit space: **200 × 156**, floor line at
   `y = 126`, bench top at `y = 100`, the figure standing at `x = 58`. `ph` is
   a 0→1 animation phase, `st` is the current activity kind. Keep it to a
   handful of strokes — charm over detail. Finish with a small
   `label(134, 121, 'Name', CY, 6, 'center')` plate.

3. Rebuild, run the verifier, and **look at the screenshot**.

Adding a new *activity* is the same shape: map the tool in `KIND_BY_TOOL`, add
a label and both palette entries (`KIND_COLOR` for the navy canvas,
`KIND_DOM_LIGHT` / `KIND_DOM_DARK` for the cards and ticker), and add an arm
pose in `drawFigure`.

## Controls

Play / pause, Restart, Jump to end, a real `<input type="range"` scrubber with
a visible label, and speed presets. The default speed is computed from the
actual span (`round(span / 60000)`, shown as e.g. `20x fit`) so the whole run
plays in roughly a minute; `1x`, `8x`, `60x` and `300x` are also offered.

Under `prefers-reduced-motion: reduce` the page does not auto-play, runs no
idle animation loop, and figures snap between states.

## Limitations — read this before promising anything

* **It is a replay, not a live view.** A published Artifact runs under a CSP
  that blocks every external host and has no path to the container filesystem
  the agents ran on. There is no live mode and there cannot be one. The only
  way to refresh the page is to re-run the generator and republish.
* The floor shows the run it was built from. `runId`, the recorded window and
  the capture time are printed in the page header so a stale page is obvious.
* A run still in progress produces a transcript that simply stops. Those
  agents show no `done` marker and their station light never turns green —
  that is accurate, not a bug.
* `idle` is a display heuristic (a 90 s gap), not something the transcript
  states. Everything else on the timeline is recorded fact.
* The journal has no timestamps, so `done` lands on the agent's last event
  rather than the true finish time.
* Long runs are dominated by `run` (Bash) events; the histogram in the
  generator's summary is the honest picture of what the agents actually did.
