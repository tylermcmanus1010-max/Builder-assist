# Builder Assist launch evidence report

Evidence freeze: **2026-08-27**. This report distinguishes source,
local-runtime, hosted and unverified evidence. It does not treat deployment as
customer-launch certification.

## Launch recommendation

**NO-GO for real-customer launch.** The owner-only Site may be deployed as a
restricted release candidate for authorized review. The critical local data
journey passes twice, but P1 blockers remain: authoritative parcel/frontage
reconciliation; rendered WebGL/mobile/200%-zoom inspection; hosted identity,
D1/R2 and large-upload fault checks; central alerts; provider backup proof; and
a hosted rollback rehearsal. No P0 remains in the inspected source/local scope;
hosted P0 boundaries are unverified rather than passing.

## Research status and gate

| Measure | Audited result |
|---|---:|
| Candidate sources | 256 |
| Rejected sources | 6 |
| Qualifying sources | 250 |
| Unique domains | 104 |
| Direct user voice | 100 |
| Nonmarketing sources | 214 |
| Vendor-controlled sources | 36 |
| Previous 12 months | 143 |
| Additional previous 36 months | 8 |
| Older than 36 months | 4 |
| Exact date unverified / excluded from recency quotas | 95 |
| Stratified sources reopened | 25 |

Source types: 100 direct-user voice, 35 official technical documentation, 30
research/standards, 25 security/reliability/incident, 25 engineering/operations,
and 35 independent comparisons/case studies. The direct-user quota includes 30
detailed reviews, 25 forum/community discussions, 20 issue/support reports, 15
interviews/usability/customer-research reports and 10 substantial public social
discussions.

The source set covers Autodesk, Bluebeam, Buildertrend, Buildxact, CoConstruct,
Contractor Foreman, Fieldwire, Jobber, JobTread, Procore, Raken, ServiceTitan,
Smartsheet, Speckle, Trimble, xeokit, web-ifc, ArcGIS/MapLibre and adjacent
construction/operational systems. Specialized Assistify coverage is 78 BIM/
digital-twin/4D sources, 15 authoritative GIS/parcel/survey/topography sources,
47 direct 3D/BIM/GIS user-feedback sources, 33 mapping/responsive/accessibility
UX sources and 23 browser-3D/WebGL/large-model sources (124 unique sources).

Research saturation is **REACHED** under the specified rule: the final 25 qualifying
sources introduced no new P0/P1 pattern outside the registered risk categories.
The audit passed URL/domain deduplication, source classification, quota checks,
bias review and 25-source stratified revalidation.

### Important evidence patterns

Users value fast first value, one shared project context, usable field/mobile
access, visual understanding, easy organization, one plan-set upload, nearby
source sheets and unit-aware measurement. Recurring dislikes include long setup,
unclear module mazes, decorative controls, blank mobile viewers, heavy models,
lost cameras, vague upload failures, refresh loss, duplicates and silent
conflicts.

The top trust killers are invented parcel/plan/utility/dimension data, false save
success, cross-customer access, 2.5D presented as a digital twin, legal-survey
language applied to ordinary GIS, unexplained AI certainty, plans disappearing
after refresh and duplicate houses. Abandonment triggers repeat the slow-start,
dead-control, blank-viewer and upload-loss themes, plus missing sheet inventories
and falsely precise AI quantities. The synthesis contains 30 supported delight
patterns, 50 pain patterns, 20 trust killers, 15 abandonment triggers and 50
explicit “Builder Assist must not” rules.

Research limitations: public communities overrepresent motivated users; vendor
documentation establishes behavior rather than sentiment; affiliate comparisons
have reduced credibility; 95 sources lack an exact retained date; no
representative Builder Assist usability study was run; and the official parcel
record could not be fully retrieved.

## Evidence-driven launch scope

Delivered in the candidate:

- Authenticated, server-isolated workspaces with no fallback identity.
- One multi-document uploader that creates one house, validates content and size,
  stores private bytes, persists a recoverable batch and prevents duplicate replay.
- One selected project across Buildify/Quotify, Assistify and Growify.
- Materials-only estimates, readable category comparison, transactional
  recalculation, competitive rate-book labeling and separate finish selection.
- Operational Assistify execution records, photo evidence, dated work and ICS
  export; Job Cost/labor estimating is removed.
- A protected, lazy-loaded WebGL Assistify route with real geometry, perspective
  and orthographic cameras, orbit/pan/zoom, stable views, selection, measurement,
  clipping/section, cutaway, X-ray, layers, terrain, underground isolation,
  verification fallback and context-loss recovery.
- Exactly 12 selectable construction stages and 12 labeled tools; stage state
  controls actual scene objects in current/cumulative modes.
- Persistent project rail/mobile project drawer and links to source plans and
  execution records.
- An 18/18-sheet plan register, model-object provenance, evidence states and a
  plan-to-model matrix with six explicit PASS controls and three UNVERIFIED items.
- Schema-aware D1/R2 readiness, incident IDs, route recovery, an operator runbook,
  risk/system/dependency inventories and additive migrations.
- 71 inline images externalized: shell reduced from 2,383,678 bytes to 966,630
  bytes raw (257,945 gzip). The Three.js chunk is lazy at 535,236 bytes minified
  (132,774 gzip).

Removed/deferred:

- Labor estimation and Assistify Job Cost.
- Fake live supplier bids, messages, calendar sync, payment or AI plan parsing.
- Automatic geometry reuse for uploaded houses.
- Authoritative parcel/frontage/adjacent-ID claims until the official record
  conflict is resolved.
- Public/external access; the candidate remains owner-only.

## Plan, parcel and model truth

The supplied and repository plan PDFs are byte-identical. All 18 pages are in the
sheet register. Explicit controls pass for the A103 130 ft 6 in by 87 ft 6 in
control envelope, civil 6,078 sf stated home area, LF 88 elevation 1391.00, pad
elevation 1390.33, benchmark 1383.503 and unit orientation. The irregular
footprint, final parcel relationship and underground detailed routing remain
UNVERIFIED; the viewer labels MEP/utility content as coordination zones rather
than invented routing.

The plan contains an APN conflict (175-08-001B vs 175-08-001A) and a lot-area
conflict (31,350 sf vs 37,221 sf / 0.8542 acre). Adjacent APNs visible on the plan
remain pending cadastral confirmation. The Maricopa assessor record returned 403
and the official parcel MapServer metadata was reachable while query layers were
blocked. Therefore the parcel boundary, dimensions, frontage length/right-of-way
and authoritative adjacent reconciliation are not certified. The field-use gate
stays visibly closed.

## Verification completed

Automated: lint PASS; 30/30 Node behavioral/evidence tests PASS; Drizzle reports
no schema drift across 10 tables; production Vinext build PASS; `npm audit
--audit-level=moderate` reports 0 known vulnerabilities; `git diff --check` PASS.

Two clean local Cloudflare/Vite critical-path passes used separate workspaces.
Each verified readiness, authenticated bootstrap, one featured project, a real
3,315,406-byte PDF upload (201), idempotent replay (200), refresh/reopen, one
private file, byte-exact download, atomic recalculation to 12 unique lines,
cross-workspace denial (404) and protected Assistify server rendering (200).
Unauthenticated GET returned 401 and cross-site POST returned 403. The initial
run found two P1 defects—false-ready with an unmigrated schema and a 1 MB runtime
multipart guard—and both were fixed before the clean passes.

Accessibility/source review covered semantic landmarks/headings, explicit labels,
visible focus CSS, disabled/loading/error states, polite status announcements,
dialog focus trap/Escape close, keyboard playback/tools, a nonvisual verification
register, touch-mode camera mappings, reduced motion and internal-scrolling mobile
layouts. Actual screen-reader output, keyboard traversal in a rendered browser,
contrast sampling and 200% zoom remain UNVERIFIED.

Security/source and local checks covered required platform identity, same-origin
writes, workspace-scoped child queries, private R2 keys, opaque storage names,
type/extension/signature/size checks, bounded JSON/contact/date/numeric input,
safe client errors, duplicate intent, child ownership, cross-workspace denial and
no source secrets. Hosted header injection/stripping, session expiry, provider
rate limits and multi-account platform enforcement remain UNVERIFIED.

Database/migration checks: all three migrations were inspected and applied to the
local D1 test state; they are additive and contain no drop/rename/truncate/data
rewrite. Unique/index/foreign-key definitions and generation drift pass. D1 batch
recalculation and upload recovery pass locally. Hosted migrations, representative
production data, backup/restore, contention and provider timeout remain UNVERIFIED.

Dependency checks: reproducible `npm ci` completed, locked versions build, audit
found 0 known vulnerabilities, and failure/fallback behavior is inventoried.
License/legal review and provider credential rotation remain external checks.

Failure/recovery checks completed locally: invalid signatures, unauthenticated
requests, cross-site mutation, cross-workspace mutation, duplicate upload replay,
corrupt viewer preferences, renderer initialization failure, route failure,
missing schema readiness and WebGL context-loss source paths. D1/R2 unavailability,
rate limit, partial hosted write, hosted session expiry and interrupted deployment
were not injected.

Browsers and screen sizes inspected: **none rendered**. Source/CSS assertions cover
320x568, 390x844, 768x1024, 1366x768, 1440x900 and 1920x1080 layouts, but the Sites
preview/browser runtime was unavailable, so no visual or touch-device claim is
made. WebGL frame time, memory growth and slow-network field-tablet performance
also remain UNVERIFIED.

## Defects and remaining risk

Fixed during hardening: hard-coded prototype passwords, browser-restored legacy
admin impersonation and client-only admin entry points; an unavailable takeoff
token form; fallback identity/cross-object exposure; unbounded inputs;
raw storage-key exposure; ambiguous delete behavior; non-idempotent/partial house
uploads; first-load races; partially committed estimate recalculation; false-ready
health; the 1 MB multipart rejection; decorative 2.5D labeling; missing WebGL
recovery; page overflow architecture; stage-12 final-state omission; lost evidence
bytes on record delete; inline-image shell bloat; and unverifiable confidence copy.

Remaining P1/unverified: official parcel/frontage resolution; rendered WebGL/
viewport/accessibility matrix; hosted auth and account boundary; hosted D1/R2
upload/download/fault behavior; alert delivery; backup/restore; hosted health;
rollback rehearsal; and provider maximum-size/rate-limit behavior. P2: heavy shell
on field networks, no device timing, incomplete privacy/legal/support review, and
no representative user study. No accepted P3 item affects the recommendation.

## Production, monitoring, rollback and launch steps

Configured locally: Sites metadata, DB and BUCKET binding names, no app secrets,
additive migrations, health route, incident IDs and versioned Site workflow.
Hosted configuration is not certified until the candidate deployment reaches a
terminal success and authorized smoke checks are run.

Monitoring present: privacy-safe API incident IDs, D1/R2 readiness status and
operator/hypercare thresholds. Missing: a verified central log destination,
alert delivery/owner and production dashboards. Rollback is documented as Site
version restore plus forward-compatible database recovery; previous version
exists, but the exact candidate rollback has not been rehearsed.

Required path from NO-GO: deploy owner-only candidate; confirm hosted migrations,
identity and health; perform authorized upload/download/refresh/isolation and
failure drills; inspect the requested viewport/device/accessibility matrix; resolve
official parcel evidence; configure alerts and prove backup/restore; rehearse
rollback; then rerun two complete hosted/browser critical journeys and update the
risk register. Any P0/P1 failure returns the release to repair.

Hypercare after an eventual GO: check health/auth/core writes at launch, +15m,
+30m, +60m, +2h and next business day; monitor save/upload/renderer/API latency
and failed actions; immediately declare an incident for exposure, loss, corruption
or false success; disable the affected feature or roll back at the documented
threshold; connect each observation to severity, fix, test, deployment and
verification.

## Runtime and traceability

The research gate was completed separately. Productive implementation/testing
was continuously tracked from **2026-08-27T07:52:32Z** through the release
checkpoint, exceeding the required **120-minute** floor. Research time and idle
time are excluded; the final response records the checkpoint-to-handoff total.

Structured evidence: `source-ledger.json` / `.csv`, `research-quota-audit.json`,
`research-revalidation.md`, `research-synthesis.json`,
`research-contradictions.json`, `traceability-matrix.json`,
`plan-sheet-register.json`, `plan-to-model-verification.json`,
`risk-register.md`, `system-inventory.json`, `dependency-inventory.json` and
`operations-readiness.md` in this directory.
