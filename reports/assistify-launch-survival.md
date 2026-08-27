# Assistify launch-survival release record

Date: 2026-08-27  
Branch: `codex/assistify-survival-mode-20260827`  
Base: `claude/builder-assist-workflow-verify-yc0iwy` at `1a04c05`

## Decision

**NO-GO for production launch.** The reusable viewer and its automated
acceptance checks are release-candidate quality, but no real project plan set,
parcel/survey evidence, terrain/grading source, civil/utility source,
production authentication, server persistence, workspace isolation,
observability backend, or production configuration is present in this
repository. Those are critical unverified systems, so this record does not
authorize deployment, merge, or production use.

## Baseline

- Repository artifact verification: 4 PASS, 0 WARN, 0 FAIL.
- Existing viewer: seven stages, global `bp3d.*` persistence keys, duplicated
  portal engine/data, and permanent property-specific geometry/data.
- Existing recompute check: blocked on Windows by a hard-coded `/tmp` path.
- Required viewport probe: no baseline horizontal overflow, but no durable
  automated matrix existed.
- Source evidence: three named PDFs were referenced but absent; no hashes or
  immutable source linkage existed. Property facts were therefore not
  independently auditable from the repository.

## Implemented release candidate

- Removed the permanent property takeoff and all project-specific runtime
  dimensions, coordinates, identity, and assumed physical geometry.
- Preserved the feet-based perspective camera, orbit behavior, near-plane
  clipping, depth sorting, Canvas faces/lines, staged visibility, dimensions,
  and model-comparison extension points.
- Added a validated project/model contract with document hashes, page/region
  citations, fact states, stable stage IDs, and required element provenance.
- Added exactly twelve geometry-controlling construction stages. Empty stages
  say `UNVERIFIED`; they do not draw placeholder geometry.
- Added exactly twelve real tools. Evidence-dependent Source and Map tools are
  disabled with explicit reasons until prerequisites exist.
- Added project-scoped, versioned browser prototype persistence, corruption
  fallback, import size limit, export, and clear behavior. UI copy explicitly
  disclaims production storage/authentication/isolation.
- Replaced the generated portal copy with the shared viewer entry point.
- Added keyboard, pointer/touch, pointer-cancel/lost-capture, reduced-motion,
  live announcements, semantic controls, focus visibility, and a nonvisual
  twelve-stage model outline.
- Repaired the artifact and recompute harnesses for Windows and relative local
  assets; artifact evidence filenames no longer collide on `index.html`.

## Accountability

| Stream | Accountable result |
|---|---|
| A01 / SP01 | History and prior-engine recovery documented; reusable renderer retained. |
| A02 / SP08 / SP09 | Acceptance gates encoded in `tools/verify-assistify.mjs`; 12 stages and 12 tools enforced. |
| A03–A04 / SP02 / SP04 | Missing plan evidence recorded; schema requires hashes and page/region provenance. |
| A05–A07 / SP03 / SP05–SP10 | System inventory, risk-driven architecture, renderer/model split, evidence gating, and implementation completed. |
| A08–A09 / SP13–SP14 | Adversarial, functional, responsive, accessibility, and performance-smoke checks completed. |
| A10 / SP12 | Prototype auth/storage limitations disclosed; production auth and workspace isolation remain unverified. |
| A11–A12 / SP11 | Cross-platform build/test paths and scoped prototype migration added; server storage/migration remain unverified. |
| A13 | Dirty-frame Canvas rendering, DPR cap, resize observation, and bounded upload added; real large-model budgets remain to certify. |
| A14 / SP15 | Browser errors and request failures are test-gated; production telemetry/incident routing remain unverified. |
| A15 | Keyboard/touch/reduced-motion/live-region/nonvisual output added; support operations remain unverified. |
| A16–A17 / SP16 | Candidate frozen only after two clean critical-path passes; rollback is branch/commit reversion. |
| A18 | No new runtime dependencies; local engine and standard browser APIs only. |
| A19 | Corrupt local view state falls back safely; production backup/recovery and chaos testing remain unverified. |
| A20–A21 | Cutover is NO-GO; hypercare cannot start before production systems and real project evidence are certified. |

## Verification evidence

Targeted command:

`node tools/verify-assistify.mjs`

Result: **20 passed, 0 failed on the final pass**. Coverage includes schema acceptance/rejection,
unique stage/tool counts, all twelve stage visibility transitions using a
source-linked synthetic test fixture, plan register, nonvisual outline,
project-scoped restore, keyboard dimensions, reduced-motion behavior,
320×568, 390×844, 768×1024, 1366×768, 1440×900, 1920×1080, and 200% zoom.

Repository artifact command:

`node tools/verify-artifacts.mjs web/blueprint-3d/index.html web/employee-hub/index.html web/main-site/index.html web/material-compare/index.html`

Result: **4 PASS, 0 WARN, 0 FAIL on both clean post-change passes** with no JavaScript errors, console errors,
failed requests, dead controls, or page-level horizontal overflow. Evidence is
stored in `reports/verify-assistify-post/`.

Recompute command:

`node tools/check-recompute.mjs web/blueprint-3d/index.html`

Result: **N/A, no errors**. The viewer is not a numeric calculator surface;
the cross-platform smoke harness now completes successfully.

## Rollback and cutover gates

Rollback before merge: discard or revert the commits on
`codex/assistify-survival-mode-20260827`. Rollback after a future merge must
restore the prior release artifact and clear only versioned
`assistify3d:v1:*` prototype keys; never delete unrelated browser/workspace
data.

Production cutover requires, at minimum: a real plan register with immutable
files/hashes and reviewer signoff; plan-derived project geometry; verified
parcel/map registration with legal-survey disclaimer; verified terrain and
utility inputs or explicit exclusion; server-side authorization and workspace
isolation; durable storage/migration/backup tests; monitoring and incident
routing; large-model performance budgets; security/privacy review; rollback
drill; and two additional clean passes in the production-equivalent
environment.
