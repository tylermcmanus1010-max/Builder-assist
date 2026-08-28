# Builder Assist / Assistify project handoff

This repository contains the Builder Assist launch-survival work and the Assistify blueprint-to-model prototype.

## Active development state

- Repository: `tylermcmanus1010-max/Builder-assist`
- Working branch: `codex/assistify-survival-mode-20260827`
- Pull request: <https://github.com/tylermcmanus1010-max/Builder-assist/pull/1>
- Blueprint application: `web/blueprint-3d/index.html`
- Model engine: `web/blueprint-3d/engine.js`
- Model schema: `web/blueprint-3d/model-schema.json`
- Field progress store: `web/blueprint-3d/progress-tracker.js`
- Shared-backend contract: `docs/assistify-progress-backend-contract.json`

The application includes staged Assistify analysis, validation, adaptive
plan-grid rendering, floor and roof views, project-model import/export, local
PDF import, searchable plan intelligence, optional conceptual geometry, and
field-progress visualization.

## Current product state

- The reviewed 4752-25 model covers all 18 sheets, 3,435 extracted note
  occurrences, and 1,547 normalized entries.
- It contains 30 reviewed simplified elements and 104 explicitly conceptual
  elements across site, grading, utilities, structure, roof, MEP, and lighting.
- Concept elements are dashed, discipline-colored, source-cited, labeled
  `INFERRED`, and independently toggleable.
- The roof view uses the model's verified 10-foot low ceiling, 12-foot mid
  ceiling, and 14-foot parapet levels.
- Each of the twelve stages supports not-started, in-progress, blocked,
  needs-inspection, and complete status; percent complete; worker; note;
  timestamp; and an evidence filename reference.
- Progress mode colors the 3D model gray, blue, red, yellow, or green and shows
  overall completion, stage rollups, and recent activity.

## Verification

Run the regression suite from the repository root:

```powershell
node tools/verify-assistify.mjs
```

The last full run completed with 32 passing checks and no failures, including
responsive viewport, 200% zoom, reviewed PDF import, roof view, and field
progress coverage. Re-run the suite rather than relying only on this count.

## Approved-plan model

The owner explicitly approved publishing the project address and permit information. The completed importable model is committed at:

`web/blueprint-3d/approvedplans-4752-25-assistify-model.json`

The model covers 18 source sheets, 3,435 extracted note occurrences, and 1,547 normalized entries. Each entry retains source sheet/page information, classification, applicability, model action, rationale, and discipline tags. Geometry references the note register so applied decisions remain traceable.

## Resume instructions

1. Check out `codex/assistify-survival-mode-20260827`.
2. Run `node tools/verify-assistify.mjs` before and after changes.
3. Serve the repository locally and open `web/blueprint-3d/index.html`.
4. Use **Import project model** to load the approved-plan JSON.
5. Use **Plan note register** to filter by text, sheet, discipline, or model action.
6. Use **View roof** for the project-specific roof levels and **Field progress**
   to test the current local prototype.

## Claude/shared-database transfer

Everything needed to build and understand the current code is checked into this
branch. `CLAUDE.md` is the agent entry point. The existing browser's imported
model, camera settings, and field updates are not in Git because they are stored
in `localStorage`.

At handoff time the working browser contained no material field updates to
migrate. For multi-device operation, implement the vendor-neutral contract in
`docs/assistify-progress-backend-contract.json`, then replace or wrap
`AssistifyProgressStore` with an authenticated sync adapter. Keep a local cache
for offline jobsite use, but make the shared service authoritative. Store photo
bytes in object storage and database evidence metadata in the progress event.

Do not place database credentials, private keys, access tokens, customer PDFs,
or worker personal data in Git. Commit migrations, policies, generated types,
and `.env.example`; inject actual secrets through the deployment environment.
