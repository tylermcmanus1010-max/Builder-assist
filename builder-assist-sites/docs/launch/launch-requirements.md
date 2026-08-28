# Builder Assist launch requirements

Research converted to actionable requirements: **2026-08-27T07:52:32Z**.

This timestamp starts the user-required productive implementation and validation
period. Research time before this point is excluded.

## Critical launch outcome

A signed-in construction-company user can create one project by uploading one or
more plan documents, see durable processing and plan-sheet status, enter a
viewport-bound Assistify workspace, inspect source-linked true 3D through exactly
12 construction stages and 12 reachable tools, review parcel/topographic evidence
without fabricated accuracy, leave and return without losing state, and recover
from ordinary network, validation, or renderer failures without false success.

Tomorrow's smallest safe launch scope is one verified project: the supplied
12228 N 66th St plan set. Builder Assist may present plan-derived geometry only
at its recorded evidence state. Authoritative parcel details remain blocked until
the official record query is retrieved and reconciled; unresolved values remain
explicitly unavailable and do not become geometry.

## Acceptance and traceability map

| ID | Severity | Requirement | Evidence basis | Implementation | Acceptance test | Status |
|---|---:|---|---|---|---|---|
| R01 | P0 | Every project API request requires an authenticated owner identity and server-side ownership check. | S168, S173–S175 | `app/api/gen1/route.ts`; project repository | Missing identity → 401; cross-owner ID → 404/403; no fallback account | Implemented; hosted multi-account test UNVERIFIED |
| R02 | P0 | Uploads accept only allowlisted PDF/image plan types, validate size/MIME/signature, generate opaque storage keys, and never expose raw storage paths. | S166, S171, S107 | upload API and R2 repository | disguised file, oversized file, unauthenticated and cross-project uploads fail safely | Automated pure tests PASS; hosted upload UNVERIFIED |
| R03 | P0 | Project creation, uploaded-file records, plan-sheet processing state, and module linkage commit atomically or fail without an orphan house. | S119–S120, S131, S201–S205 | D1/R2 compensation and upload-batch migration | injected write failure leaves no partial project; safe retry creates one project | Compensation/idempotency implemented; provider fault drill UNVERIFIED |
| R04 | P1 | Mutations reject cross-site requests and duplicate intent; errors expose safe messages plus incident IDs, never internals. | S167, S169–S170, S184–S188 | API request guard, idempotency records, structured errors | forged Origin and duplicate request tests; logs correlate incident ID | Source tests PASS; hosted log correlation UNVERIFIED |
| R05 | P1 | Assistify uses real WebGL 3D with perspective/orthographic cameras, orbit/pan/zoom, stable fit/reset, resize, and context-loss recovery. | S121–S124, S191, S210–S212, S240 | Assistify React viewer and Three.js scene | real WebGL context; camera controls work; forced context loss recovers or offers retry | Implemented/build PASS; rendered device test UNVERIFIED |
| R06 | P1 | Exactly 12 stages control actual object visibility in cumulative and current-stage modes with play/pause/restart/previous/next and stable camera state. | S161–S165, S216, S233 | stage/object manifest and playback controller | all 12 stages change geometry; keyboard and mobile controls; no camera reset | Pure stage tests PASS; rendered playback UNVERIFIED |
| R07 | P1 | Every significant object carries source sheet/detail/revision/dimension/elevation, stage, confidence, verification, and ambiguity; inferred/assumed/unresolved geometry is visibly and textually distinct. | S076–S085, S161–S165, S216, S236–S240 | model manifest, object inspector, evidence table | select each critical object; provenance displayed; unverified states never mimic verified | Implemented; provenance/static tests PASS |
| R08 | P1 | Parcel, road frontage, adjacent parcels, terrain, and utilities display only sourced values with agency, record, date, CRS, confidence, and survey-accuracy caveat. | S115–S118, S125–S127, S216, S234, S243–S245 | parcel evidence model and map/3D layers | unavailable values say unavailable; official query and coordinate transform recorded | Blocked on official parcel query |
| R09 | P1 | Plan upload creates one new house/project and that project context persists across Buildify/Quotify, Assistify, and Growify. | S041–S055, S101–S110, S217–S230 | shared project store/API and persistent left rail | upload → one house; select it in all modules; refresh/reopen retains selection | Implemented; hosted refresh/write UNVERIFIED |
| R10 | P1 | Exactly 12 Assistify tools have labels, tooltips, active/focus/disabled/loading/error/cancel states and remain reachable in the safe viewport. | S031–S055, S136–S160 | responsive tool dock and bounded panels | inventory and operate 12 tools at required viewports/200% zoom | Implemented/static PASS; rendered viewport matrix UNVERIFIED |
| R11 | P1 | No unintended page-level horizontal or main-workspace vertical scrolling; map/canvas owns its bounds and panels use intentional internal scrolling. | S137–S140, S143–S160, S193–S199 | viewport application shell | 320×568 through 1920×1080, portrait/landscape, 200% zoom | CSS/static PASS; rendered viewport matrix UNVERIFIED |
| R12 | P1 | 3D information has an equivalent keyboard-operable object/provenance/stage table and all status/error changes are announced. | S136–S160 | accessible evidence register, live regions, toolbar/dialog semantics | keyboard-only critical path; semantic audit; screen-reader names/status | Implemented/static PASS; assistive-tech run UNVERIFIED |
| R13 | P1 | Plan register covers all 18 supplied sheets with discipline, scale, revision, units, geometry, ambiguity, and superseded status. | authoritative supplied plans | `docs/launch/plan-sheet-register.json`; in-product plan register | count=18; sheet IDs/titles reconcile; no unreviewed supplied page | 18/18 registered; automated inventory PASS |
| R14 | P1 | Plan-to-model verification records explicit source and model values, precision, difference, and resolution with zero known mismatch for modeled verified elements. | S076–S085, S216, S238–S240 | verification matrix and automated manifest checks | manifest dimensions equal controlling explicit values; unknowns excluded | 6 explicit checks PASS; parcel/footprint/underground values UNVERIFIED |
| R15 | P1 | Viewer state, processing status, selected project/stage, visibility, and evidence updates persist durably and survive refresh/interruption. | S107–S110, S119–S120, S201–S205 | D1 project state plus bounded local viewer recovery | save/refresh/reopen; interrupted write shows error and safe retry | Local preference tests PASS; hosted refresh/interruption UNVERIFIED |
| R16 | P1 | Client/server/upload/render failures are observable with privacy-safe structured context, health checks, and an operator recovery path. | S169–S190, S206–S209, S214–S215 | error boundary, structured logs, health endpoint, runbook | injected failures appear in user UI and operator evidence; no plan contents in logs | Implemented locally; central alerting MISSING |
| R17 | P2 | 3D budgets cap pixel ratio and geometry complexity, release GPU resources, and remain usable on a mid-range field tablet. | S032, S041–S055, S121–S124, S191, S210–S213 | lazy engine, DPR cap, resource disposal | measure bundle, frame time, memory, long-session cleanup | 132.8 KB compressed lazy engine; device frame/memory UNVERIFIED |
| R18 | P2 | Direct AI output is framed as assistive verification, never survey/design authority or a one-click takeoff truth source. | S076–S085, S157–S165 | evidence status language and review gates | no unsourced “verified” value; user can open source and mark unresolved | Implemented/static PASS |

## Explicit deferrals

- Live IoT/as-built telemetry: no authorized sensor data or integration exists.
- Legal survey determination: county/city GIS is reference evidence, not a legal
  boundary survey.
- Invented MEP routing: plan-supported systems may be represented only at the
  precision the plans support; missing routing stays `Not shown`.
- Google Calendar synchronization: requires user authorization and is outside
  the digital-twin critical path. Calendar-ready persisted events and ICS export
  remain the safe launch scope.
- Multi-company collaboration and invitation delivery: external identity and
  notification decisions are not yet verified; owner isolation cannot be weakened.

## Rejected product behavior

- A 2.5D drawing or prebuilt animation labeled “true 3D” or “digital twin”.
- Parcel IDs, bearings, frontage, contours, utilities, or dimensions invented to
  make the scene appear complete.
- A project row created before the upload transaction can be completed safely.
- Canvas-only information with no text or keyboard equivalent.
- Hidden toolbar overflow, offscreen draggable panels, or page-level scroll traps.
- Success messages before D1/R2 persistence succeeds.
- Shared fallback accounts, client-only authorization, raw exception messages,
  or public predictable storage identifiers.
