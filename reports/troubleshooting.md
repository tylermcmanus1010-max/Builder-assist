# Troubleshooting pass — what is broken right now

Date: 2026-08-28. Scope: every page in `web/**`, as source, not as published
dumps. This supersedes nothing in `reports/site-health.md`; that pass triaged 16
**artifact dumps** in a session directory, this one drives the **live sources**
in the repository.

Both suites pass. Every page passes the artifact harness. The defects below were
all found *outside* what those tools measure, which is the point of the pass.

## Measurement baseline

Recorded against these exact bytes (another agent was editing `web/**`
throughout; every finding names the hash it was observed at):

| File | md5 at report time |
|---|---|
| `web/main-site/index.html` | `db1db1c4e528e296691e00b24bfd9127` |
| `web/blueprint-3d/index.html` | `5d812f1680ece855d5a7ec7c9bae90f5` |
| `web/assistify-bundle/index.html` | `05ad917e24437d493ed39835368ce9c0` |
| `web/employee-hub/index.html` | `efb8a6a1f313ddd1342bd07436ffd7c4` |
| `web/material-compare/index.html` | `95108aa3982b2f9220fb0c95fc6f04ea` |
| `web/vanhorn-3d/index.html` | `a94913963be149d4563ca169aec048ec` |

**`node tools/verify-assistify.mjs`** → `31 passed, 0 failed` /
`ASSISTIFY VERIFICATION PASSED`. Run twice (start and end of pass), identical.

**`OUT_DIR=… node tools/verify-artifacts.mjs`** on all six pages → **6× `PASS … clean`**,
zero problems reported. Run twice, identical.

`web/main-site/index.html` was being actively rewritten by another agent during
this pass, so all line numbers for that file are as of `db1db1c4…` and will
drift; the surrounding code is quoted so each one can be re-found. The other
five files did not change.

That clean sweep is itself the headline: the harness reports six clean pages
while two of them are unreadable when served over HTTP and one loses a day of
payroll. See *Why the tooling missed all of this*.

---

## How I separated real defects from sandbox artifacts

This is the part reviewers should check, so the method is stated before the
findings. Three rules, applied to every candidate:

1. **A defect must survive a control.** Every claim below is paired with a
   condition under which the same code is correct. Missing-charset is proven by
   serving the *same bytes* with and without a `charset` parameter; the DST bug
   is proven against UTC and against a mid-summer date in the same timezone. If
   I could not construct a control, the finding went to *Suspected*.
2. **Reproduce twice, independently.** Every ranked defect was reproduced on two
   separate runs, and where possible by two different methods (e.g. the charset
   defect via `document.characterSet` inspection *and* via a rendered-text diff).
3. **Never trust a proxy measurement.** Three candidates died this way; they are
   listed in *Not defects* with the proxy that produced them. A page that does
   not change its `innerHTML` length has not necessarily done nothing.

Known-good sandbox noise, never reported: `fonts.googleapis.com` /
`fonts.gstatic.com` failures (no browser egress here, CSP-allowed in
production), and Chromium's own background calls to `accounts.google.com`,
`www.google.com`, `redirector.gvt1.com` (agent proxy, not page behaviour).

### The artifact-vs-hosted split, tested honestly

The harness injects `<base href="file:///…/web/<dir>/">` into every page before
loading it (`tools/verify-artifacts.mjs:107`), so sibling files always resolve.
That measures the **hosted** case only. To test the **artifact** case I copied
each page *alone* into an empty directory and served it from an origin that
404s every other path, under a CSP transcribed from `docs/BUILD-CONSTRAINTS.md`
(every external host blocked except Google Fonts; inline CSS/JS allowed;
`connect-src 'none'`). That CSP is derived from the repo's own documentation,
not from the live service — stated plainly because it is an assumption.

Hosted was served two ways: the repo root over `python3 -m http.server`, exactly
as `CLAUDE.md` prescribes, and an equivalent Node server.

---

# Real defects, ranked by whether someone actually hits it

## T1 — HIGH — Employee Hub silently deletes a day of payroll in DST weeks, and the CSV disagrees with the screen

**Surface:** `web/employee-hub/index.html`, employer portal, weekly matrix + CSV export.
**Who hits it:** every employer, in every US timezone, twice a year — including
the Monday after the clocks change, when they run payroll for the prior week.

**File:line**
- `web/employee-hub/index.html:447-450` — `weekRange()`
- `web/employee-hub/index.html:1092` — the day-column bucket and its `d < 0` drop
- `web/employee-hub/index.html:276-280` — `mondayOf()`
- `web/employee-hub/index.html:357` — the seed reuses the same `wk0 - 7 * DAY`

```js
function weekRange(offset) {
  var start = mondayOf(Date.now()) + offset * 7 * DAY;   // DAY is a fixed 86400000
  return { start: start, end: start + 7 * DAY };
}
```

`mondayOf()` is correct — it uses `setHours(0,0,0,0)`, and in US zones the DST
transition falls on Sunday, the last day of a Monday-start week. The bug is
adding a **fixed** `7 * DAY` to hop between weeks. Across a transition the result
is not local midnight Monday, it is Monday 01:00 or Sunday 23:00.

Then `renderMatrix()` buckets each entry into a day column with
`Math.floor((dayStart(e.clockIn) - r.start) / DAY)` and **silently drops**
anything outside 0–6:

```js
var d = Math.floor((dayStart(e.clockIn) - r.start) / DAY);
if (d < 0 || d > 6) return;      // no flag, no warning, no count
```

In the fall-back week `r.start` is Monday **01:00**, so `dayStart()` of *every*
Monday shift is one hour earlier than the week start, `d` computes to `-1`, and
every employee's Monday disappears.

**Reproduce** (America/Detroit, clock fixed to Wed 2026-11-04 12:00 — DST ended
Sun 2026-11-01):
1. Open `web/employee-hub/index.html`.
2. Choose **Employer portal** → **Enter employer portal**.
3. Click **← Prev week**.

Observed, twice, and by two scripts:

| Employee | Week total shown | Actual (control) | Lost |
|---|---|---|---|
| Mike Torres | 47.50 | 57.00 | 9.50 |
| Dana Whitfield | 32.00 | 40.00 | 8.00 |
| Luis Ortega | 31.00 | 39.00 | 8.00 |
| Sam Pruitt | 28.00 | 36.00 | 8.00 |

`weekRange(-1).start` = `Mon Oct 26 2026 01:00:00 GMT-0400`, off by exactly
`+3600000 ms`. The columns also **shift left by one day** — the figures printed
under Mon–Fri are really Tue–Sat.

**The exported CSV does not agree with the screen.** `buildCsv()`
(`web/employee-hub/index.html:1382-1411`) iterates `entriesInWeek()` with no day
bucket and therefore no `d < 0` drop:

| | rows | hours |
|---|---|---|
| CSV export | 21 | **172.00** |
| Weekly matrix on screen | 17 | **138.50** |
| Discrepancy | | **33.50 h** |

Dana crosses the overtime boundary because of it: she shows 32.00 h (no flag)
where she actually worked 40.00 h.

**Controls that make this a real defect, not an artifact**
- Same page, same clock, `timezoneId: 'UTC'` → delta **0**, all 21 rows bucketed 0–5.
- Same page, same timezone, clock 2026-08-26 (no DST edge) → delta **0**.
- Spring-forward week (2026-03-11) loses no hours but mislabels the range as
  **"Sun, Mar 1 – Sun, Mar 8"** — a week starting on Sunday, visible in `#wk-range`.

**Fix.** Stop doing calendar arithmetic in fixed milliseconds. Derive each week
boundary from a real date:

```js
function weekRange(offset) {
  var d = new Date(mondayOf(Date.now()));
  d.setDate(d.getDate() + offset * 7);   // calendar-aware, DST-safe
  d.setHours(0, 0, 0, 0);
  var start = d.getTime();
  var e = new Date(start); e.setDate(e.getDate() + 7); e.setHours(0, 0, 0, 0);
  return { start: start, end: e.getTime() };
}
```

and bucket by calendar day rather than by dividing a duration:

```js
var d = Math.round((dayStart(e.clockIn) - dayStart(r.start)) / DAY);
```

Apply the same change to `buildSeed()`'s `wk1` (`:357`). Independently, the
`if (d < 0 || d > 6) return;` guard should never discard an entry that
`entriesInWeek()` admitted — if it ever fires, that is a bug and it should
surface, the way stale shifts already do via `pm-stale-alert`.

---

## T2 — HIGH — Two pages have no `<meta charset>` and render as mojibake over HTTP

**Surface:** `web/material-compare/index.html`, `web/employee-hub/index.html`.
**Who hits it:** everyone who opens either page from `chatgpt.site`, Cloudflare,
or the `python3 -m http.server` workflow that `CLAUDE.md` prescribes. It is
invisible when published as an Artifact, because the artifact wrapper supplies a
charset meta of its own — a textbook artifact-vs-hosted split, running the
opposite direction from the iframe class of bug.

**File:line** — neither file contains a `<meta charset>` anywhere:

| Page | `<meta charset>` | non-ASCII source lines |
|---|---|---|
| `web/material-compare/index.html` | **absent** | 16 |
| `web/employee-hub/index.html` | **absent** | 69 |
| `web/vanhorn-3d/index.html` | `<meta charset="utf-8">` | 57 |
| `web/main-site/index.html` | `<meta charset=utf8>` | 387 |
| `web/blueprint-3d/index.html` | `<meta charset="utf-8">` | 4 |
| `web/assistify-bundle/index.html` | `<meta charset="utf-8">` | 23 |

**Reproduce**
1. `python3 -m http.server 8765` from the repo root (per `CLAUDE.md`).
2. `curl -sI http://127.0.0.1:8765/web/material-compare/index.html | grep -i content-type`
   → `Content-type: text/html` — **no charset parameter** (Python 3.11.15).
3. Open the page. `document.characterSet` → **`windows-1252`**.

**Control (this is what proves it):** the same bytes served twice, differing
only in the header — `text/html` vs `text/html; charset=utf-8` — then diffing
`document.body.innerText`:

| Page | rendered lines corrupted |
|---|---|
| `web/material-compare/index.html` | **382 of 873 (44%)** |
| `web/employee-hub/index.html` (entry screen) | **10 of 23 (43%)** |

And `vanhorn-3d` / `main-site`, from the same server, report `UTF-8` with zero
corrupted glyphs — so it is the missing meta, not the server.

What a user actually sees on the pricing table:

```
BROKEN : $669.00 â€“ $1,118 per fan, installed
CORRECT: $669.00 – $1,118 per fan, installed
BROKEN : Δ â€” biggest saving first
CORRECT: Δ — biggest saving first
BROKEN : SCOPE-fans Â· window.__SCOPE baRefCents reference rate
CORRECT: SCOPE-fans · window.__SCOPE baRefCents reference rate
```

Every one of the 205 em-dashes and 10 en-dashes in the price ranges is
destroyed. On the Employee Hub the **⚠ warning glyph on the "SEEDED DEMO DATA —
NOT REAL PAYROLL RECORDS" banner becomes `ÂŠ`**, which is the one piece of
chrome on that page whose whole job is to stop someone mistaking demo data for
real payroll.

**Fix.** One line, first thing inside `<head>` of each file (it must land in the
first 1024 bytes to be honoured):

```html
<meta charset="utf-8">
```

Worth normalising `main-site`'s `<meta charset=utf8>` to `<meta charset="utf-8">`
at the same time — `utf8` is a legal alias so it works today, but it is the odd
one out.

---

## T3 — MEDIUM — CSV export filename is off by one day in every UTC-positive timezone

**Surface:** `web/employee-hub/index.html:1410`, employer portal → export week.

```js
return { name: 'timesheet-week-' + new Date(r.start).toISOString().slice(0, 10) + '.csv', … };
```

`r.start` is local Monday midnight. In any zone east of UTC that instant is
still Sunday in UTC, so the filename names the wrong week.

**Reproduce:** `timezoneId: 'Europe/Berlin'`, clock 2026-08-26, employer portal,
Prev week, export.

| Timezone | week actually starts | filename produced |
|---|---|---|
| America/Detroit | Mon 2026-08-17 | `timesheet-week-2026-08-17.csv` ✅ |
| Europe/Berlin (UTC+2) | Mon 2026-08-17 | `timesheet-week-2026-08-16.csv` ❌ |
| Pacific/Kiritimati (UTC+14) | Mon 2026-08-17 | `timesheet-week-2026-08-16.csv` ❌ |

A payroll clerk filing `timesheet-week-2026-08-16.csv` alongside
`timesheet-week-2026-08-17.csv` from a US colleague has two files for the same
week under different names.

**Fix.** The file already contains the right helper, written for exactly this
hazard, with a comment saying so (`:325-329`):

```js
// toISOString() would push an evening shift onto the next day's payroll
function localDateKey(t) { … }
```

Use it: `'timesheet-week-' + localDateKey(r.start) + '.csv'`.

---

## T4 — LOW-MEDIUM — Clearing the estimator form silently prices a home nobody described

**Surface:** `web/main-site/index.html:6992`, `#/build-estimate` (admin-gated).

```js
estimate.home={sqft:+fd.get("sqft")||1600, beds:+fd.get("beds")||0,
               baths:+fd.get("baths")||1, stories:+fd.get("stories")||1, …};
```

An empty `<input type="number">` is **valid** — `min="400"` only rejects values
below 400, not absent ones. `+"" === 0`, which is falsy, so `||` substitutes a
default and the flow proceeds as though the user had typed it.

**Reproduce:** sign in as `TylerSchopper1` / `Tyler1`, go to `#/build-estimate`,
clear all five fields, press **Generate my material estimate**.

Observed twice, identical both runs: routes to `#/build-estimate/results` and
prices a **1,600 sf / 0 bd / 1 ba / 1 story / 0-car** home at
**$231,755.50 + $2,317.56 fee = $234,073.06**, with the invented figures printed
in the results header as if they were the user's input.

**Boundaries that are handled correctly** (verified in the same run — native
constraint validation blocks the submit and the estimator is never reached):
`sqft=100` (below min), `sqft=-2600` with negative beds/baths/stories, and
`0` everywhere. Very large values compute without crashing or going non-finite
(`sqft=1e9` → $65,247,368,784.83). Above ~1e15 sf the cent totals exceed
`Number.MAX_SAFE_INTEGER` and lose precision, but no real user reaches that and
`sqft` is the only field with no `max`.

**Fix.** Mark the five inputs `required`, so the browser blocks an empty submit
the same way it already blocks an out-of-range one — consistent with how the
rest of the form already behaves. If a default is genuinely wanted, write it
back into the field so the user sees what they are being quoted on.

---

## T5 — LOW — The harness dumps multi-megabyte copies of every page into the repo root

**Surface:** `tools/verify-artifacts.mjs:447`

```js
const outDir = process.env.OUT_DIR || '.';
```

Run without `OUT_DIR`, the harness writes `<key>.unwrapped.html`, `report.json`
and the `.png` screenshots into the current directory — normally the repo root.
`.gitignore` covers `node_modules/`, `*.log`, `.DS_Store`, `out/`, so none of it
is ignored.

**Currently sitting untracked in the working tree** (`git status --porcelain`):

```
4,713,926  main-site-index.unwrapped.html
1,805,504  assistify-bundle-index.unwrapped.html
   97,861  vanhorn-3d-index.unwrapped.html
      341  report.json
```

6.6 MB of stale duplicates, one `git add -A` away from being committed — and a
duplicate of `main-site` is exactly the kind of file that later gets edited by
mistake instead of the real one.

**Fix.** Either default to a scratch directory
(`process.env.OUT_DIR || './reports/verify'`, matching what
`docs/BUILD-CONSTRAINTS.md` already tells people to pass), or add
`*.unwrapped.html` and `/report.json` to `.gitignore`. Both is better.

---

## T6 — LOW — Corrupt stored entries render as unbounded numbers

**Surface:** `web/employee-hub/index.html`, employer matrix.

Seeding `localStorage` with an entry whose `clockOut` is `8.64e15` (the maximum
`Date` value) renders a week total of **2,399,503,347.53 h** and the flag
*"OT >40 H/WEEK (WEEKLY RULE) — 2399503307.53 H OVER"*. An entry with `clockOut`
before `clockIn` displays as a normal approved row reading `IN 7:28 PM /
OUT 6:28 PM / PAID 0.00` with no flag.

No crash, no JS error, and the only way in is corrupt storage — hence LOW.
`validateProposal()` (`:479-509`) already rejects exactly these shapes for
user-submitted requests; the gap is that stored entries are never re-validated
on render. Worth a sanity bound where entries are read, and a visible flag for a
negative-length shift rather than a silent clamp to `0.00`.

---

# Fixed during this pass — verified, not assumed

**Main site's Assistify tab rendered an empty iframe when published as an artifact.**

At `c2464bf2fd60ba4d2c06cdd97d2d0b63` and `9a04b0c7419b570c57edf1128751469f`,
`#/admin-portal/model` embedded `<iframe src="../blueprint-3d/index.html">`. In
artifact mode (page alone, no siblings) the frame's document had **0 characters**
of body text, with **zero JS errors and zero CSP violations** — the failure mode
the brief warns about. Hosted, the same frame had 4,002 characters.
`mountBp3d()` only verified `frame.title`, so the page reported success either
way. `web/main-site/README.md` claimed at that point that the page "ships zero
external subresources" and behaves "identically served as a claude.ai Artifact,
from chatgpt.site, or Cloudflare"; the relative iframe contradicted it.

Another agent rebuilt this while the pass was running. **Re-verified at
`db1db1c4e528e296691e00b24bfd9127`, and it now works.** `mountAssistifyFrame()`
(`web/main-site/index.html:5546-5574`) points the frame at the sibling, probes
the loaded document for Assistify's own `#assistifyRoot`, and falls back to a
base64 self-contained build via `srcdoc` on 404, cross-origin, or a 6 s timeout.
Measured:

| Mode | note shown | frame body | `#assistifyRoot` | canvas |
|---|---|---|---|---|
| artifact | "Self-contained build embedded in this page" | 4,002 chars | yes | 693×577, **painted** |
| hosted | "Live app · web/blueprint-3d/" | 4,002 chars | yes | 693×577, **painted** |

Screenshot inspected: the viewer renders its grid, all twelve tool buttons and
the truth-state panel. `#/admin-portal/model` (Van Horn, now inlined rather than
iframed) paints a 701×760 canvas in both modes. No regression in either suite.

**Not a defect:** `web/blueprint-3d/index.html` alone in an empty directory 404s
its four sibling scripts, throws `TypeError: Cannot read properties of undefined
(reading 'mount')`, and leaves an unsized 300×150 unpainted canvas. That is by
design — `web/assistify-bundle/README.md` documents `blueprint-3d` as the
multi-file hosted source and `assistify-bundle/index.html` as the generated
single-file artifact build. Verified: the bundle standalone under artifact CSP
has zero console errors, zero page errors, 4,002 chars, canvas 1060×659 painted.

---

# Why the tooling missed all of this

`reports/site-health.md` named one blind spot — `findExternalRefs()` matching
only literal tag markup. That is one instance of a general shape: **the harness
measures the page it can most easily construct, not the page a user gets.** Five
concrete gaps, all confirmed:

**B1 — It tests the hosted case and calls it the artifact case.**
`tools/verify-artifacts.mjs:107` injects `<base href="file:///…/web/<dir>/">`
when a page has no `<base>`. Siblings therefore always resolve. This is why
`web/blueprint-3d/index.html` passes `clean` even though, standalone, it throws
and paints nothing. A page that genuinely was meant to ship as an artifact would
pass identically. *Fix:* add a second pass that copies the page alone into a
temp dir, drops the `<base>` injection, and fails on any same-origin request
that 404s.

**B2 — Route discovery only sees the entry screen's anchors.**
`metrics.routes` is built from `a[href^="#/"]` present at load, so every gated
route is invisible. On the main site it walked **4** routes (`#/`,
`#/get-pricing`, `#/walkthrough`, `#/admin-signin`) out of ~18. All eight admin
tabs, both build-estimate result screens, the estimator and both member-portal
screens were never entered. *Fix:* let a page declare its route list, or seed a
session before walking.

**B3 — The literal-markup scan is still blind, and now silently so.**
On `web/material-compare/index.html` the harness reports **zero** external
references. In the live DOM there are **17**, across `www.homewyse.com`,
`www.fixr.com`, `todayshomeowner.com`, `a1garage.com`, composed at runtime from
the JSON price data. Here they are all `<a target="_blank" rel="noopener">`
citations — navigations, genuinely not a CSP problem — but the harness never saw
them at all, so it did not classify them as safe, it just missed them. Same
mechanism as the 229 retailer photos. *Fix:* classify from the live DOM after
load (walk every element's `src`/`href`/`data`/`poster`), not from the source
text.

**B4 — Nothing checks the character encoding.** Both mojibake pages pass
`clean`. *Fix:* assert `<meta charset>` exists in the first 1024 bytes, and/or
load once with no charset header and fail on `document.characterSet !== 'UTF-8'`.

**B5 — Nothing checks that a canvas painted.** `metrics` counts elements,
buttons, images and broken images, but a `<canvas>` that never drew is
indistinguishable from a working one. *Fix:* sample `getImageData` for
non-uniformity, as the probes for this pass do — with the animation control
described below.

---

# Not defects — candidates that died under a control

Recorded because the elimination is the substance of the pass.

**"`RESET VIEW` on `web/vanhorn-3d/index.html` is a dead control."**
Two independent proxies said so and both were wrong.
*Proxy 1:* clicking it changed `document.body.innerHTML.length` by 0 — of course
it did, it moves a camera on a canvas.
*Proxy 2:* a pixel hash of `#view` after clicking Reset did not match the hash
before dragging, across two trials.
*Control:* sampling the canvas four times with no interaction at all produced
four **different** hashes — the page auto-orbits (`web/vanhorn-3d/index.html:1033`,
`if(autorot){ cam.az=(cam.az+0.033)%360; }`), so pixel comparison is invalid by
construction. Re-run with `#autorot` unchecked: idle hashes stable, and
`afterReset` came out at `3751207295` in **both** trials and in the earlier run
too — a fixed camera, reached deterministically. Re-run with
`reducedMotion: 'reduce'` (which sets `autorot=false` at load, `:987`) so the
camera never drifts: `initial === afterReset === 3751207295` in both trials,
`dragged` differing. The handler (`:1023-1025`) restores
`cam = JSON.parse(JSON.stringify(HOME))`. **It works correctly.** The apparent
defect was entirely auto-orbit drift between page load and my first sample.

**"The sort control on `web/material-compare/index.html` changes nothing."**
Changing `#fSort` from `delta-asc` to `delta-desc` moved `innerText.length` and
`innerHTML.length` by exactly 0 — which is what re-ordering the same rows does.
*Control:* comparing the first five row labels per option gave **4 distinct
orderings for 4 options**. The sort works. The two other selects (`#fCat`,
`#fStatus`) visibly filter (−48,828 and −43,586 characters).

**"The Employee Hub request form swallows an empty submit."**
My probe read `#req-alert`, which does not exist; the form's error region is
`#req-error` (`web/employee-hub/index.html:673`). Read correctly, and reproduced
twice, validation is thorough and actionable: *"Add a reason. The project manager
approves or denies from this text, so say what happened…"*, then *"These times
overlap an entry that already exists for Mike Torres: Fri, Aug 28 5:28 PM → — on
job_vanhorn. Fix: move this request outside that window…"*. No request was
created in any invalid case. **Not a defect.**

**Chromium's calls to `accounts.google.com`, `www.google.com`,
`redirector.gvt1.com`, `android.clients.google.com`** — browser background
traffic through the agent proxy, not page behaviour.

**`fonts.googleapis.com` / `fonts.gstatic.com` failures** — no egress in this
sandbox; CSP-allowed and fine in production, as the previous pass established.

---

# Checked and found clean

**Suites.** `verify-assistify` 31/31; `verify-artifacts` 6/6 PASS clean. Both
run twice.

**Artifact vs hosted, per page.** Page copied alone into an empty directory on a
404-everything origin under the documented CSP, versus the repo served over
HTTP. Byte-identical rendering (same text length, same DOM, zero CSP violations,
zero failed requests) for `web/vanhorn-3d`, `web/employee-hub`,
`web/material-compare`, `web/assistify-bundle`, and `web/main-site`'s public
routes. The only behavioural differences found anywhere were the Assistify
iframe (now fixed, above) and `blueprint-3d` standalone (by design).

**Role walk, all four states, both delivery modes.** Signed in for real through
the form as admin (`TylerSchopper1`), contractor (`Gen1`), member
(`Phoenician1`), plus signed-out. Every route in the map walked:
`#/`, `#/get-pricing`, `#/walkthrough`, `#/walkthrough-done`, `#/member-signin`,
`#/admin-signin`, `#/member-portal`, `#/member-portal/compare`, `#/admin-portal`
and all eight tabs (`autoquote`, `catalog`, `competitors`, `orders`,
`walkthroughs`, `members`, `model`, `assistify`), `#/build-estimate` and its
`/results`, `/order`, `/done`, `#/estimator`, plus a nonsense route.

- **Gating is exactly right.** Contractor and member both bounce from
  `#/admin-portal`, `#/build-estimate`, `#/estimator` to `#/admin-signin`;
  signed-out bounces from `#/member-portal` to `#/member-signin`; a nonsense
  route falls back to home rather than a blank screen.
- **Zero uncaught JS errors on every route, in every role, in both modes.**
- `#/estimator` mounts its `srcdoc` iframe with 13,631 characters of content in
  both modes.
- Nothing dead-ends: no signed-in view routes a user to a sign-in screen.

**Dead controls.** Every visible `button` and `select` on `material-compare` and
`vanhorn-3d` clicked/changed and measured; the three survivors were all
disproved above. The Employee Hub state machine was driven end to end: clock
out → clock in → break start → break end → clock out. Buttons enable and disable
correctly at each step, `nEntries` increments once on clock-in, the break is
recorded on the entry (`breaks: 1`, `breakMs: 733`, `worked: 1464`), a second
clock-out is prevented by a disabled button rather than by a silent no-op, and
the employer's **Approve** moves approved entries 14 → 15.

**Storage hostility.** Four scenarios × four pages: first run with nothing
stored; `localStorage`/`sessionStorage` overridden to throw `SecurityError` on
*access*; corrupt non-JSON blobs under every known key; wrong-shape stored data
(`products: null`, `files: "nope"`, entries as an object instead of an array).
**Zero JS errors and full render in all 16 combinations.** `Store` wraps every
read and write (`web/employee-hub/index.html:222-232`) and falls back to
in-memory.

**Stored session whose user no longer exists.** The Employee Hub handles this
deliberately and correctly (`:1562-1564`) — a session naming a deleted employee
or manager is discarded and the portal falls back to the sign-in gate. The main
site restores any session with a `role` field without checking the account still
exists (`:7763`); a ghost admin, a member with a nonexistent tenant, a member
with no tenant field, and a bare `{role:"member"}` all render their portals
without error. See *Suspected* below.

**Boundary conditions.** Estimator: zero, negative, below-minimum, empty, `1e9`,
`1e15` (T4 above). Employee Hub time math: zero-length shift, clock-out before
clock-in, break longer than the shift, `NaN` timestamps, maximum `Date` value —
no crash in any case, `workedMs()` clamps at 0. Midnight crossings are handled
correctly and are explicitly modelled (the seed includes Luis's 21:00 → 01:30
pour, flagged `crosses_midnight` in the CSV). Timezones tested:
America/Detroit, UTC, Europe/Berlin, Pacific/Kiritimati.

**Layout.** 1440×900 and 390×844, light and dark `prefers-color-scheme`, on
every stable page. `scrollWidth - clientWidth === 0` in all twelve combinations,
and on every main-site route in every role. Screenshots inspected by eye, not
just measured — which is how T2 was found, since mojibake produces no console
error and no failed request.

**Runtime-composed external references.** Three-lens scan (harness regex; every
absolute URL in the bytes; every request the browser actually issues) across
`employee-hub`, `material-compare`, `vanhorn-3d`, `blueprint-3d`. Only
`material-compare` references external hosts at all, all 17 as `<a
target="_blank" rel="noopener">` citation links. No page issued a single network
request at runtime.

---

# Suspected, not confirmed

**Main site honours a stored session for an account that does not exist.**
`web/main-site/index.html:7763` restores any parsed session with a truthy
`role`, with no membership check:

```js
try{ const s=JSON.parse(sessionStorage.getItem("ba-proto-session")); if(s&&s.role) session=s; }catch(e){}
```

Setting `{role:"admin", username:"DeletedAdmin"}` opens the full admin control
centre. I have **not** ranked this as a defect: the page states in its own
banner and in `web/main-site/README.md` that credentials are a client-side
prototype with no server, so there is no authorization boundary here to breach —
anyone can set the key regardless. It is listed because the Employee Hub, in the
same repository, does validate the account still exists (`:1562-1564`), and the
inconsistency will matter the moment either page gets a real backend. Worth
mirroring the hub's check.

**Whether the production CSP matches the one I transcribed.** Judged from
`docs/BUILD-CONSTRAINTS.md`, not observed against a live artifact origin. The
artifact-mode results depend on it; the sibling-404 behaviour does not, and that
is what the Assistify finding turned on.

**Whether real hosts add a charset header.** T2 is proven for
`python3 -m http.server` (the workflow `CLAUDE.md` prescribes) and for any host
sending bare `text/html`. Some hosts do add `; charset=utf-8`, which would mask
it there. The fix costs one line and removes the dependency either way.
