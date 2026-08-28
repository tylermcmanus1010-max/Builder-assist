# Builder Assist launch operations and recovery

Updated: **2026-08-27T09:52:00Z**. This document records verified evidence and
keeps unperformed production work marked `UNVERIFIED`.

## Release candidate

- Candidate: working tree based on `4150427cc75f`; Site checkpoint pending.
- Previous known-good hosted version: current Site version before this candidate.
- Data changes: two additive migrations only—upload batch table, file/batch link,
  and created-project recovery marker. The migrations contain no `DROP`, rename,
  truncate, or destructive update.
- Release scope: authenticated owner workspace; one multi-document plan uploader;
  shared project context; materials estimate/comparison/finishes; persisted
  Assistify/Growify records; the supplied project's provisional, source-linked 3D
  workspace; exactly 12 stages and tools; no authoritative parcel claim.

## Production configuration gate

| Surface | Evidence | Status |
|---|---|---|
| Build | bounded Vinext production build completes | VERIFIED LOCALLY |
| Local runtime rehearsal | plain `vinext start` cannot load `cloudflare:workers`; supported Cloudflare/Vite loopback runtime completed two critical-path passes | VERIFIED LOCALLY; HOSTED WORKER RUNTIME UNVERIFIED |
| Database | `DB` binding declared in hosting configuration | CONFIGURED, LIVE READ/WRITE UNVERIFIED |
| Storage | `BUCKET` binding declared in hosting configuration | CONFIGURED, LIVE UPLOAD/DOWNLOAD UNVERIFIED |
| Authentication | platform identity header required; no fallback identity | SOURCE/TEST VERIFIED, HOSTED BOUNDARY UNVERIFIED |
| Secrets | no application secrets stored in source; managed bindings only | SOURCE VERIFIED |
| Health | `/api/health` checks an application D1 table and R2 without reading user records | LOCAL RUNTIME VERIFIED, HOSTED RESULT UNVERIFIED |
| Logging | API failures include incident ID; readiness failures log dependency state | IMPLEMENTED, CENTRAL RETENTION UNVERIFIED |
| Alerts | no verified notification destination | MISSING — P1 |
| Backup/restore | provider capability/operator access not demonstrated | UNVERIFIED — P1 |
| Domain/TLS | Sites-managed existing URL | PREVIOUS RELEASE EXISTS; CANDIDATE UNVERIFIED |

## Rollback decision and procedure

Rollback triggers are any P0/P1 regression: cross-workspace exposure, upload data
loss/duplication, false upload success, repeated 5xx, migration failure, inaccessible
critical journey, or an unavailable rollback path.

1. Stop further promotion and record the failing request/time/version.
2. Preserve D1/R2; do not delete user projects or manually reverse additive columns.
3. Restore the previous known-good Site version with the hosting version rollback.
4. Verify initial load, authenticated GET, one existing project read, one source-plan
   download, and `/api/health` before reopening access.
5. Reconcile any `processing` upload batch older than 15 minutes. The retry path
   deletes only files tagged with that batch and deletes a new project only when
   the batch records `created_project=true`.
6. If bytes exist without a committed file row, preserve them for operator review;
   never guess ownership from an R2 key.
7. Document impact, affected workspace IDs (not plan contents), remediation and
   the tests required before another candidate.

Database rollback is forward recovery: additive migrations remain compatible with
the previous application, and rollback does not require destructive schema SQL.
Provider backup/restore remains `UNVERIFIED` until an authorized operator proves it.

## Incident procedures

| Incident | Detect | Immediate containment | Recovery gate |
|---|---|---|---|
| Application outage | Site status, readiness 503, user reports | halt deployment; keep data services unchanged | previous version restored; smoke tests pass |
| D1 outage/timeout | health database=failed, API incident IDs | fail writes; show retry; do not report success | health ready; existing project read; idempotent upload retry |
| R2 outage/timeout | health storage=failed, upload incident IDs | stop upload completion; compensate committed batch files | health ready; test byte put/read/delete in authorized environment |
| Authentication outage | 401 spike/identity absent | deny access; do not enable fallback account | identity headers and workspace isolation proven |
| Suspected data exposure | access report or boundary test | remove candidate from access; preserve logs | incident owner confirms scope; credentials/session controls reviewed |
| Data corruption | mismatched project/file relationships | stop mutations; preserve database/storage | backup or forward repair verified on copy; relationship checks pass |
| WebGL failure | model error UI/context status | keep Verification accessible; disable 3D tools | renderer retry succeeds on supported device |
| Failed migration | deployment log/status | abort promotion; keep previous release | schema inspected; additive forward fix tested |
| Severe latency | readiness/API latency trend | pause uploads; reduce optional layers | budgets met and two clean critical passes |

## Safe failure drills completed locally

- Disguised and invalid upload signatures are rejected by pure tests.
- Duplicate upload intent is represented by a workspace-scoped unique key and a
  completed/in-progress recovery path; source and migration tests pass.
- Corrupt viewer preferences recover to stage 1 without breaking the workspace.
- A 3D initialization failure keeps the evidence register available and exposes
  retry instead of false success.
- Route failures render a retryable boundary without stack traces.
- Database/R2 timeout, partial-write and rate-limit drills against the actual
  hosted providers remain `UNVERIFIED` and block GO.
- Estimate recalculation now replaces the rate book, updates the project and
  writes its audit event in one D1 transactional batch. Source/build tests pass;
  hosted transaction-failure injection remains `UNVERIFIED`.
- Plain Node rejected the Workers-only `cloudflare:` module; it is not the
  deployment target. The supported Cloudflare/Vite runtime completed two fresh
  local critical-path passes when bound to loopback. Each pass verified schema-
  aware readiness, authenticated project creation/read, a real 3,315,406-byte
  plan upload, idempotent replay, refresh/reopen, byte-exact private download,
  12-line transactional recalculation, cross-workspace 404, and protected
  Assistify rendering. Hosted identity injection/provider behavior is not
  represented by these local headers and remains `UNVERIFIED`.
- Initial multipart testing exposed Vinext's 1 MB server-action guard applying
  before App Router route dispatch. An explicit 85 MB runtime ceiling now sits
  above the application's 80 MB plan-set ceiling but below the provider request
  limit. The supplied 3.3 MB plan passed both clean local journeys.
- The original `SELECT 1` readiness check falsely passed before migrations.
  Readiness now queries `gen1_workspaces`; the missing-schema condition was
  reproduced, fixed, and reverified after applying all three local migrations.
- A late secret/dead-control scan found hard-coded prototype passwords, an
  unavailable takeoff-server token form and a browser-storage path that could
  restore a forged legacy admin session in the static shell. Credentials,
  password inputs, client-only login/admin entry, browser session restoration
  and token collection were removed; legacy admin/estimator routes now fail
  closed. Gen1 relies on Site identity plus server-side authorization. The
  30-test gate includes a regression for these boundaries.

## Measured local release budgets

| Asset / behavior | Measured result | Gate |
|---|---:|---|
| Static shell HTML | 966,630 bytes raw / 257,945 bytes gzip | Improved; still P2-heavy for intermittent field networks |
| Inline image data removed | 71 images / about 1.2 MB externalized | PASS — cacheable assets no longer block HTML parsing |
| Lazy Three.js engine | 535,236 bytes minified / 132,774 bytes gzip | PASS WITH LIMITATION — loaded only on Assistify; device timing unverified |
| Built client output | 7.0 MB including 3.3 MB approved plan PDF and externalized imagery | PASS WITH LIMITATION — PDF is user-initiated; browser cache behavior unverified |
| Renderer pixel ratio | capped at 2 | PASS in source; actual frame rate/memory unverified |

No frame-time, memory-growth, slow-network interaction, or field-tablet metric
has been recorded. Those remain `UNVERIFIED`; bundle measurements alone do not
certify performance.

## Hypercare thresholds

- Declare incident immediately for any cross-workspace access, data loss, false
  upload success, or corruption signal.
- Roll back for two consecutive readiness failures lasting five minutes, a
  critical-journey error rate above the launch owner's agreed threshold, or any P0.
- Disable the provisional 3D route when WebGL failures prevent the nonvisual
  verification alternative or when sourced geometry is found wrong.
- During the first launch window, check readiness, authenticated project load,
  upload/save failures, renderer errors and latency at launch, +15m, +30m, +60m,
  +2h and the next business day. Alert delivery and ownership must be assigned
  before GO.
