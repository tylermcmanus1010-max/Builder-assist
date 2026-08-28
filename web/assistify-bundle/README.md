# Assistify single-file build

`index.html` here is **generated**. Do not edit it — edit `web/blueprint-3d/`
and re-run:

```sh
node tools/build-assistify-bundle.mjs
```

## Why it exists

`web/blueprint-3d/index.html` is a multi-file app: four `<script src>` siblings,
a vendored PDF.js ES module, and JSON models it `fetch`es. That works when the
repository is served over HTTP. It does not work when the site is published as a
claude.ai Artifact — one HTML file, no siblings, no network, strict CSP — where
those references resolve to nothing and the page comes up empty.

This build is the same app in one file, so `web/main-site/index.html` can hand it
to an iframe through `srcdoc` when the sibling app is not reachable.

## What is inlined

| source | how |
|---|---|
| `index.html` shell (`<style>` + body markup) | copied verbatim from the real page |
| `engine.js`, `concept-geometry.js`, `progress-tracker.js` | inlined byte-for-byte |
| `pdf-import.js` | inlined; exactly one asserted line rewritten (a dynamic `import()` cannot be shimmed) |
| `vendor/pdfjs/pdf.min.mjs`, `pdf.worker.min.mjs` | inlined as module scripts |
| `project-model.json`, `model-schema.json`, `sample-full-floor-plan-model.json` | embedded as objects in `window.__ASSISTIFY_BUNDLE__`, served by an in-page `fetch` shim so `engine.js` runs unmodified |

## PDF import runs for real, worker-less

Both PDF.js files are inlined. The worker module's last statement is
`globalThis.pdfjsWorker={WorkerMessageHandler}`, and `PDFWorker` in `pdf.min.mjs`
short-circuits to its in-process `LoopbackPort` transport when that global
exists — it never calls `new Worker(...)` and never dynamically imports anything.
So plan-PDF import works inside the artifact sandbox with no `blob:` worker, no
`worker-src` CSP grant and no network. Parsing happens on the main thread, which
is slower than a real worker but produces the same note register.

A `blob:` worker was measured and rejected: under a CSP without an explicit
`worker-src`, Chromium reports *"Refused to create a worker from 'blob:…'"* and
PDF.js's own fallback then fails too (*"Failed to fetch dynamically imported
module"*), leaving a PDF button that does nothing.

## What is deliberately NOT inlined

`approvedplans-4752-25-assistify-model.json` (1.85 MB). The two code paths that
would fetch it — the **Load 4752-25 approved plan** button and the
recognized-hash branch of PDF import — fail with a specific message naming the
working alternative ("Import project model" from disk, or the hosted app). A
control that explains itself is honest; a control that silently does nothing is
not.

## Truth boundary

The bundle neither gains nor loses truth relative to the hosted app. Source
citations, the `VERIFIED` / `INFERRED` / `UNVERIFIED` / `CONFLICT` states, the
dashed discipline-colored concept layer and the twelve canonical stage IDs all
live in the files copied verbatim. It boots with the same truthful empty model:
*Unconfigured project · UNVERIFIED*, reference grid only, no fabricated sample.

## Verification

```sh
OUT_DIR=./reports node tools/verify-artifacts.mjs web/assistify-bundle/index.html
node tools/verify-assistify.mjs          # drives web/blueprint-3d/, the source of this build
```
