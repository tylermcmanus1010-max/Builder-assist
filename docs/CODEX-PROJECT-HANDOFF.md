# Builder Assist / Assistify project handoff

This repository contains the Builder Assist launch-survival work and the Assistify blueprint-to-model prototype.

## Active development state

- Repository: `tylermcmanus1010-max/Builder-assist`
- Working branch: `codex/assistify-survival-mode-20260827`
- Pull request: <https://github.com/tylermcmanus1010-max/Builder-assist/pull/1>
- Blueprint application: `web/blueprint-3d/index.html`
- Model engine: `web/blueprint-3d/engine.js`
- Model schema: `web/blueprint-3d/model-schema.json`

The application includes staged Assistify analysis, validation, adaptive plan-grid rendering, floor selection, project-model import/export, sample plans, and a searchable plan-note register.

## Verification

Run the regression suite from the repository root:

```powershell
node tools/verify-assistify.mjs
```

The last full run completed with 22 passing checks and no failures, including responsive viewport and 200% zoom coverage. The full approved-plan model was also imported through the actual file input and its 1,547-entry note register was rendered, searched, and persisted successfully.

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
