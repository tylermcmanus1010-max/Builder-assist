# Builder Assist — Codex continuation handoff

Updated: 2026-08-28

## Continue from here

- Repository: `tylermcmanus1010-max/Builder-assist`
- Branch: `claude/builder-assist-workflow-verify-yc0iwy`
- Handoff base commit: `7e349fa6c3147390b347f868d803393525c079ae`
- Canonical application: `builder-assist-sites/`
- Live application: <https://builder-assist.valentino-in-8162.chatgpt.site>

Read this file and `CLAUDE_CODE_HANDOFF.md` completely before editing. The
older root and `web/` implementations are historical references, not the
canonical runtime.

## Product goal established in the chat

Builder Assist must be an operational construction platform for general
contractors, custom-home builders, project managers, estimators,
superintendents, field teams, trade partners, office coordinators and selected
property members. It must connect plans, project records, material pricing,
construction operations, growth/CRM workflows and project-specific 3D
visualization around one active house record.

The user repeatedly rejected attractive but nonfunctional prototype controls.
Visible controls must perform their stated job, persist required data, report
real failure, and provide recovery. Never present mock integrations, fabricated
parcel information, generic model geometry or hard-coded success as operational.

## Three connected workspaces

### 1. Buildify & Quotify

- One upload surface accepts multiple plan documents as a single plan set.
- A successful upload creates exactly one new house/project.
- Maintain a persistent project rail on the left so users can switch houses.
- Inventory plans and produce a materials-only baseline build estimate.
- Do not estimate labor and do not restore the labor estimator.
- Make comparable project lines a readable category dropdown with populated
  results.
- Provide catalog comparison, competitive intelligence and current material
  market position tied to the selected house and its plan-derived quote.
- Move finishes out of the ordinary catalog/quote flow into a separate,
  operational **Select and Price Finishes** workflow.

### 2. Assistify

- Shares the same selected project and persistent project rail.
- Must not duplicate Buildify/Quotify or Growify functionality.
- Job Cost does not belong in Assistify.
- Remaining modules must be operational workflows, not note cards.
- Photo-dependent records need image upload.
- Dates created in operational modules should feed a project calendar designed
  for a future user-selected Google Calendar integration. Do not label that
  external integration connected until credentials and authorization exist.
- Organize modules for fast discovery and surface important module actions in
  Overview and phase navigation.
- Use plan sources, revisions and evidence states throughout.

### 3. Growify

- A real contractor CRM/growth workspace rather than decorative pages.
- Shares the active project created by the uploader.
- Preserve project switching across Growify.
- Do not silently copy Assistify or Buildify/Quotify functions into Growify.

## Non-negotiable 3D direction

The user rejected the later blocky massing model. The desired experience is the
original plan-reader engine style previously demonstrated with the Van Horn
example, but **Van Horn itself must remain deleted**.

Preserve the reusable engine in:

`builder-assist-sites/app/member-portal/assistify/project-model-viewer.tsx`

Required rules:

- Never restore Van Horn residence geometry, labels, takeoff data, routes,
  property records or UI.
- Never restore Hubble or BP3D reference-property data.
- Keep the reusable engine and its navy plan-reader visual language,
  translucent linework, dimensions, selection, plan-source details,
  orbit/zoom, camera recovery and stage controls.
- The renderer must receive a property-specific `PropertyModel`; it must not
  contain built-in house geometry.
- Swenka Residence is the current controlled record in
  `builder-assist-sites/lib/property-models.ts`, calibrated to written A103
  controls. It is not a generic fallback.
- Every uploaded property without issued geometry must show an honest
  **model pending** state. Do not display Swenka, Van Horn or blocky stand-in
  geometry for it.
- Automatic arbitrary PDF-to-reviewed-`PropertyModel` generation is not yet
  implemented. That is the highest-value remaining 3D engineering task.

## Intended Assistify digital-twin outcome

The long-form launch brief asks for a trustworthy, plan-traceable,
parcel-aware, interactive construction digital twin. Continue toward:

- complete plan-sheet inventory, controlling revisions, units, scales, north,
  datums, benchmarks and explicit dimension controls;
- model-object provenance with source sheet/detail/revision, confidence and
  verified/scaled/inferred/assumed/unresolved status;
- interactive perspective and orthographic views, orbit, pan, zoom, fit/reset,
  cardinal views, selection, measurement, layer control, section/cutaway,
  X-ray and underground inspection;
- exactly 12 construction stages controlling real project geometry, with
  direct selection, previous/next, play/pause/restart and cumulative/current
  stage modes;
- authoritative parcel, adjacent-parcel, road-frontage and terrain evidence
  with source agency, retrieval date, coordinate system and confidence;
- no invented APNs, parcel dimensions, bearings, frontage, adjacent parcel
  IDs, elevations, utilities, setbacks or easements;
- viewport-bound desktop/tablet/mobile layouts with reachable tools, no
  unintended page-level overflow, keyboard support and accessible
  non-visual information.

Do not claim a legal survey from ordinary GIS data. Distinguish pavement edge,
road centerline, right-of-way, parcel boundary, frontage and setback.

## Current implementation map

- `builder-assist-sites/app/api/gen1/route.ts` — authenticated project/file API,
  D1/R2 persistence, validation and project hydration.
- `builder-assist-sites/app/member-portal/assistify/assistify-client.tsx` —
  project rail and Assistify workspace.
- `builder-assist-sites/app/member-portal/assistify/project-model-viewer.tsx` —
  reusable Canvas plan-reader renderer.
- `builder-assist-sites/lib/property-models.ts` — property-model contract and
  controlled records.
- `builder-assist-sites/public/gen1-operational.js` — operational legacy portal
  behavior using the Gen1 API.
- `builder-assist-sites/drizzle/` and `builder-assist-sites/db/` — additive D1
  schema and migrations.
- `builder-assist-sites/docs/launch/` — research ledger, plan register,
  traceability, risks, dependencies and launch evidence.
- `builder-assist-sites/tests/` — operational, security, model, migration and
  evidence tests.

## Verified baseline recorded before transfer

The prior session recorded the following from `builder-assist-sites/`:

- production Vinext build passed;
- ESLint passed;
- automated tests: 34 passed, 0 failed;
- desktop model inspected at 1363×936;
- stages 1 and 12 inspected;
- playback advanced;
- object selection and source traceability were inspected;
- no page overflow at that inspected desktop viewport;
- no site-origin browser errors were observed.

Treat these as historical transfer evidence, not a substitute for rerunning the
checks in the new Codex environment. Authenticated mobile/tablet behavior,
role-boundary coverage, production-like integrations, authoritative parcel
reconciliation and arbitrary-plan geometry generation remain unverified or
incomplete.

The user supplied ambitious 250-source and launch-survival requirements. The
repository contains research and launch artifacts, but do not claim the
250-source audit, two-hour implementation floor, two clean production-like
passes, full security certification or a GO decision without independently
checking the evidence and completing every stated gate.

## First Codex run

From `builder-assist-sites/`:

```bash
npm ci
npm run lint
npm test
npm run build
```

Then:

1. Start the application using its documented local workflow.
2. Verify authentication remains server-enforced; do not weaken
   `requireChatGPTUser`.
3. Inspect the one-plan-set upload flow and confirm one upload intent creates
   one project, including duplicate and failed-upload behavior.
4. Verify the active project switches consistently across Buildify/Quotify,
   Assistify and Growify.
5. Search shipped application surfaces for Van Horn, Hubble and BP3D data.
6. Confirm unsupported houses show model pending with no substitute geometry.
7. Exercise all 12 construction stages, playback, camera controls, selection
   and source/evidence details.
8. Inspect 320×568, 390×844, 768×1024, 1366×768, 1440×900 and 1920×1080,
   plus keyboard access and 200% zoom.
9. Read the launch evidence and risk register before issuing any launch
   recommendation.
10. Report the real baseline before changing code, then fix the highest-impact
    verified failure first.

## Engineering rules

- Preserve Claude's and the user's existing work; use fast-forward commits.
- Keep all three products keyed to one authenticated, workspace-scoped project
  ID.
- Preserve server-side authentication, authorization and workspace isolation.
- Validate uploads by size, extension, signature and ownership.
- Prevent duplicate project creation and false success.
- Keep explicit evidence states and source revisions.
- Use written plan dimensions as controls; document any scaled calibration.
- Do not commit credentials, local environment files, build output or
  `node_modules`.
- Do not deploy or claim launch readiness merely because the build passes.
- After connected-system changes, rerun lint, build, meaningful tests and the
  affected end-to-end workflow.

## Primary continuation priority

Build the reviewed plan-ingestion pipeline that converts each uploaded plan set
into a project-specific `PropertyModel` while preserving source traceability
and human review. Until that pipeline produces controlled geometry, keep the
honest pending state. In parallel only where safe, continue replacing remaining
legacy visual controls with durable D1-backed operational workflows.
