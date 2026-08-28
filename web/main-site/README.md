# Builder Assist — main site (`web/main-site/index.html`)

The landing page + client-side SPA. This file is the **canonical source** for the
page that was published as artifact `89d6cc50`; it is that artifact's HTML with the
claude.ai wrapper stripped (the `<!-- frame-runtime -->…<!-- /frame-runtime -->`
block and its `<base href="/_f/…">`, 12,056 bytes) plus the changes below.

2,335,416 bytes. ~1.9 MB of that is the base64 image blob in `window.__IMG`
(hero / AutoQuote / floor photos, embedded as `data:` URIs). Edit it with targeted
`grep -n` / `sed -n` ranges and string patches — do not open it whole.

Verified: `OUT_DIR=./reports node tools/verify-artifacts.mjs web/main-site/index.html`
→ **PASS, clean**, plus a Playwright walk of every route listed below at 1440×900
and 390×844, in light and dark `prefers-color-scheme`, with a throwing
`localStorage`/`sessionStorage`, and with `prefers-reduced-motion: reduce`.

## Host-agnostic by construction

The page must behave identically served as a claude.ai Artifact, from
`chatgpt.site`, or from Cloudflare. It therefore ships **zero external
subresources**: no CDN scripts, no external stylesheets, no fetch/XHR, no
same-origin backend. Everything that can be embedded is embedded as a `data:`
URI. The one class of remote reference left — retailer product photos, which
cannot be embedded at their volume — degrades to an in-page placeholder that
looks the same everywhere (see *Product images*).

---

## What changed vs the published artifact

### 1. The whole-build estimator moved behind the admin gate

`#/build-estimate` (the Phoenix material-takeoff flow: `estInputPage` →
`estResultsPage` → `estOrderPage` → `estDonePage`) was **public**. It is now
gated exactly like `#/estimator`:

```js
if((r==="admin-portal"||r==="estimator"||r==="build-estimate") &&
   (!session||session.role!=="admin")){ location.hash="#/admin-signin"; return; }
```

No estimator code was deleted. What changed around it:

| Link | Was | Now |
|---|---|---|
| `viewHome` nav — "Price your build" | `#/build-estimate` | `#/get-pricing` |
| `viewHome` header CTA — "Price your whole build" | `#/build-estimate` | `#/get-pricing` |
| `viewHome` hero CTA — "Price your whole build" | `#/build-estimate` | `#/get-pricing` |
| `viewContractorPortal` nav — "Whole-build estimator" | `#/build-estimate` | `#gc-orders` ("Orders") |
| `viewContractorPortal` — "No plans yet? Describe the home instead" | `#/build-estimate` | `#/get-pricing` |
| `data-piqopen` (PlanIQ → priced takeoff) | always `#/build-estimate/results` | admins route through; members get a toast |
| `estHeader()` back link | "← Back to site" → `#/` | "← Admin portal" → `#/admin-portal` |
| `adminNav()` | 7 tabs | + `3D Model` tab, + `Assistify 3D` tab, + `Whole-Build Estimator`, + `Cost Estimator` links |

A visitor who wants pricing still has an unbroken public path: the three home
CTAs land on `#/get-pricing`, the existing public lead-capture form. The landing
page keeps every marketing section — `#products`, `#pricing`, `#manufacturer`,
`#process`, `#autoquote`, `#visit`, `#member-access`.

The contractor (Gen1) portal keeps PlanIQ and its takeoff result intact; only the
hop into the now-admin-only estimator is replaced, by
`toast("The full priced takeoff opens in the Builder Assist admin workspace — your account manager sends it back priced.")`.
Nothing dead-ends into the admin sign-in screen from a signed-in member view.

### 2. Two 3D viewers, two admin tabs, plus a contractor station

They are different tools and both are wanted:

* `#/admin-portal/model` — **3D Model**: the Van Horn Residence seven-stage
  construction-sequence viewer from `web/vanhorn-3d/index.html`, inlined and
  namespaced under `#bp3dRoot` by `build-vanhorn3d.py`.
* `#/admin-portal/assistify` — **Assistify 3D**: the shared project-specific,
  twelve-stage, plan-traceable Canvas viewer from `web/blueprint-3d/`.
* Contractor portal station **02** (`#gc-assistify`) — the same Assistify
  viewer, between plan intake (01) and orders (03).

Assistify always runs inside an iframe, so the two viewers cannot collide. See
*How the 3D viewers are mounted* below.

### 3. Defect D1 — horizontal overflow at 390px (fixed)

`#/build-estimate` overflowed the viewport by 178px at 390px because a `1fr` grid
track cannot shrink below its items' min-content and `.est-fields` measured 502px
of it. The verified fix, appended after the page's own `@media (max-width:820px)`
block so source order wins without `!important`:

```css
@media (max-width:560px){
  .est-hero{grid-template-columns:minmax(0,1fr)}
  .est-fields{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .est-presets{grid-template-columns:minmax(0,1fr)}
  .est-summary{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
}
```

`scrollWidth === clientWidth` at 390px on `#/build-estimate` and
`#/build-estimate/results`, measured signed in as admin.

### 4. Two further 390px overflows, found while walking the admin routes

The original triage only walked *public* routes at 390px, so these were never
reported. Both are pre-existing, both are now fixed in the same appended block:

* `#/admin-portal/competitors` — 28px. `.xref-pick select` carried
  `min-width:280px`, so the category picker could not shrink inside a 307px panel.
  (The comparison table itself already scrolls inside `.xref-table{overflow-x:auto}`.)
* `#/admin-portal/members` — 50px. `.ac-member` is a flex row whose badge + copy +
  "Open account" button measure 397px of min-content; it now wraps below 560px.

### 5. Product images degrade identically on every host

See *Product images* below.

---

## Route / gating map

| Route | View | Gate |
|---|---|---|
| `#/` | `viewHome` | public |
| `#/get-pricing` | `viewGetPricing` | public — the public pricing path |
| `#/walkthrough`, `#/walkthrough-done` | `viewWalkthrough`, `viewWalkthroughDone` | public |
| `#/member-signin`, `#/admin-signin` | `viewSignin` | public |
| `#/member-portal` | `viewMemberPortal` / `viewContractorPortal` (tenant `general`) | any session |
| `#/member-portal/compare` | `viewMemberCompare` | any session |
| `#/admin-portal[/…]` | `viewAdminPortal` | **admin** |
| `#/estimator` | `viewEstimator` (iframe, `srcdoc` from `#estimator-b64`) | **admin** |
| `#/build-estimate[/results\|/order\|/done]` | `viewBuildEstimate` | **admin** *(changed)* |

Admin shell tabs (`adminShell(tab, body)`): dashboard, `autoquote`, `catalog`,
`competitors`, `orders`, `walkthroughs`, `members`, **`model`** *(new)*; the subnav
also carries direct links to `#/build-estimate` and `#/estimator`.

Credentials (prototype, client-side only): admin `TylerSchopper1` / `Tyler1` →
`#/admin-portal`; member `Phoenician1` / `Tyler1` → `#/member-portal`; contractor
`Gen1` / `Gen1` → the contractor workspace.

---

## How the 3D viewers are mounted

### Van Horn (`#/admin-portal/model`)

Inlined, because it is small and has no assets. `build-vanhorn3d.py` lifts the
CSS, markup and JS out of `web/vanhorn-3d/index.html` and rewrites them: every
selector is scoped under `#bp3dRoot`, every class is prefixed `bp-`, every id is
prefixed `bp3d-`, and the page-level IIFE becomes
`window.__BP3D.mount(root) -> {destroy}`. The canvas measures its container, so
`mountBp3d()` runs only once the tab is in the live visible DOM and
`unmountBp3d()` cancels the rAF loop on the way out.

### Assistify (`#/admin-portal/assistify` and `#gc-assistify`)

Iframed, never inlined, so CSS, element ids, camera state, accessibility
semantics and `localStorage` stay isolated and every entry point executes the
same `engine.js` against the same validated model contract. There is no copied
renderer or model data in `main-site/index.html`.

Assistify has to work in **both delivery targets**:

| target | how the frame is filled |
|---|---|
| hosted over HTTP | `<iframe src="../blueprint-3d/index.html">` — the real multi-file app |
| published as one artifact | `iframe.srcdoc` fed from `<script id="assistify-b64">`, the self-contained build from `tools/build-assistify-bundle.mjs` |

The page does not guess. `mountAssistifyFrame()` points the frame at the sibling
and then looks for Assistify's own `#assistifyRoot` in what loaded; a 404, a
blocked frame, a cross-origin document or a 6-second timeout all fall back to the
embedded bundle. Whichever path runs, the viewer gets a working Assistify — never
an empty frame. The `[data-assistify-note]` line under each frame says which one
is running. In the artifact target the sibling probe logs one 404; that is the
detection itself, and nothing user-visible depends on it.

The contractor station starts on an `IntersectionObserver` (it sits far down a
long scrolling page) and both mounts are torn down in `show()` before the DOM is
replaced, so no viewer keeps rendering in a screen nobody is looking at.

### Regenerating

    node tools/build-assistify-bundle.mjs      # web/assistify-bundle/index.html
    python3 web/main-site/build-bp3d.py        # Assistify CSS, payload, mounts, station
    python3 web/main-site/build-vanhorn3d.py   # Van Horn CSS, JS, markup, mount

Both Python scripts are idempotent and write only between `==BEGIN GEN ...==` /
`==END GEN ...==` markers. Run `build-bp3d.py` first on a fresh checkout: it
creates the markers `build-vanhorn3d.py` anchors against. `build-bp3d.py` also
leaves an explicitly empty `window.__TAKEOFF` rather than a permanent property
takeoff, and fails the build if the page exceeds 12 MB.

---

## Product images

`window.__RPHOTO` (179 SKUs) and `window.__REALPROD` (50 categories) carry
**229 retailer photo URLs across 49 hosts** — `mobileimages.lowes.com`,
`images.thdstatic.com`, `westernwindowsystems.com`, `www.trane.com`,
`s3.img-b.com`, `cdn.cloud.grohe.com` and the rest. They are composed into `<img>`
elements *at runtime*, which is why a static CSP scan reports this page clean.
Embedding 229 photos as `data:` URIs is not viable at this page's size, so
instead they fail cleanly and identically everywhere.

**One generator.** `remotePhoto(url, alt, fbClass, plateLabel, plateSub)` is the
only place a retailer-hosted `<img>` is written. Both call sites — `prodShot()`
(catalog thumbnails, finish cards, estimate rows) and `realProductCard()` (the
"representative real product" card in the finish picker) — go through it. It
emits the `<img data-rimg>` plus a sibling fallback holding `bpPlate()`.

**One pair of handlers**, bound on `document` in capture (resource `load`/`error`
events stop at the Document and never reach the Window — verified in-browser, a
window-level capture listener never fires for them):

```js
document.addEventListener("load",  e => rimgMark(e,"ph-on"),  true);
document.addEventListener("error", e => rimgMark(e,"failed"), true);
```

**The plate is the default state, not the error state.** The box renders
`bpPlate()` from the start and only promotes to the photo once it has actually
decoded (`.ph-on`, plus a `naturalWidth > 0` check). Waiting for an `error` alone
is not enough: an off-screen `loading="lazy"` image is never fetched and fires
nothing, and a request that hangs fires nothing either — both would otherwise
leave a blank white box. Defaulting to the plate makes every host render the same
thing.

`bpPlate()` draws the site's own blueprint idiom in the correct aspect box: navy
`#081f43` ground, a cyan `#68d4ff` module grid at 13% opacity, a cyan hairline
border with corner ticks, then the product name, its brand/category, and
`PHOTO OFFLINE` — all cyan-on-navy, uppercase, in the site's type. It is an
`<svg viewBox="0 0 64 48">` filling the wrapper, so it scales to every box size
in use (64×48 thumbnails, 120×92 product cards, full-width finish cards) with no
layout shift and no broken-image glyph. The `PHOTO` / `REAL PRODUCT` badges are
hidden until the real photo is showing, so nothing claims a photo that isn't there.

**On a non-artifact host the photos load normally.** Verified both directions by
stubbing the network: with the requests served, all boxes flip to `.ph-on` and the
badges appear; with the requests aborted, all boxes go `.failed` and keep the
plate. On an Artifact origin the CSP refuses every one of these hosts, so the
plate is what viewers see — by design, not by accident.

---

## Routes walked, and what was seen

Signed in as **admin** (`TylerSchopper1`): dashboard, autoquote, catalog,
competitors, orders, walkthroughs, members and the new model tab all paint;
`#/build-estimate` renders the intake page, "generate" produces
`#/build-estimate/results` with the priced takeoff, the finish picker opens with
blueprint plates in place of the retailer photos; `#/estimator` mounts its 57KB
`srcdoc` iframe. Signed in as **member** (`Phoenician1`): `#/member-portal` and
`#/member-portal/compare` paint. As **contractor** (`Gen1`): PlanIQ loads the
demo takeoff and the "open the full priced takeoff" button toasts instead of
bouncing. Signed out: `#/build-estimate`, `#/estimator` and `#/admin-portal` all
redirect to `#/admin-signin`; `#/member-portal` redirects to `#/member-signin`.

**Zero** JS errors on every route above, in both viewports. **Zero** horizontal
overflow at 390px on every route above, signed out, as member, as contractor and
as admin. Full render with `localStorage`/`sessionStorage` throwing
`SecurityError` on access, including the 3D tab.
