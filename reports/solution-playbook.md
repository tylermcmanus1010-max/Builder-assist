# Solution playbook — the next move for everything that is blocked

Date: 2026-08-28. Branch: `claude/builder-assist-workflow-verify-yc0iwy`.

Evidence base: the nine workflow runs under
`/root/.claude/projects/-home-user-Builder-assist/0e4b2398-0e9f-5b1a-a51d-fd41d937a6c5/subagents/workflows/wf_*/`
(journal `result` payloads, `whatIsMissing` and `defects` fields), the repo at
HEAD, `reports/site-health.md`, `reports/assistify-launch-survival.md`,
`builder-assist-sites/docs/launch/*`, and live probes run today from this
container.

Every prompt below is written to be pasted verbatim into a fresh agent.

**Sequencing note.** An agent is currently building in `web/**`,
`tools/build-assistify-bundle.mjs` and `web/main-site/build-bp3d.py`. Items
marked **[after build]** touch those paths and must wait for it to land. Items
marked **[now]** touch nothing it owns.

---

## Run these first

### 1. [now] Retrieve the authoritative parcel record. It is no longer blocked.

`builder-assist-sites/docs/launch/official-parcel-attempt.md` (dated 2026-08-27)
records the parcel query as **"UNVERIFIED / launch-blocking for parcel field
use"**, because `mcassessor.maricopa.gov` and the ArcGIS layer endpoints
"returned 403 or were rejected by the safe web-access boundary". Risk K06 in
`builder-assist-sites/docs/launch/risk-register.md` is filed against that.

That 403 was a property of one fetch path, not of the network. Probed today from
this container with `curl` through the agent proxy, all three endpoints return
**200**, and the subject feature comes back:

```
APN 17508001B / 175-08-001B · 12228 N 66TH ST SCOTTSDALE 85254
LAND_SIZE 31350 · LOT_NUM 1 · SUBNAME "DESERT ESTATES  4" · MCR 92-33 · STR 15 3N 4E
LAT 33.59870855202216 LON -111.9386981762076 · polygon returned, 1 ring, 12 vertices, EPSG:4326
APN 17508001A: same physical address, LAND_SIZE 6015, LOT_NUM 1, same subdivision
```

That also speaks to the plan conflict the model carries. 001B alone is 31,350 sf
— exactly the architectural site plan figure. 001B + 001A is 37,365 sf, which is
144 sf (0.4%) off the civil grading plan's 37,221 sf. That is a reconciliation
hypothesis with numbers behind it, not a fact; the prompt keeps it labelled.

Value: closes the oldest launch-blocking gap in the project and gives Assistify
its first `VERIFIED` parcel. Effort: under an hour.

**Paste this:**

> You are resolving the Assistify parcel blocker in `/home/user/Builder-assist`.
> Read `CLAUDE.md` first and obey the truth boundary: preserve the VERIFIED /
> INFERRED / UNVERIFIED / CONFLICT states, never silently upgrade a guess, and
> keep the twelve canonical stage IDs untouched.
>
> `builder-assist-sites/docs/launch/official-parcel-attempt.md` says the official
> Maricopa County Assessor parcel query returned HTTP 403. That is stale. From
> this container these succeed:
>
> ```sh
> mkdir -p /home/user/Builder-assist/evidence/parcel
> cd /home/user/Builder-assist/evidence/parcel
> curl -sS "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer?f=pjson" -o layer-metadata.json
> curl -sS "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query?where=APN%3D%2717508001B%27&outFields=*&returnGeometry=true&outSR=4326&f=json" -o parcel-17508001B.json
> curl -sS "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query?where=APN%3D%2717508001A%27&outFields=*&returnGeometry=true&outSR=4326&f=json" -o parcel-17508001A.json
> sha256sum *.json > SHA256SUMS
> date -u +%Y-%m-%dT%H:%M:%SZ > retrieved-at.txt
> ```
>
> Then:
> 1. Confirm each file has `features[0]` and no `error`. If any query returns 403
>    or zero features, STOP and report that instead of inventing a value.
> 2. Register the saved responses as a NEW source document in
>    `web/blueprint-3d/approvedplans-4752-25-assistify-model.json` under
>    `sources.documents` — agency "Maricopa County Assessor's Office", the sha256
>    from SHA256SUMS, the retrieval timestamp, and CRS EPSG:4326 (the service
>    publishes 102100/3857; you requested `outSR=4326`). Do NOT file it among the
>    plan sheets; it is not a plan sheet.
> 3. Change `parcel` from `{"state":"UNVERIFIED","value":null}` to `VERIFIED`
>    with APN, APN_DASH, physical address, LAND_SIZE, lot, subdivision, MCR, STR,
>    centroid, and the ring, each carrying a `sourceRefs` entry to the new
>    document. Keep the existing `notice` wording that this is not a legal
>    survey, and LEAVE the `legal-survey` entry in `unresolved` as UNVERIFIED —
>    an assessor record is an authoritative parcel source, not a recorded plat.
> 4. Record the lot-area conflict honestly as `CONFLICT`, not as a resolution:
>    architectural site plan 31,350 sf == parcel 001B exactly; civil grading plan
>    37,221 sf / 0.8542 ac vs 001B+001A = 37,365 sf, a 144 sf (0.4%) delta. State
>    the arithmetic and that a recorded plat is still required to close it.
> 5. Rewrite `builder-assist-sites/docs/launch/official-parcel-attempt.md` to
>    record the successful retrieval, the date, the exact URLs, and what remains
>    unavailable. Update risk K06's status line in
>    `builder-assist-sites/docs/launch/risk-register.md`.
>
> Acceptance: `node tools/verify-assistify.mjs` still reports 0 failed; the model
> validates against `web/blueprint-3d/model-schema.json`; the viewer shows the
> parcel as VERIFIED with a visible citation and still shows `legal-survey` as
> UNVERIFIED; `evidence/parcel/SHA256SUMS` exists and its hashes match the files.
> Do not commit; leave the changes in the working tree and report the diff.

### 2. [after build] Publish the repo pages to the artifact URLs they already own.

Every published page is owned by this account and is updatable in place
(`Artifact action:"list"`, 21 rows, all `(mine)`). The live pages are behind the
repo by real, user-facing work.

Measured today on the flagship page:

| | live artifact 89d6cc50 | repo `web/main-site/index.html` |
|---|---|---|
| bytes | 2,354,002 (incl. 12KB frame runtime) | 2,199,139 |
| occurrences of `bp3dRoot` | 100 | 1 |
| occurrences of `assistify` | 0 | 4 |
| `data-noop` dead pricing form | present | present as file-link markup only; the form is wired |

So the live flagship still ships the old inlined Van Horn viewer, has no
Assistify at all, and still serves the "Request pricing" form that a previous
adversary agent proved does nothing (repo commit `1a04c05` "Wire the public
pricing request" fixed it; nobody published the result).

The read also reported: **"shared with anyone with the link (viewers see a
pinned earlier version, not this live version)"**. Publishing alone will not
change what a shared link shows. See hard blocker H4.

**Paste this:**

> You are publishing the Builder Assist repo pages to the artifacts they already
> own, in `/home/user/Builder-assist`. Read `docs/BUILD-CONSTRAINTS.md` first.
>
> Mapping (all owned by this account, update in place — pass the URL, never
> publish a new artifact, never change the favicon):
>
> - `web/main-site/index.html` -> https://claude.ai/code/artifact/89d6cc50-b2ac-4633-9a0c-7f4b1e6d0f1e
> - `web/employee-hub/index.html` -> https://claude.ai/code/artifact/89f3c2fb-aeb2-4363-81b9-675a8b1045a4
> - `web/material-compare/index.html` -> https://claude.ai/code/artifact/e678e07c-5984-4092-9fbc-e900f4088ac7
> - `web/vanhorn-3d/index.html` -> https://claude.ai/code/artifact/be8d25cd-87c9-4735-a22b-d6f5b65a6e9f
> - `web/assistify-bundle/index.html` -> NO artifact exists yet; publish it as a
>   new one titled "Assistify" and report the URL.
>
> For each, in this order:
> 1. `OUT_DIR=/tmp/pub-<name> node tools/verify-artifacts.mjs <file>` -> must PASS.
>    Any WARN must be justified in the report in writing.
> 2. `Artifact action:"read"` the target URL first (a publish to an artifact this
>    session has not read is refused) and diff it against the repo file so you
>    can state exactly what changes for viewers.
> 3. Publish with `url` set, with a `label` and a `note` naming what changed.
> 4. Re-read the published artifact and confirm the marker strings landed. For
>    the main site the decisive check is: `assistify` occurs > 0 and `bp3dRoot`
>    occurs ~1, the inverse of the current live state.
>
> Then tell the user, in one line, that artifact 89d6cc50 is shared by link and
> its viewers are pinned to an older version, so they must re-pin or re-share it
> in the artifact UI for the update to reach anyone.
>
> Acceptance: every page PASSes the harness before publish; every re-read shows
> the new content; the report lists each URL with its before/after byte count.

### 3. [now] Make the artifact harness walk signed-in routes.

`tools/verify-artifacts.mjs:149` collects `a[href]` from the initial DOM and
`:171` derives the route list from those anchors. So it only ever walks routes
reachable while signed out. Three separate misses trace to exactly that:

- The adversary in `wf_1376735e-dad` found ~120 retailer photo URLs
  (`mobileimages.lowes.com`, `images.thdstatic.com`, …) rendered at runtime in
  the `#/build-estimate` results flow while the harness reported
  `externalRefs: []`, and called the report's "CSP clean" claim false.
- The main-site track in `wf_dcd18ef3-1d7` found two 390px overflows the first
  triage missed — `#/admin-portal/competitors` (28px) and
  `#/admin-portal/members` (50px) — "because it only walked public routes".
- `#/estimator` logs two clipboard permission-policy console errors "the harness
  never sees".

`findExternalRefs` (`:53–83`) is also literal-markup-only: `<img src="https://…">`,
`url()`, `fetch()`. URLs composed at runtime from a JSON blob are invisible to it.

**Paste this:**

> Harden `/home/user/Builder-assist/tools/verify-artifacts.mjs`. Do not touch
> anything under `web/`. Read `docs/BUILD-CONSTRAINTS.md` and
> `reports/site-health.md` first.
>
> Today the route list comes from anchors on the signed-out DOM
> (`tools/verify-artifacts.mjs:149` and `:171`), so gated routes are never
> visited and runtime-composed subresource URLs are never seen.
>
> Add three things:
>
> 1. **A credentialed route pass.** Accept an optional JSON sidecar, e.g.
>    `--personas personas.json`, shaped
>    `[{"name":"admin","user":"TylerSchopper1","pass":"Tyler1","routes":["#/admin-portal","#/admin-portal/members","#/admin-portal/competitors","#/admin-portal/model","#/build-estimate","#/build-estimate/results","#/estimator"]}, …]`.
>    Credentials for the main site: admin TylerSchopper1/Tyler1, contractor
>    Gen1/Gen1, member Phoenician1/Tyler1. For each persona: sign in through the
>    real form, walk each route at 1440x900 and 390x844, and report per-route
>    console errors, page errors, and `scrollWidth - clientWidth`. A page with no
>    personas file must behave exactly as it does today.
> 2. **Runtime subresource capture.** Record the host of every request the page
>    actually issues (`page.on('request')`), classify with the same
>    `CSP_ALLOWED_HOSTS` set, and report any non-allowed host as CSP-blocked even
>    though the request also fails for lack of egress. This is the check that
>    would have caught the ~120 retailer photo hosts.
> 3. **A JSON-embedded URL scan.** Regex `https?://` across the whole file, not
>    just tag markup, and report distinct non-allowed hosts as a separate
>    `embeddedHosts` field. Keep it separate from `cspBlocked` so a citation
>    anchor in a data blob does not get reported as a subresource.
>
> Rules: only ADD checks, never weaken one. Do not report
> `fonts.googleapis.com` / `fonts.gstatic.com` failures as defects — this sandbox
> has no browser egress and those hosts are CSP-allowed in production. Judge CSP
> statically against the allowlist, never from request failure.
>
> Acceptance: `OUT_DIR=/tmp/h1 node tools/verify-artifacts.mjs web/main-site/index.html`
> still PASSes with no personas file; with a personas file it reports the admin
> routes and lists the retailer hosts under `embeddedHosts`; re-running against
> the four other pages in `web/` produces the same verdicts as before your change
> on everything except the new fields. Report a before/after verdict table.

---

## (a) Hard blockers — not solvable here; the move is a workaround or a one-step human ask

### H1 — No browser egress in this sandbox
Every external request from Chromium here fails with `ERR_CONNECTION_RESET`,
including CSP-allowed `fonts.googleapis.com`. Documented in
`reports/site-health.md` ("Flagged by tooling but NOT defects") and encoded as a
comment at `tools/verify-artifacts.mjs:44–51`.
**Root cause:** the container's browser has no network path. Note this is a
*browser* limit; the shell has HTTPS through the agent proxy (`npm` registry and
`gis.mcassessor.maricopa.gov` both answered 200 today).
**Workaround, already in place:** judge CSP statically against the allowlist.
**Rule:** never file a font-host or remote-image failure as a defect from this
sandbox, and never treat a shell success as proof that the browser can reach it.

### H2 — Real production CSP enforcement is unobservable
`reports/site-health.md` "Could not be checked": the sandbox cannot serve a page
from a real artifact origin.
**Workaround:** the static allowlist scan plus item 3's runtime host capture is
the best available proxy. **Ask a human only if** a page's behaviour depends on a
host not on the allowlist — then the answer is to inline it, not to test it.

### H3 — The `builder-assist-sites` Cloudflare drills
`builder-assist-sites/docs/launch/risk-register.md` has ten P0/P1 risks whose
status is "hosted … pending": K01 multi-account auth test, K02 D1/R2 fault
drill, K03 upload limit test, K13 rollback rehearsal, K17 hosted smoke (K17
states plainly that "plain Node is incompatible" — it needs the Cloudflare
Worker target), K18 max-size boundary, K19 hosted readiness.
**Root cause:** these need a real Cloudflare account, D1 database and R2 bucket.
No credentials exist in this container, and none should.
**The ask, in one step:** *"Provision a Cloudflare Workers staging environment
with one D1 database and one R2 bucket for Builder Assist, and put the account
id / API token / binding names in the deploy environment (not in Git). Then an
agent can run `npm run build` and the K01–K19 hosted drills."*
**Meanwhile:** everything except the hosted drills is runnable — see S1.

### H4 — A shared artifact link serves a pinned version
Reading artifact `89d6cc50` today returned: *"shared with anyone with the link
(viewers see a pinned earlier version, not this live version)"*.
**Root cause:** the share pin is a property of the share, not of the page.
Republishing does not move it.
**The ask, in one step:** *"Open https://claude.ai/code/artifact/89d6cc50-b2ac-4633-9a0c-7f4b1e6d0f1e,
and re-share it so the link points at the current version."* Do this after item 2
publishes, or the pin moves to stale content.

### H5 — The shared field-progress backend
`docs/assistify-progress-backend-contract.json` defines the contract (12 stage
IDs, 5 status values, project / projectMember / stageProgress / progressEvent).
`CLAUDE.md` says progress lives in `localStorage` and does not follow a user
between devices. Nothing implements the contract: `builder-assist-sites/db/schema.ts`
(162 lines) has `gen1PhaseTasks` keyed by `phaseNo`/`taskNo` and **zero**
occurrences of any canonical stage ID (`grep -rl "site-controls" builder-assist-sites/`
returns nothing).
**Root cause:** it needs a hosted database, authenticated membership and object
storage for evidence photos — the same provisioning as H3.
**Workaround worth doing now (S2 below):** implement the contract against the
local D1/SQLite that drizzle already targets, behind an adapter, so only the
connection string changes at provisioning time.

---

## (b) Soft blockers — an agent stopped, but a different approach works

### S1 — [now] Nobody has ever installed or run `builder-assist-sites`
It is 200+ committed files: Next 16 / Vinext / Cloudflare Workers, drizzle
migrations, `app/api/gen1/route.ts`, `app/member-portal/assistify/*`, and nine
`tests/*.test.mjs`. It appears in **no** workflow journal result. There is no
`node_modules`. `builder-assist-sites/docs/launch/implementation-checkpoint.md`
claims "28 automated tests, lint, reproducible `npm ci`, production build and
zero-vulnerability audit pass" — unverified here.
**Why it stalled:** agents assumed no network. `curl -sS -o /dev/null -w '%{http_code}' https://registry.npmjs.org/next`
returns **200** from this container today, so `npm ci` is available.

**Paste this:**

> Verify the `builder-assist-sites` application in `/home/user/Builder-assist`,
> which no previous run has ever executed. Work only inside
> `/home/user/Builder-assist/builder-assist-sites`. Do not run git commit/push.
>
> ```sh
> cd /home/user/Builder-assist/builder-assist-sites
> npm ci 2>&1 | tail -20
> npm run lint 2>&1 | tail -30
> npm test 2>&1 | tail -60
> npx drizzle-kit generate --help >/dev/null 2>&1; echo "drizzle-kit exit $?"
> ```
>
> `node_modules/` is gitignored, so installing does not dirty the tree; confirm
> with `git status --porcelain` before you finish.
>
> `docs/launch/implementation-checkpoint.md` claims 28 passing tests, a clean
> lint, a production build and a zero-vulnerability audit. Report the ACTUAL
> numbers. `docs/launch/risk-register.md` K17 says the plain Node runtime is
> incompatible with the Cloudflare Worker target, so if `npm run build` needs
> wrangler and fails without credentials, say so precisely rather than calling
> the app broken.
>
> Acceptance: a table of claimed vs actual for tests / lint / build / audit, the
> exact failing test names if any, and a one-line verdict on whether this app is
> a live candidate or abandoned scaffolding. Do not modify application source in
> this pass; only report.

### S2 — [now] Two Assistify implementations with incompatible keys
`web/blueprint-3d/engine.js` uses the twelve canonical string stage IDs
(`site-controls` … `finishes-closeout`, confirmed present) and the four canonical
states (`VERIFIED` 7, `INFERRED` 7, `UNVERIFIED` 10, `CONFLICT` 3 occurrences).
`builder-assist-sites/lib/assistify-stage.ts:1–3` clamps stages to the integers
1–12, and `builder-assist-sites/lib/assistify-data.ts:1–8` defines a completely
different seven-value vocabulary: "Verified from controlling plan", "Scaled from
plan", "Assumed for visualization", "Unresolved", … Neither maps to the other,
and the contract calls the string IDs "database keys".
**Why it stalled:** the two lines of work never met; no run compared them.
**Risk if ignored:** the moment either side writes to a shared database, stage
identity and fact state are ambiguous — a direct hit on the truth boundary.

**Paste this:**

> Reconcile the two Assistify data models in `/home/user/Builder-assist`. Read
> `CLAUDE.md` and `docs/assistify-progress-backend-contract.json` first. The
> twelve canonical string stage IDs and the VERIFIED / INFERRED / UNVERIFIED /
> CONFLICT states are authoritative and must not change.
>
> Side A: `web/blueprint-3d/engine.js`, `web/blueprint-3d/model-schema.json`.
> Side B: `builder-assist-sites/lib/assistify-stage.ts` (integer stages 1–12),
> `builder-assist-sites/lib/assistify-data.ts` (a seven-value `EvidenceState`
> union), `builder-assist-sites/db/schema.ts` (`gen1PhaseTasks.phaseNo`).
>
> Produce, as your deliverable, a new file
> `/home/user/Builder-assist/docs/assistify-model-reconciliation.md` containing:
> 1. A row-per-stage table mapping each integer 1–12 in side B to a canonical
>    string ID, or marking it UNRESOLVED. Do not invent a mapping to make the
>    table complete — an unresolved row is the correct output when the evidence
>    does not decide it.
> 2. A mapping from each of side B's seven evidence strings to one of the four
>    canonical states, with the lossy cases named explicitly (which side-B values
>    collapse together, and what is lost).
> 3. A statement of which side is authoritative for the shared database, and the
>    exact code changes the other side needs.
> 4. Any place where side B asserts something side A records as UNVERIFIED or
>    CONFLICT. Those are truth-boundary violations and go at the top.
>
> Acceptance: `grep -rl "site-controls" builder-assist-sites/` currently returns
> nothing — after the doc exists, a reader can say for every integer stage which
> canonical ID it means or why it cannot be decided. Change no runtime code in
> this pass.

### S3 — [after build] Four published-artifact defects are fixable; all pages are ours
`reports/site-health.md` documented D2–D5 with exact fixes, and the run recorded
"Fixes for D1–D5 belong in `web/` source files owned by other agents; I only
verified and documented them" — but D2/D3/D4/D5 pages have **no repo source**;
they exist only as published artifacts. `Artifact action:"list"` shows all of
them as `(mine)`, so they can be updated in place. Verified still broken today:
artifact 5847f6ec line 154 is `.step-body .d { font-size:13.5px; color:var(--muted); margin-top:3px; }`
on an inline `<span>` — D5 is unfixed.

**Paste this:**

> Fix four defects in published artifacts owned by this account. Each page has no
> repo source, so read the artifact, edit the saved HTML file, and republish to
> the SAME url. Never publish a new artifact; never change a favicon. Read
> `/home/user/Builder-assist/reports/site-health.md` for the full diagnosis.
>
> 1. **D5, cosmetic, 1 line.** https://claude.ai/code/artifact/5847f6ec-8bce-420c-8ba9-923811b9eaa5
>    — every checklist row runs its bold title and description together. `.t` and
>    `.d` are both inline spans and `.step-body .d` sets `margin-top:3px`, which
>    does nothing on an inline element. Add `display:block` to `.step-body .d`
>    (currently line 154 of the saved file). Accept: each row's description
>    starts on its own line in a 1440px screenshot you actually look at.
> 2. **D4, dead controls.** https://claude.ai/code/artifact/4f63b254-de94-4f84-8266-360d9a580559
>    — the save buttons are always visible because `.saves{display:flex}` and
>    `.btn{display:inline-flex}` beat the UA `[hidden]{display:none}` rule, and
>    `trySave()` opens with `if(!DL) return;`, a silent no-op. Add
>    `.saves[hidden],#savefile[hidden]{display:none !important}` and replace the
>    silent return with the page's existing "Saving is not available in this
>    view — use Copy instead." toast. Accept: with the downloads capability
>    absent the buttons are gone; if present they still save.
> 3. **D2, functional FAIL.** https://claude.ai/code/artifact/5616f80b-4a0c-4707-b88f-fb97f0a8ee68
>    — every submission fails. The handler POSTs to `/api/free-set-requests`,
>    which cannot exist on an artifact origin, so every visitor gets "That didn't
>    go through. Call (517) 855-0947". Replace the fetch with the mailto-compose
>    + always-rendered copyable-details pattern already proven on
>    https://claude.ai/code/artifact/7ccd37c9-5636-44d0-8c79-7f99888b98b5 (read
>    that page and copy its approach). Accept: submitting shows the compose panel
>    and the copyable body; no path reaches the failure message.
> 4. **D3, CSP-blocked photos.** https://claude.ai/code/artifact/8e09d6bd-0c61-4714-b378-db258052a397
>    — three `<img class="shot">` load from `builder-assist-llc.valentino-in-8162.chatgpt.site`,
>    which the production CSP blocks. The identical three files already exist as
>    `data:` URIs in artifact 89d6cc50's `window.__IMG` under keys `hero`,
>    `fenceAd`, `floor` (decoded 235,161 / 158,412 / 107,214 bytes). Read 89d6cc50,
>    copy those three data URIs into the three `src` attributes. Accept: the page
>    contains zero `chatgpt.site` subresource URLs and the three photos render in
>    a screenshot; size grows to roughly 770KB, far under the 16MB cap.
>
> For every page: run `OUT_DIR=/tmp/d node /home/user/Builder-assist/tools/verify-artifacts.mjs <saved file>`
> before and after, screenshot the result and READ the screenshot. "No console
> errors" is not evidence that a page renders. Report each URL with its verdict.

### S4 — [after build] Five verified-open Employee Hub defects
The adversary in `wf_dcd18ef3-1d7` filed eight. Commit `1a04c05` fixed two — the
UTC CSV date column is gone, and `requestDelta` is now gated on
`r.status === 'pending'` (`web/employee-hub/index.html:1037`). These are still
present at HEAD, line numbers re-verified today:

- `:913–918` `correctableEntries()` does not exclude the open shift
  (`clockOut == null`), and `:944` prefills the proposed clock-out with
  `Date.now()`. The default form state files a request that, if approved,
  retroactively closes the employee's live shift.
- `:1105` `if (!pe) return;` drops any employee with zero countable hours from
  the "hours per employee per job" matrix. A manager scanning for who logged
  nothing will not see them.
- `:1283` sets `fromRequestId` only on the missing-shift creation path, so
  `:1406`'s CSV `from_request` column is blank for entries whose hours an
  approved *correction* changed.
- `:981` `submitRequest()` clears only `#req-reason`, so a second click files a
  duplicate pending request; the queue shows two indistinguishable cards.
- Reported but not re-verified by me: `init()` keeps a stored session's `name`
  and `title` verbatim instead of rehydrating from the manager record, so a
  forged session attributes audit records to a non-manager.

**Paste this:**

> Fix five open defects in `/home/user/Builder-assist/web/employee-hub/index.html`.
> Read `docs/BUILD-CONSTRAINTS.md` and the README beside the file first. Change
> nothing else in `web/`.
>
> 1. `:913` — exclude entries with `clockOut == null` from `correctableEntries()`,
>    so a live shift is never the default correction target, and drop the
>    `:944` `Date.now()` prefill that goes with it.
> 2. `:1105` — render a 0.00 row for employees with no countable hours instead of
>    `if (!pe) return;`. Sam Pruitt is currently absent from the matrix while the
>    roster flags him "Shift left open 26.00 h".
> 3. `:1283` — set `fromRequestId` on the correction path too, so the CSV
>    `from_request` column at `:1406` covers entries an approved correction
>    amended, not only entries a missing-shift request created.
> 4. `:981` — clear `#req-in` and `#req-out` alongside `#req-reason` after a
>    successful submit, and refuse a second identical pending request for the
>    same employee and window with a message that names the existing request id.
> 5. In `init()`, derive the session `name` and `title` from the looked-up
>    manager record rather than trusting the stored blob. First reproduce the
>    escalation: `Store.setSession({role:'employer',userId:'mgr_pat',name:'Luis Ortega',title:'Laborer'})`,
>    reload, and confirm `actorLabel()` currently shows the forged name.
>
> Acceptance: `OUT_DIR=/tmp/eh node tools/verify-artifacts.mjs web/employee-hub/index.html`
> PASSes clean; drive each of the five with Playwright and paste the observed
> before/after values; screenshots at 1440 and 390 in light and dark, read by eye.
> Update the README's limitations section for anything you did not fix.

### S5 — [now] The verify-assistify check count is stated three different ways
`reports/assistify-launch-survival.md` says "20 passed, 0 failed".
`docs/CODEX-PROJECT-HANDOFF.md` says "32 passing checks".
`CLAUDE.md` and the current task brief say 31. The file has 28 lines containing
`check(`, some inside per-stage loops, so the runtime total is not any of those
by inspection.
**Fix:** run it, then correct all three documents to the number it prints, and
add one line to `CLAUDE.md` saying the suite's own output is the only count that
counts. Command: `node tools/verify-assistify.mjs`
(it binds an ephemeral port and writes nothing). Do this **after** the in-flight
build lands — it drives `web/blueprint-3d/index.html`, which is being edited.

---

## (c) Deferred work — known-good, nobody has done it

### C1 — [after build] Decide what happens to ~229 retailer product photos
`web/main-site/index.html` composes retailer photo URLs at runtime through one
`remotePhoto()` generator with a blueprint-plate default. Graceful, but in the
artifact target every one of those photos is CSP-dead, and an adversary flagged
some hosts as dubious provenance: `storage.googleapis.com/deqvfyrddnjqwe/…`,
`vbtku.fredsbox.co.uk`, `www.oceanproperty.co.th`, `d3q01gc7kwv7n6.cloudfront.net`,
serving images labelled "REPRESENTATIVE REAL PRODUCT". Another agent judged they
"cannot be embedded at their volume".
**Decision needed from the owner, not an agent:** keep the blueprint plates as
the shipped state and delete the remote photo path, or license a small set of
real product images and embed them. Note `builder-assist-sites/public/embedded-images/`
already holds ~71 extracted `.webp` files — check there before sourcing anything.

### C2 — [now] Remove a stray committed file
`web/main-site/Builder assist integration` is a tracked 1-byte file containing a
single newline, added by commit `c421751`. Delete it. A filename with spaces and
no extension in a web directory is a trap for the next glob.

### C3 — [now] Refresh the two stale status documents
`reports/assistify-launch-survival.md` says "three named PDFs were referenced but
absent; no hashes or immutable source linkage existed". That is no longer true:
`builder-assist-sites/public/project-plans/66th-st-approved-plans.pdf` hashes to
`61b4dd3ee3a7738d6d8bba58455d31178c0149c4c6257b8b220db6ef1f52bd52`, which is
**byte-identical** to the `sha256` recorded for document `approvedplans-4752-25`
(18 pages) inside `web/blueprint-3d/approvedplans-4752-25-assistify-model.json`.
The controlling plan set is in the repo and verified against the model. The same
report's "Existing viewer: seven stages" and the NO-GO rationale predate the
twelve-stage engine. Rewrite both against HEAD rather than leaving a reader to
discover it.

### C4 — [after build] Publish Assistify for the first time
No artifact named Assistify exists in the 21 owned. `web/assistify-bundle/index.html`
(1,805,436 bytes as of 20:14 today) is the in-flight build's self-contained
target. Once it PASSes, publish it (covered by item 2's last row) — that is the
first time Assistify becomes reachable to anyone without a checkout.

### C5 — [deferred, needs H3] Implement the progress contract
Once a database exists, implement `docs/assistify-progress-backend-contract.json`
behind an adapter that wraps `AssistifyProgressStore`, keep a local cache for
offline jobsite use, make the server authoritative, and put evidence photo bytes
in object storage with only metadata in the progress event. `CLAUDE.md` is
explicit that a filename alone is not evidence storage. The stage IDs are
database keys: do not rename them.

---

## Standing guidance — the traps in this project that keep costing time

Each of these cost a run at least once. The rule is what prevents the repeat.

1. **A canvas mounted while hidden renders blank and throws nothing.**
   The main-site track had to call `unmountBp3d()` *before* swapping
   `app.innerHTML` and `mountBp3d()` *after*, so the canvas is only measured
   while live and visible.
   *Rule:* mount after the node is in the DOM and visible; tear down on leave.
   Prove it with a full-canvas `getImageData` distinct-colour count and a
   `requestAnimationFrame` rate measured against a baseline probe — the
   adversary measured 122/s mounted, 60/s after leaving, 120/s after three
   mount/unmount cycles. Never "no console errors".

2. **A relative `<iframe src="../…">` in a published artifact renders an empty
   frame with zero console errors.** An artifact is one file with no siblings.
   *Rule:* probe whether the sibling is reachable and fall back to a `srcdoc`
   bundle. The main site already ships a `srcdoc` iframe for `#/estimator` —
   copy that escaping, do not reinvent it.

3. **Sandbox egress failures and CSP violations masquerade as each other.**
   Chromium here fails every external request, `fonts.googleapis.com` included,
   and that host is fine in production. Conversely a host that answers 200 to
   `curl` (the chatgpt.site photo host does) is still CSP-blocked for viewers.
   *Rule:* judge CSP statically against the allowlist. Never from a request
   failure, and never from a shell success.

4. **A static external-reference scan misses runtime-composed URLs.**
   `findExternalRefs` reported `externalRefs: []` for a page carrying ~120
   retailer photo URLs inside a JSON blob.
   *Rule:* before writing "CSP clean", grep the whole file for `https?://`, not
   just tag markup, and drive the flow that renders the images.

5. **A route walk built from signed-out anchors is not a route walk.**
   `tools/verify-artifacts.mjs:149`/`:171`. Two admin-only 390px overflows and a
   pair of `#/estimator` console errors lived behind that gap.
   *Rule:* sign in with each persona and walk the gated routes explicitly.

6. **`hidden` loses to any `display` rule.** `.saves{display:flex}` defeated
   `[hidden]{display:none}`, leaving three dead save buttons visible with a
   silent no-op click.
   *Rule:* toggle `el.hidden` AND ship `[hidden]{display:none !important}` for
   any element whose class sets `display`. A control that cannot act must say so,
   never no-op.

7. **A CSS grid track of `1fr` cannot shrink below its items' min-content.**
   `.est-fields` measured 502px min-content, producing 178px of body overflow at
   390px on the primary CTA route.
   *Rule:* use `minmax(0,1fr)` on any track holding inputs or tables, and measure
   `scrollWidth - clientWidth` at 390px rather than eyeballing the reflow.

8. **A number in a document drifts from the number the tool prints.**
   The Assistify suite is documented as 20, 31 and 32 checks in three files. A
   README byte count was off by 1,170 bytes from `stat`.
   *Rule:* re-derive counts and sizes from the command at the moment you write
   them, and cite the command. A figure you remember is not a sourced figure.

9. **One fetch path's 403 is not the network's 403.** The parcel endpoints were
   filed as launch-blocking on 2026-08-27 after 403s; the same three URLs return
   200 and full records through `curl` from this container.
   *Rule:* before recording an external source as unavailable, retry through a
   second path and record which path failed. "403 via WebFetch" and "unavailable"
   are different findings.

10. **`localStorage` persists across your own test runs and contaminates
    evidence.** A dark-mode screenshot was captured with a sort order left over
    from a previous run.
    *Rule:* start each verification pass from a fresh browser context, and also
    run one pass with storage overridden to throw — all 16 pages survive that
    today, which is the standard to hold.

11. **The published artifact is not the repo.** Artifact 89d6cc50 contains 100
    occurrences of `bp3dRoot` and zero of `assistify`; the repo file is the
    inverse. Repo work is invisible to every viewer until someone publishes.
    *Rule:* finishing a page means publishing it to its existing URL and
    re-reading it to confirm — and, for a shared link, re-pinning the share.
