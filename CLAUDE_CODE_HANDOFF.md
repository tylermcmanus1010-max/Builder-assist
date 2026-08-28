# Builder Assist — Claude Code handoff

Updated: 2026-08-28

## Canonical source

Continue development in `builder-assist-sites/`. It is the complete current
Vinext/React/Cloudflare Sites application that powers Builder Assist. The older
`web/` surfaces and root verification utilities are retained as historical
references; do not treat them as the canonical application.

Live application: <https://builder-assist.valentino-in-8162.chatgpt.site>

## Product direction carried forward from the working chat

Builder Assist is for general contractors, custom-home builders, project
managers, estimators, superintendents, trade partners and selected property
members. The three connected product areas are:

1. **Buildify & Quotify** — one multi-document plan-set uploader, materials-only
   estimate, category-based comparable line search, catalog and competitive
   price comparison, current material-market position, and a separate Select
   and Price Finishes workflow. Do not add labor estimating.
2. **Assistify** — project-specific plan reader, construction-stage sequencing,
   source/evidence traceability, operational project records, photo uploads and
   calendar-ready dates. Remove duplicate functions already performed by
   Buildify/Quotify or Growify. Job Cost does not belong here.
3. **Growify** — the contractor growth/CRM application. It shares the same active
   house/project context as the other two workspaces.

The projects rail must remain available throughout all three workspaces. A
successful plan-set upload creates exactly one new house record, and that same
record drives Buildify/Quotify, Assistify and Growify. Switching houses must
switch all correlated data rather than displaying a shared demo property.

## Non-negotiable 3D decision

The user rejected the later blocky massing viewer. Preserve the reusable
project-model engine in
`builder-assist-sites/app/member-portal/assistify/project-model-viewer.tsx`, but
never restore or display the Van Horn residence, its geometry, labels, takeoff
data, route or UI.

The current engine intentionally uses the earlier reader's visual language:
navy plan-reader canvas, translucent linework, dimensions, orbit/zoom, top/reset
controls, object selection, evidence states and a 12-stage cumulative sequence.
The selected project supplies a `PropertyModel`; the renderer contains no house
geometry of its own. The current controlled record is Swenka Residence in
`builder-assist-sites/lib/property-models.ts`, calibrated to the written A103
overall controls. It is not Van Horn data.

For any uploaded house without issued geometry, the viewer must show an honest
`model pending` state. Never substitute Swenka, Van Horn or generic block
geometry. The reusable engine is available to every project, but automatic PDF
to-controlled-geometry generation is **not implemented yet**.

## Important implementation map

- `builder-assist-sites/app/api/gen1/route.ts` — authenticated project/file API,
  D1/R2 persistence, upload validation and project hydration.
- `builder-assist-sites/app/member-portal/assistify/assistify-client.tsx` — active
  house rail and model workspace.
- `builder-assist-sites/app/member-portal/assistify/project-model-viewer.tsx` —
  reusable custom Canvas plan-reader renderer.
- `builder-assist-sites/lib/property-models.ts` — project model contract and
  controlled project records.
- `builder-assist-sites/public/index.html` — legacy main portal surface.
- `builder-assist-sites/public/gen1-operational.js` — operational legacy portal
  behavior connected to the Gen1 API.
- `builder-assist-sites/drizzle/` and `db/` — additive D1 schema/migrations.
- `builder-assist-sites/docs/launch/` — 250-source ledger, plan register,
  traceability, risk, dependency and launch-evidence artifacts.
- `builder-assist-sites/tests/` — operational, security, model, migration and
  research-evidence checks.

## What is implemented now

- A single plan-set uploader accepts multiple documents and uses an idempotent
  house-creation intent.
- Project records and file metadata persist through D1; document bodies use R2.
- The active house is shared into Assistify through the Gen1 API.
- The reusable model engine provides twelve actual geometry filters/stages,
  previous/next/play/pause, orbit, zoom, keyboard camera controls, dimensions,
  selection and plan-source/evidence details.
- Van Horn/Hubble/BP3D reference data and routes were removed from shipped
  application surfaces.
- A house without project-specific geometry receives a clear pending state with
  no substitute model.
- Assistify is viewport-bound and responsive, with internal panel scrolling and
  no intended page-level workspace scrolling.
- Upload validation checks file extensions, signatures, size bounds and
  workspace ownership; writes are workspace-scoped and duplicate-resistant.

## Verified state at transfer

From `builder-assist-sites/`:

```bash
npm ci
npm run lint
npm test
```

Latest local verification passed:

- production Vinext build: passed
- ESLint: passed
- automated tests: 34 passed, 0 failed
- rendered desktop model inspection: passed at 1363×936
- stage 1 and stage 12 rendering: inspected
- stage playback: advanced correctly
- object selection/source traceability: inspected
- page overflow at the inspected desktop viewport: none
- site-origin browser errors: none observed (browser-extension errors excluded)

The production route remains protected by ChatGPT/Sites identity headers. Do
not weaken `requireChatGPTUser` to simplify local previewing.

## Honest limitations / next priorities

1. Build the plan-ingestion pipeline that converts each newly uploaded plan set
   into a reviewed `PropertyModel`. Until then, keep the truthful pending state.
2. Complete authoritative parcel/APN, adjacent-parcel, frontage and terrain
   reconciliation. Current unresolved cadastral values are deliberately labeled;
   do not invent them or present ordinary GIS boundaries as survey accuracy.
3. Continue converting legacy portal controls from static/visual behavior into
   durable D1-backed workflows, particularly Growify and the remaining
   Assistify operational modules.
4. Perform authenticated production-like mobile/tablet QA and role-boundary
   tests. Desktop rendering was inspected; mobile media rules and automated
   assertions exist, but authenticated physical-device behavior remains
   unverified.
5. Read `builder-assist-sites/docs/launch/final-evidence-report.md` and the risk
   register before making any GO claim. Do not convert unverified systems into
   optimistic launch language.

## Rules for the next implementation

- Preserve unrelated user work and the historical `web/` surfaces.
- Keep all three platforms tied to one active project ID.
- Never add decorative buttons, fake integrations, fake success, fabricated
  parcel values or a substitute reference house.
- Maintain explicit evidence states: verified, scaled, inferred, assumed and
  unresolved.
- Use written plan dimensions as controls; record the source sheet and revision.
- Run lint, the production build and meaningful tests after connected-system
  changes.
- Keep authentication and authorization server-side and workspace-scoped.
- Do not commit secrets, local environment files, generated build directories or
  node modules.
