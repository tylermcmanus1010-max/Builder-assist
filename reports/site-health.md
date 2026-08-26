# Site health — published artifact triage

Date: 2026-08-26.
Scope: all 16 published-artifact HTML dumps in the session `tool-results/` directory,
verified with `tools/verify-artifacts.mjs` (upgraded during this pass — see
"Harness changes") plus manual Playwright probes for interactive flows. Every
page was screenshotted at 1440×900 and 390×844 and the screenshots were
inspected by eye, in light and dark `prefers-color-scheme`. Machine-readable
results: `reports/verify/report.json`.

The sandbox has no browser network egress, so every external request fails here
with `ERR_CONNECTION_RESET` — including `fonts.googleapis.com`, which is
CSP-allowed and fine in production. CSP violations are therefore judged
**statically** from the page source (anything that isn't fonts.googleapis.com /
fonts.gstatic.com is blocked for real viewers), never from request failures.

## Summary table

| Artifact | Page | Role | 1440px | 390px | Interactions | Verdict |
|---|---|---|---|---|---|---|
| 89d6cc50 | Builder Assist LLC | **Main site** (SPA, 5 hash routes) | clean | **overflow on `#/build-estimate`** | sign-ins, estimator, DISMISS all work | **WARN — defect D1** |
| 15bc1794 | Builder Assist LLC | Earlier rev of the main site | clean | same overflow as 89d6cc50 | same | **WARN — defect D1** |
| 0eb9704f | Builder Assist Estimator | Cost Estimator (admin) | clean | clean | recomputes: totals $506,178 → $1,395,582 on doubled inputs | PASS |
| 326972e7 | Builder Assist Estimator | Second estimator rev | clean | clean | recomputes (same figures) | PASS |
| cd95a001 | Van Horn Takeoff Sheet | Takeoff & cost model | clean | clean | recomputes: $500,811 → $1,081,235 | PASS |
| 7ccd37c9 | Builder Assist Takeoffs | Lead capture (mailto compose) | clean | clean | submit shows compose panel + copy fallback | PASS |
| 5616f80b | Free Plan Set Section | Lead-capture section template | clean | clean | **submit always fails — defect D2** | **FAIL (functional) — defect D2** |
| 8e09d6bd | Builder Assist | Older landing + in-page admin estimator | photos missing | clean (incl. admin view) | nav scrolls, admin estimator opens | **WARN — defect D3** |
| 9faddf08 | Builder Assist Job Book | Static session record | clean | clean | static | PASS |
| 586d3b6e | Takeoff for Plan Designers | Landing | clean | clean | static + form fields | PASS |
| 1ea8b530 | Designer Pricing Playbook | Static doc | clean | clean | static | PASS |
| 43d57b17 | Valentino Command Center | Interactive demo (topbar + portal) | clean | clean | sample data → team portal → command center all work | PASS |
| e2a0bfe1 | Valentino International | Public site rev of the same demo | clean | clean | routes paint | PASS |
| 4f63b254 | Valentino Source Code | File browser + saves | clean | clean | tree + copy work; **save buttons mis-gated — defect D4** | **WARN — defect D4** |
| dbc96c49 | Valentino Build Log | Static session record | clean | clean | static | PASS |
| 5847f6ec | RVM Launch Checklist | Ops checklist | **titles/descriptions run together — D5** | clean | checkboxes work | **WARN (cosmetic) — defect D5** |

All 16 pages also survive a **throwing `localStorage`/`sessionStorage`**
(overridden to throw `SecurityError` before load): no JS errors, full render —
the storage rule in BUILD-CONSTRAINTS.md is being followed everywhere.

---

## Real defects, ranked by visitor impact

### D1 — Main site: horizontal overflow on `#/build-estimate` at phone width

**Pages:** `artifact-89d6cc50` (main site) and `artifact-15bc1794` (earlier rev).
**Impact:** highest — this is the primary CTA route ("Price your whole build")
on the flagship page, and phone visitors are the common case for a landing
page. The right ~30% of the intake form and hero copy is cut off; body copy is
clipped mid-word and the "Family home"/"Estate" preset cards are half-visible.
The page body scrolls horizontally, which BUILD-CONSTRAINTS forbids outright.

**Reproduce:** open the page at 390px wide, navigate to `#/build-estimate`.
`document.documentElement.scrollWidth - clientWidth` = **178px**. The harness
now reports this (`horizontal overflow at 390px on route(s): #/build-estimate`).

**Root cause (measured, not guessed):** the existing
`@media (max-width:820px)` rule does collapse `.est-hero` to one column, but a
CSS grid track of `1fr` cannot shrink below its items' min-content. Measuring
min-content of every `.est-hero` descendant shows two drivers:

- `.est-fields` — min-content **502px** (two columns of `<input>`s; inputs have
  an intrinsic default width and the tracks are plain `1fr 1fr`)
- `.est-form-card` — 502px + 22px×2 padding + borders = **548px**

so the single hero track resolves to 548px inside a 390px viewport.

**Fix (verified):** cap the tracks with `minmax(0,1fr)` at small widths. This
exact block, injected after the page's own styles, took the overflow from
178px to **0** on every route with no visual damage (screenshot checked):

```css
@media (max-width:560px){
  .est-hero{grid-template-columns:minmax(0,1fr)}
  .est-fields{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .est-presets{grid-template-columns:minmax(0,1fr)}
  .est-summary{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
}
```

Place it after the existing `@media (max-width:820px)` block in the estimator
CSS (source order matters; `!important` is not needed when it comes later).

### D2 — "Free Plan Set Section": every form submission fails

**Page:** `artifact-5616f80b`.
**Impact:** every visitor who fills the form and presses "SEND MY PLAN SET →"
gets the failure path: *"That didn't go through. Call (517) 855-0947 and we'll
take the set over the phone."* The page's one purpose cannot succeed.

**Reproduce:** fill name + email, submit. The handler runs
`fetch("/api/free-set-requests", {method:"POST", …})`. There is no such
endpoint on an artifact origin (the origin serves only the page), so the fetch
rejects/404s and the `catch` branch shows the phone fallback. Reproduced in the
sandbox; the failure is structural, not a sandbox artifact — the source even
carries the comment "Wire this to your backend."

**Fix options:**
1. If this page is meant to work *as a published artifact*: replace the fetch
   with the mailto-compose + copy-details pattern already proven in
   `artifact-7ccd37c9` (compose the request body, open `mailto:`, and always
   render the copyable details panel as fallback).
2. If it is only a template section destined for the real chatgpt.site backend:
   mark it clearly as such in the page (the current copy reads as a live form),
   or unpublish it so nobody submits into a guaranteed error.

### D3 — Older landing: three product photos CSP-blocked (confirmed, with exact fix)

**Page:** `artifact-8e09d6bd`.
**Impact:** medium-low. The three photos never render for any viewer. Each
`<img>` carries `onerror="this.remove()"`, so the page degrades to its CSS
grid/mesh panels rather than broken-image boxes — layout stays intact
(screenshot confirms). The page still reads fine, it just loses its
photography. Note this artifact appears superseded by 89d6cc50, which lowers
real-world exposure.

**Confirmed facts:** exactly three `<img class="shot">` reference
`https://builder-assist-llc.valentino-in-8162.chatgpt.site/`:

- `phoenix-fence-v2.webp` (hero, line 475) — 235,160 bytes
- `phoenix-fence-ad-mesh-v2.webp` (line 503) — 158,412 bytes
- `scottsdale-floor-v2.webp` (line 518) — 107,214 bytes

The host answers 200 over curl, but it is not fonts.googleapis.com /
fonts.gstatic.com, so the production CSP blocks it. All three have the
`onerror` guard (harness: "3/3 image(s) degrade gracefully").

**Fix (no new asset work needed):** the main site `artifact-89d6cc50` already
embeds these *exact same three files* as data: URIs in `window.__IMG` — keys
`hero`, `fenceAd`, `floor`, with decoded sizes 235,161 / 158,412 / 107,214
bytes, byte-for-byte the remote files. Copy those three data: URIs into the
three `src` attributes (or an `__IMG` lookup) in 8e09d6bd. Page grows from
~100KB to ~770KB — far under the 16MB artifact cap. Alternative: upload the
three .webp files as artifact assets (`upload_asset`) and reference the asset
URLs, which requires the page to declare the `assets` capability; the data:-URI
route is simpler and already proven on the main site.

### D4 — Valentino Source Code: save buttons shown without the capability that makes them work

**Page:** `artifact-4f63b254`.
**Impact:** medium-low. "⤓ SAVE THE DEMO PORTAL", "⤓ SAVE ALL SOURCE (.JSON)"
and the per-file "⤓ SAVE" button are *always* visible. The code intends to
reveal them only after `window.claude?.use?.('downloads')` resolves
(`#saves`/`#savefile` start with the `hidden` attribute), but
`.saves{display:flex}` and `.btn{display:inline-flex}` override the UA's
`[hidden]{display:none}` rule, so `hidden` does nothing. When the downloads
capability is absent, `trySave()` starts with `if(!DL) return;` — the click is
a **silent no-op**: no toast, no error (reproduced). If the published artifact
has the downloads capability granted the buttons work and nobody notices; in
any context without it (and in this offline test) they are visible dead
controls.

**Fix:** two lines —
```css
.saves[hidden],#savefile[hidden]{display:none !important}
```
and in `trySave`, replace the silent `if(!DL) return;` with the existing toast
("Saving is not available in this view — use Copy instead."). The file tree,
viewer, search, and Copy button all work (Copy has a proper clipboard-denied
fallback toast).

### D5 — RVM Launch Checklist: item titles and descriptions run together (cosmetic)

**Page:** `artifact-5847f6ec`.
**Impact:** low, but every viewer sees it on every checklist row: the bold
title and its description render as one run-on line, e.g. *"…set the status
callback URL to the endpoint below**Replace** `<SECRET>` with the exact…"* and
*"…the number you deployed**Homeowners** call this number back."*

**Cause:** each row is `<span class="t">title</span><span class="d">desc</span>`;
both spans are inline. `.step-body .d` sets `margin-top:3px` — which has no
effect on an inline element — so the author clearly intended a new line.

**Fix:** add `display:block` to `.step-body .d`.

---

## Flagged by tooling but NOT defects

- **Failed requests / console errors for `fonts.googleapis.com` and
  `fonts.gstatic.com`** on several pages — sandbox has no egress; these hosts
  are CSP-allowed and load in production. All pages declare real font
  fallback stacks.
- **`<a href>` links to external hosts** (`claude.ai`, `www.fcc.gov`,
  `www.ftc.gov`, `valentino-international.valentino-in-8162.chatgpt.site` on
  the checklist page) — navigations, not subresources; CSP does not block
  link-outs and the artifact shell opens them in a new tab. Recorded by the
  harness as `kind: navigation`, never counted as problems.
- **DISMISS button "has no handler"** on 89d6cc50/15bc1794 — element-level
  false positive; those pages use delegated click handlers (7 and 10 listeners
  on window/document/body). Behaviorally verified: clicking DISMISS hides the
  prototype banner (`display:none`). The harness suppresses per-element
  dead-control claims whenever ambient delegation exists, for exactly this
  reason.
- **Dark-mode "low contrast" counter hits** on 43d57b17/e2a0bfe1 — heuristic
  noise from intentionally muted micro-labels; dark-scheme screenshots were
  inspected and all text is legible. These designs commit to fixed palettes
  with explicit backgrounds, so the OS scheme cannot break them.

## Checked and found clean

- **Rendering, 1440×900:** all 16 pages paint fully; every screenshot
  inspected. No overlapping, clipped, or invisible text found outside the
  defects above.
- **Rendering, 390×844:** no horizontal body overflow on any page's entry
  screen; the only route-level overflow is D1. Dense sheets (Van Horn takeoff,
  estimator, Job Book) all reflow correctly.
- **Hash routes:** all 5 routes on each of 89d6cc50 / 15bc1794
  (`#/`, `#/build-estimate`, `#/walkthrough`, `#/get-pricing`,
  `#/admin-signin`) and all 5 on 43d57b17 / e2a0bfe1 (`#/portal`,
  `#/review?path=…`×3, `#/review`) paint with content and no JS errors.
- **Recompute (tools/check-recompute.mjs):** 0eb9704f, 326972e7, cd95a001 all
  recompute headline totals when inputs are doubled (values in the table).
  8e09d6bd correctly reports N/A on its landing view (inputs live behind the
  admin view).
- **Sign-in flows on the main site:** admin (`TylerSchopper1`) reaches
  `#/admin-portal` (Admin Control Center renders); member (`Phoenician1`)
  reaches `#/member-portal` (member workspace renders). No JS errors.
- **Valentino demo end-to-end:** Load sample data → banner flips to "SAMPLE
  DATA LOADED"; Team portal → sign-in card with prefilled demo credentials;
  Enter command center → full Performance Overview dashboard with sample
  metrics. No JS errors.
- **8e09d6bd interactions:** top-nav items scroll to their sections; ADMIN
  SIGN IN opens the in-page estimator walkthrough (no credentials needed —
  states "estimates save in this browser only"); no overflow at 390 even in
  the estimator view.
- **7ccd37c9 lead form:** validation + compose panel appear on submit, with
  the full email body rendered for copy and "COPY THE DETAILS" / "EMAIL US
  DIRECTLY" / phone fallbacks.
- **4f63b254 file browser:** tree click opens file content (README.md, 5,253
  chars rendered); search and Copy work.
- **Dead controls / dead forms:** CDP event-listener sweep over every visible
  button/select/form on all 16 pages found no unhandled controls beyond D4
  (and the DISMISS false positive, explained above).
- **Storage hostility:** all 16 pages load cleanly with `localStorage` and
  `sessionStorage` throwing on access.
- **Dead in-page anchors:** none.
- **CSP static scan:** the only non-allowed subresource host anywhere is the
  chatgpt.site image host in D3. No external scripts, stylesheets, fetches, or
  CDN references on any page.

## Could not be checked (and why)

- **Google Fonts actually loading** — no browser egress in the sandbox. Risk is
  low: the host is CSP-allowed and every page has a fallback stack.
- **`mailto:` opening from inside the production artifact iframe** (7ccd37c9)
  — sandbox/iframe policies for mailto can't be reproduced here. The page
  already assumes it may fail and always renders the copyable details, so the
  worst case is covered.
- **Whether the published 4f63b254 artifact has the `downloads` capability
  granted** — capability declarations are server-side, not in the HTML dump.
  If granted, its save buttons work; the mis-gating in D4 is a latent bug
  either way.
- **`window.claude.*` runtime behaviors generally** (frame runtime is stripped
  for offline testing), including artifact theming via `data-theme` stamping —
  approximated with `prefers-color-scheme` emulation instead.
- **Clipboard writes under real browser permission prompts** (Copy buttons on
  4f63b254, cd95a001) — headless grants differ from real browsers; both code
  paths have try/catch fallbacks.
- **The member AutoQuote math on the main site** — it sits behind an
  upload-scope flow; the portal renders but its quote pipeline was not
  perturb-tested the way the standalone estimators were.
- **True production CSP enforcement** — judged statically against the
  documented allowlist rather than observed, since the sandbox cannot serve
  the pages from a real artifact origin.

## Harness changes made in this pass (tools/verify-artifacts.mjs)

1. **390px mobile pass** — every page is re-loaded in a 390×844 mobile context;
   body-level horizontal overflow is measured and offending elements named; a
   `.390.png` screenshot is saved next to the desktop one.
2. **Mobile route walk** — hash routes are re-walked *at 390px* and per-route
   overflow reported. This is what catches D1; the entry screen alone is clean.
3. **Dead-control sweep** — CDP `DOMDebugger.getEventListeners` over every
   visible button/select (self + 6 ancestor levels, cached), with a
   delegation guard: if window/document/body handle clicks, per-element
   verdicts are recorded but not reported as problems. Forms with no action,
   no inline handler and no submit listener are reported.
4. **Capability detection fix** — now also matches the defensive
   `window.claude?.use?.('downloads')` form (previously missed on 4f63b254).
