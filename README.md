# Builder Assist

Verification tooling for the Builder Assist artifact suite.

The Builder Assist app surfaces are published as claude.ai Artifacts rather than
living in this repository. `tools/verify-artifacts.mjs` pulls those published
pages down to HTML and checks that each one is actually operational, so a
regression in a published page gets caught without clicking through by hand.

## What it checks

Per artifact:

- **Loads** without uncaught JS errors, console errors, or failed requests
- **Paints** real content (not a blank or near-empty page)
- **Routes** - every `#/route` reachable from an in-page link is visited, and
  each must render without throwing
- **Links** - bare `#anchor` targets resolve to an element that exists
- **Images** resolve (no zero-width broken images)
- **Capabilities** - flags any page calling `window.claude.*`, which cannot be
  exercised offline because it needs the artifact shell

Results are `PASS`, `WARN` (cosmetic problems), or `FAIL` (blank page or
uncaught JS error).

## Usage

```sh
OUT_DIR=./reports node tools/verify-artifacts.mjs path/to/artifact.html [...]
```

Writes `report.json` plus a screenshot per artifact into `OUT_DIR`.

To get the HTML, read each artifact with the Artifact tool (`action: "read"`);
large pages are saved to a local file whose path the tool returns.

## Notes

Artifact HTML ships wrapped in the claude.ai frame runtime - an injected
`<script>` block and a `<base href="/_f/...">` that rewrites relative URLs.
The harness strips both before loading, so reported failures belong to the page
itself and not to the wrapper.

Playwright is resolved from the local install, falling back to the global npm
root, and Chromium is taken from `CHROME_PATH` (default `/opt/pw-browsers/chromium`).
