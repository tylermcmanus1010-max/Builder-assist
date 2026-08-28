# Design review — market research and rating of the Builder Assist surfaces

Author: design agent. Date of work: **2026-08-28**.
Scope: competitive research (Part 1), evidence-based rating of our own pages
(Part 2), ranked recommendations (Part 3).

## How much of this is sourced

**Part 1 (market research): 13 competitor/reference pages were actually
retrieved and read; every claim about a competitor in this document comes from
one of those retrievals and is attributed inline with its URL and retrieval
date. 3 pages could not be retrieved and are recorded as UNAVAILABLE with the
reason; nothing is written about them.** No market-size, share, or revenue
figure appears anywhere in this document, because none was retrieved. A search
engine result summary was seen but is **not** cited — search snippets are not
pages I loaded.

**Part 2 (our own site): every number is measured.** All measurements come from
headless Chromium (Playwright 1.56.1) against the repository served over HTTP at
`http://127.0.0.1:8765`, plus static reads of the checked-in files. Screenshots
were taken at 1440×900 and 390×844, in `light` and `dark` `prefers-color-scheme`,
and were looked at. Where a measurement was not reproducible I say so.

Environment caveats honoured: this sandbox has no browser network egress, so
`fonts.googleapis.com` failures are **not** reported as defects; CSP violations
are judged statically from source, not from request failures.

**Concurrency caveat — read this before acting on any main-site finding.**
Another agent was actively rewriting `web/main-site/index.html`,
`web/blueprint-3d/index.html` and `web/assistify-bundle/index.html` throughout
this review (`git status` shows all three modified in the working tree). Two of
my observations are almost certainly artifacts of reading a 4.7 MB file
mid-write, and I have marked both in place: the non-reproducible 158px mobile
overflow (Mobile), and the `#/build-estimate` route content (Conversion). Every
other main-site measurement was taken repeatedly and was stable. The four
sub-app pages (`vanhorn-3d`, `material-compare`, `employee-hub`) were not being
edited and their findings are unaffected.

---

# PART 1 — Market research

## 1.1 Retrieval log

| # | Site | URL | Retrieved | Status |
|---|---|---|---|---|
| 1 | STACK | https://www.stackct.com/ | 2026-08-28 | loaded |
| 2 | STACK pricing | https://www.stackct.com/pricing/ | 2026-08-28 | loaded |
| 3 | Procore | https://www.procore.com/ | 2026-08-28 | loaded |
| 4 | Procore pricing | https://www.procore.com/pricing | 2026-08-28 | loaded |
| 5 | Togal.AI | https://togal.ai/ | 2026-08-28 | loaded |
| 6 | Buildxact pricing | https://www.buildxact.com/us/pricing/ | 2026-08-28 | loaded |
| 7 | Fieldwire (Hilti) | https://www.fieldwire.com/ | 2026-08-28 | loaded |
| 8 | Raken | https://www.rakenapp.com/ | 2026-08-28 | loaded |
| 9 | CompanyCam | https://www.companycam.com/ | 2026-08-28 | loaded |
| 10 | 84 Lumber | https://www.84lumber.com/ | 2026-08-28 | loaded |
| 11 | Builders FirstSource | https://www.bldr.com/ | 2026-08-28 | loaded |
| 12 | ABC Supply | https://www.abcsupply.com/ | 2026-08-28 | loaded |
| 13 | National Rent-A-Fence | https://www.rentnational.com/ (302 from nationalrentafence.com) | 2026-08-28 | loaded |
| — | Buildertrend | https://buildertrend.com/ | 2026-08-28 | **UNAVAILABLE — HTTP 403** |
| — | Home Depot Pro Xtra | https://www.homedepot.com/c/Pro_Xtra | 2026-08-28 | **UNAVAILABLE — HTTP 403** |
| — | Jamsan temp fence panels | https://www.jamsan.com/temporary-fence-panels/ | 2026-08-28 | **UNAVAILABLE — HTTP 503** |

Buildertrend, Home Depot Pro Xtra and Jamsan are named nowhere else in this
document. I did not load them, so I have nothing to say about them.

## 1.2 What the good ones actually do

### First impression: they name the category in the first line, then make one claim

Every loaded SaaS page leads with a flat category label, not a slogan, and puts
the differentiating claim on the second line:

- **STACK**: H1 *"AI Construction Software"*, subhead *"Bid Faster, Win More &
  Build Smarter with the Power of AI."*
- **Procore**: H1 *"Construction Project Management Software"*, subhead
  *"Together, we can build it all"*.
- **Togal.AI**: *"Construction Takeoff Software"* / *"Takeoff in Minutes. Not
  Days."*
- **Raken**: *"Construction Management Software"* / *"Field management made
  easy"*.
- **Fieldwire**: *"Jobsite Management For Construction Teams"*, with the proof
  as the subhead: *"Fieldwire powers over 4,000,000 jobsites worldwide"*.

The one exception is the one whose category is obvious from the brand:
**CompanyCam** leads with *"How field work moves forward."*

The material distributors do the opposite of a claim — they lead with scale.
**84 Lumber**: *"Building America for the last 70 Years"* over *"THE NATION'S
LARGEST PRIVATELY HELD SUPPLIER OF BUILDING MATERIALS"*, "7,500 associates",
"320 facilities nationwide". **ABC Supply**: *"NORTH AMERICA'S LEADER IN
SUPPLYING AND SERVING CONTRACTORS"*, "OVER 1000 LOCATIONS IN THE U.S. AND
CANADA SUPPORTED BY MORE THAN 20,000 ASSOCIATES."

### Time to a price or a demo: two buttons in the hero, always

Every one of the nine SaaS/distributor pages puts two actions in the hero — one
low-commitment self-serve, one sales-assisted:

| Site | Self-serve | Sales-assisted |
|---|---|---|
| STACK | "Try it FREE" | "Get a Demo" |
| Procore | "See pricing" | "See it in action" |
| Togal.AI | "Take a Tour" (`/tour/main`) | "Book a Demo" |
| Fieldwire | "Get Started Free" | "Request Demo" |
| CompanyCam | "Start a Free Trial" | "Book a Call" |
| Raken | "Start Free Trial" | "Schedule Demo" |
| Builders FirstSource | myBLDR portal login | "Get a Quote" (`/contact/request-quote`) |
| ABC Supply | "Log In To myABCsupply" | branch/Locations |
| National Rent-A-Fence | — | "Request a Quote" + 800-352-5675 |

Note the pattern: **the self-serve path is never a form.** It is a trial, a
tour, or a portal login. National Rent-A-Fence — the closest analogue to our
physical product line — is the only loaded site with no self-serve path at all,
and it compensates by putting the phone number "800-352-5675" in the top nav,
repeatedly through the page, and in the footer as a click-to-call on mobile.

### The pricing question: the split is real and it is roughly 50/50

**Published numbers on a public page (retrieved 2026-08-28):**

- **STACK** — "Takeoff & Estimate" *"$249 per user / month"*; "Build & Operate"
  *"$49 per user / month"*; "Full STACK Platform" *"$298 per user / month"*.
  Plus: *"For Takeoff & Estimate, we offer a free version of the software"* and
  *"For Build & Operate, a two-week free trial is available."*
- **Buildxact** — Go $0/month (5 credits); Foundation $199/mo, or $169/mo
  annual billed at $2,030/year; Pro $399/mo, $339/mo annual at $4,070/year;
  Master $599/mo, $509/mo annual at $6,110/year; 15% annual discount; named
  add-ons at +$99/mo and +$149/mo.

**No numbers, quote only:** Procore's `/pricing` page shows **zero dollar
figures**. It substitutes an *explanation of the model* — *"an upfront annual
fee by product and based upon your Annual Construction Volume (ACV) — the
aggregate dollar value of the construction work across your projects"* — plus
four unconditional promises ("Unlimited Users", "Unlimited Data", "Unlimited
24/7 Support", "No Hidden Fees") and a phone number, (866) 477-6267. Togal.AI,
Raken, CompanyCam and Fieldwire all link a pricing page from the nav without
showing numbers in the hero. None of the four material distributors publishes a
unit price.

The lesson is not "publish prices". It is that **the pricing page must answer
the pricing question with something.** Procore's answer is a mechanism and a
guarantee. STACK's and Buildxact's answer is a number. Nobody's answer is a
blank contact form labelled "Pricing".

### How they earn trust

Three distinct instruments, used in combination:

1. **Named customers as logos.** Procore: Balfour Beatty, The Beck Group,
   Brookfield Properties, Gilbane, Greystar, Honeywell, HITT Contracting, The
   Weitz Company. STACK: F.E. Moran, ABC Supply, Kiewit, Siemens, Winsupply,
   Interstates, SRS Distribution, CentiMark. Togal.AI: 30+ logos including DPR
   Construction, Clark Construction, Consigli, Coastal. Fieldwire: Clark
   Construction, EllisDon, Brookfield, Webcor, Johnson Controls. Raken: Hensel
   Phelps, Level 10, Webcor, Barton Malow, Danforth.
2. **Attributed quotes with a quantified outcome.** Procore attributes by name
   *and* title *and* company — Mandar Joshi, Director of Project & Process
   Controls, Bernards; Kevin Ooley, President and CFO, DataBank; Marc
   DiGuiseppe, VP of Project Delivery, Catalyze; Breanna Halliday, Construction
   Administration Manager, Pitt Meadows. CompanyCam attaches a number to each
   customer: Reliant Roofing *"saved $50k a year in employee costs"*, BK
   Restoration *"saved 36 hours a month"*, AHC *"says CompanyCam is worth 10x
   its cost"*. Raken quotes a safety director: *"We have prevailed in almost
   every one of the disputes we've had because of Raken."*
3. **Third-party numbers you cannot self-award.** Procore: 4.5/5 Software
   Advice, 4.6/5 G2, plus 3 million+ projects, 16 cloud data centers, 99.9%
   availability. CompanyCam: App Store 4.8 (25,000 reviews), Google Play 4.8
   (6,700 reviews), "285,000+ pros … on 79 Million jobs". Raken: App Store 4.7
   (16k), Google Play 4.3 (2.15k). Togal.AI carries eight awards and a hard
   accuracy claim, *"98% accuracy on floor plans"* and *"5x faster"*.
   Builders FirstSource publishes a verifiable licence: **California
   Contractors State Licensing Board #1099243**, alongside 565 locations, 43
   states, 28,000+ team members. 84 Lumber carries a "Military Friendly
   Employer" designation.

Absences are informative too: neither STACK's homepage nor Fieldwire's showed
security certifications where I looked.

### Conversion path shape

The distributors have converged on a **portal**, not a catalogue. ABC Supply's
myABCsupply is pitched as *"Browse materials by branch, estimate and place
orders fast, track every order with ease"*, with a mobile app and an API
offering *"real-time product, pricing and location data"*. Builders FirstSource
pitches myBLDR as *"a digital platform for homebuilders that seamlessly
connects front-end design and sales processes with material procurement, all
the way through the completion of your build"* — i.e. the same "start with
materials, stay for the system" thesis our own homepage argues. 84 Lumber gates
its portal as "Builder Log-In" and pushes everyone else to a store locator with
a 25/50/75/100-mile radius and a default branch shown with address, phone and
hours.

---

# PART 2 — Rating our own surfaces

## 2.1 What I measured, and how

Served the repo with `http-server` on port 8765 and drove headless Chromium.
Surfaces examined:

- `web/main-site/index.html` — routes `#/`, `#/get-pricing`, `#/build-estimate`,
  `#/walkthrough`, `#/admin-signin`, `#/member-signin`, plus both portals after
  a real sign-in (`TylerSchopper1/Tyler1` admin, `Phoenician1/Tyler1` member)
- `web/vanhorn-3d/index.html`, `web/blueprint-3d/index.html`,
  `web/employee-hub/index.html`, `web/material-compare/index.html`

Also run: `node tools/verify-assistify.mjs` → **31 passed, 0 failed**.

### Measured facts used below

| Fact | Value | How |
|---|---|---|
| Main site file size | 4,713,865 bytes | `wc -c` |
| — of which `data:image/webp` URIs | 1,418,796 B (30%), 71 URIs | regex over source |
| — of which base64 sub-documents | 2,483,828 B (53%), 2 blocks | `<script type="application/base64">` |
| Main site FCP / load (localhost) | 44 ms / 237 ms | Navigation Timing |
| Header nav links visible at 390px | **0 of 5**, no hamburger | computed style |
| Published dollar figures on `#/` | 8 | text scrape |
| Fields on `#/get-pricing` | 6 visible, 4 required | DOM |
| Smallest computed body font on `#/` | **6px** ("BRANDED MESH"), transform scale 1.0 | computed style |
| `material-compare` layout viewport under mobile emulation | **980px** | `isMobile:true`, 390×844 |
| `:focus` CSS rules — matcomp / hub / bp3d | **0 / 0 / 1** (49 focusables on bp3d) | stylesheet walk |
| `<meta charset>` — matcomp / hub | **absent / absent** | source + DOM |
| `<html lang>` — main / matcomp / hub | **absent / absent / absent** | DOM |

---

## 2.2 Dimension ratings

### First impression and clarity of offer — **7/10**

The `#/` hero is the strongest thing on the site. H1 *"SECURE THE SITE. FINISH
THE SPACE."* at `clamp(52px, 6.1vw, 94px)`, 900 weight, `-0.065em` tracking,
with the second clause in `--blue`; a real photograph of a fenced Scottsdale
jobsite filling 53% of the viewport with a `8' × 6' / Anti-climb mesh` spec
card floated over it. The lede is unusually specific for a construction landing
page: *"Manufacturer-direct temporary anti-climb fencing and engineered
flooring—built to deliver an excellent product at a rate that leaves more
profit in every project."* Category, product, and mechanism in one sentence.
That is better than Procore's *"Together, we can build it all"*, which says
nothing.

Two things hold it to a 7.

First, the hero action pair is mislabelled against what it does (see
Conversion, below) — and the "INTERACTIVE PROTOTYPE" panel is `position:fixed`
bottom-left on **every** route and **overlaps the primary CTA button** at 1440
on `#/`, and covers a CTA on `#/get-pricing` and `#/build-estimate` too. The
first thing a viewer's eye lands on in the lower-left third is a black debug
box with three plaintext passwords in it.

Second, nothing in the hero says *who* Builder Assist is. Every distributor I
loaded leads with a scale fact — 84 Lumber's "320 facilities", ABC Supply's
"1000 locations", Builders FirstSource's "565 locations … 43 states". We have a
`trust-row` of three items ("We own the manufacturing", "Significantly lower
pricing", "More margin per project") — all three are self-assessments, none is
a fact a stranger could check.

**Best comparator:** Fieldwire, which puts the checkable fact *in* the subhead
("powers over 4,000,000 jobsites worldwide") rather than in a badge row below.

### Visual craft and consistency — **7/10**

The token system is genuinely disciplined. All five pages define the identical
palette block (`--ink:#071a36; --navy:#081f43; --blue:#0b4fd3;
--blue-bright:#1674ff; --cyan:#68d4ff; --ice:#f2f7ff; --line:#d9e5f7;
--muted:#5e6f89`), Arial throughout, square buttons, cyan eyebrows at
`.12em`–`.18em`. Switch between the Van Horn viewer and the admin portal and it
reads as one company. That is rarer than it sounds and it is a real asset.

Craft failures are concentrated and fixable:

- **Micro-type is below the floor.** Measured computed sizes on `#/` with
  `transform` scale 1.0: `BRANDED MESH` **6px**; `PANEL SIZE` **7px**;
  `TYPICAL COMPETITORS` **7px**; `per linear foot` **8px**; `STANDARD PANEL`
  8px; `.pricing-disclaimer` **8px**; `.availability` 8px; `.image-label` 9px;
  `.product-id` 9px; `.admin-access-link` 9px. Uppercase Arial at `.18em`
  tracking and 6–8px is a texture, not text. The pricing disclaimer — the one
  paragraph with legal weight — is 8px.
- **Mojibake on two pages.** `web/material-compare/index.html` and
  `web/employee-hub/index.html` have **no `<meta charset>`**. Served without a
  charset header the browser falls back to windows-1252 and every em dash
  renders `â€"` and every middot `Â·`. It is visible in the very first sentence
  of the materials page: *"marked **unavailable** â€" never estimated"*, and in
  the hub's demo banner and the employee picker (*"Mike Torres â€" Foreman"*).
  The source bytes are correct UTF-8 — nothing is corrupted, only undeclared.
- **Empty-state numbers styled as achievements.** The admin dashboard shows
  five KPI tiles; three read `74/74`, `500/500 active`, `1/54`, and two read
  `0` whole-build orders and `$0.00` fee revenue booked, in 28px bold. A tile
  that says `$0.00` in the same treatment as a real metric reads as a
  reporting bug, not an empty state.

### Information hierarchy and scannability — **7/10**

The homepage outline is clean and correctly nested: one `H1`, then `H2` section
heads (`MATERIALS THAT KEEP THE PROJECT MOVING.` → `WE OWN THE MANUFACTURING…`
→ `FROM MEASUREMENTS TO A READY ORDER.` → `QUOTE THE NEXT JOB…` → `START WITH
MATERIALS. STAY FOR THE SYSTEM.` → `SCHEDULE A COMPLIMENTARY WAREHOUSE
WALKTHROUGH.` → `MEMBER SIGN IN.`) with `H3` sub-steps under each. Numbered
station markers (`01`/`02`/`03`) carry the eye down the page. This is a proper
narrative: product → why cheaper → how to buy → software → visit → sign in.

Two problems:

- **The page is long and the section that closes is last.** The
  walkthrough offer (*"COMPLIMENTARY · NO OBLIGATION"* — arguably the single
  best offer on the site) sits below the entire AutoQuote section, which is
  itself below the manufacturing essay. Distributors surface the equivalent —
  84 Lumber's store locator — twice, including near the top.
- **The materials page has no landmarks at all.** `web/material-compare` has
  zero `<header>`, `<nav>`, `<main>` or `<footer>`, one `<h1>`, and **no
  further headings** for 130 rows of data. It also has no branding and no way
  back to the site.

### Conversion path a real visitor takes — **4/10**

This is the weakest dimension and it is a routing problem, not a design
problem.

I clicked the hero primary CTA, labelled **"Price your whole build"**. It
navigates to `#/get-pricing`, which is a **lead form**: headline *"Start a
quote."*, six visible fields (`name`, `company`, `phone`, `email`, `need`,
`scope`), **four required**. The word "price" appears in the button; no price
appears at the destination. That is exactly the pattern nobody in the loaded
set uses — Procore's equivalent button says *"See pricing"* and lands on a page
that at minimum explains the pricing mechanism.

Worse: the header nav item **"Price your build"** routes to `#/build-estimate`,
and as of 2026-08-28 that route renders **"CONTROL EVERY CLIENT CATALOG" /
"Open the admin portal"** — a username-and-password admin sign-in with an
`ADMINISTRATOR ACCESS` eyebrow. A prospect who clicks the nav item named
"Price your build" gets an employee login screen and zero pricing. (Note:
`reports/site-health.md` from 2026-08-26 describes this route as a
self-serve estimator with preset cards; the route's content has changed since,
so either this is a regression or — given the concurrency caveat — I caught the
route mid-rewrite. **Verify this one against the finished build before acting on
R1.** The D1 mobile-overflow defect recorded against that route in the
2026-08-26 report no longer reproduces either way.)

So the two most prominent "get a price" affordances on the site lead to a form
and a staff login respectively. There is no self-serve path to a number. Every
single loaded competitor has one — trial, tour, free tier, or portal.

What *is* good: the homepage already publishes eight real dollar figures
($3.50–$7.50 vs **$2.50**/LF fence, +$0.75 branded mesh; $8.00–$12.00 vs
**$4.00–$5.75**/SF flooring), with a disclaimer naming the variables. Neither
National Rent-A-Fence nor any of the three distributors publishes a unit price
anywhere I loaded. The pricing transparency is already there — the buttons just
do not lead to it.

### Trust and credibility signals — **3/10**

Measured on `#/`: **zero** customer logos, **zero** testimonials, **zero**
attributed quotes, **zero** review scores, **zero** certifications or licence
numbers, **zero** counts of projects/locations/years. No address. No email. No
privacy or terms link. The footer is four lines: wordmark, *"Temporary fencing
· Engineered flooring · AutoQuote software"*, *"Built for the people who
build."*, `© 2026 Builder Assist LLC`. The phone number **(517) 855-0947**
appears twice — but only mid-page, never in the header and never in the footer.
National Rent-A-Fence puts its number in the top nav, through the body, and in
the footer as click-to-call.

The one named entity is "Phoenician Doors and Windows", named as a member whose
catalog (74 products, 67 with photos) drives the AutoQuote workspace. That is a
real named partner and it is doing more work than the site gives it credit for.

Two claims currently sit unsupported: *"TYPICAL COMPETITORS $3.50–$7.50 per
linear foot"* and *"$8.00–$12.00 per square foot"* carry **no source and no
retrieval date** — while `web/material-compare/index.html` cites a named vendor
and a retrieval date for every one of its 17 sourced lines. Our own materials
page holds a higher evidentiary standard than our homepage does.

The "INTERACTIVE PROTOTYPE" panel is honest, and honesty is right — but it
prints three live credential pairs on every route, which reads as unfinished
rather than transparent.

### Mobile experience at 390px — **5/10**

Mixed, with one page that is genuinely broken on a real phone.

**Good:** the main site's hero reflows correctly at 390 — H1 wraps to four
lines, both buttons go full-width, the trust row wraps to two rows, and the
photo panel stacks below. Van Horn is the standout: the Canvas 2D model
resizes, the legend moves inline, and the stage select / PREV / NEXT / RUN
SEQUENCE row stacks cleanly with no overflow. Material Compare's 130-row table
reflows to a single column with the summary card intact.

**Measured:** `document.documentElement.scrollWidth - clientWidth` was **0** at
390px on `#/`, `#/get-pricing`, `#/build-estimate`, `#/walkthrough`, the admin
portal, and on all four sub-apps.

*Reproducibility note — most likely NOT a real defect.* An early batch of five
consecutive 390px loads reported **158px** of horizontal overflow, with the
offending boxes being phantom elements whose tag names were fragments of
JavaScript (`GRID.LENGTH;I++){`, `BARS.LENGTH;I++)`) — the parser falling out of
a `<script>` block and rendering raw source as markup. I could not reproduce it
in 14 subsequent loads or 8 further screenshot runs, and a 400 ms-interval
time-series over the first 5.2 s of load showed 0 overflow throughout. The
explanation is almost certainly the concurrency caveat above: I was serving a
4.7 MB file that another agent was rewriting, so those loads read a partially
written document. **Do not open a defect for this.** It is worth one line only
because it demonstrates the failure mode a single 4.7 MB HTML document has when
its transfer is incomplete for any reason — see R11.

**Broken:**

1. **No mobile navigation.** `.main-nav { display:none }` below the breakpoint
   and there is **no hamburger, no drawer, no replacement**. At 390 the header
   contains the wordmark and one button. All five nav destinations — Products,
   Pricing, Price your build, AutoQuote, Visit the warehouse — are unreachable
   from the header on a phone. (12 in-body anchors remain, so the site is not
   dead, but the primary nav is.) Every loaded competitor keeps a full mobile
   menu.
2. **`web/material-compare/index.html` has no `<meta name="viewport">`.** Under
   real mobile emulation (`isMobile:true`, 390×844, DPR 3) the layout viewport
   resolves to **980px** and the whole page is scaled down to ~40%. The intro
   paragraph renders at roughly 4px effective, the 130-row table is cut off at
   the right edge with no scroll container, and the source links are
   unreadable. My earlier 390px screenshots of this page looked fine only
   because desktop Chromium honours the requested viewport without the meta —
   a real phone will not. This is the single worst mobile defect in the repo.
   All five other pages declare a viewport meta correctly.

### Accessibility — **4/10**

| | main | vanhorn | bp3d | matcomp | hub |
|---|---|---|---|---|---|
| `<html lang>` | **none** | en | en | **none** | **none** |
| `<meta charset>` | yes | yes | yes | **no** | **no** |
| `<main>` landmark | yes | yes | yes | **no** | yes |
| `:focus` CSS rules | 12 | 5 | **1** | **0** | **0** |
| focusable controls | 25 | 14 | **49** | 20 | 4 |
| skip link | no | no | no | no | no |
| `<img>` missing `alt` | 0 | — | — | — | — |
| `<canvas>` labelled | — | 1/1 | 1/1 | — | — |
| tables with `<th>` | — | **0 of 2** | — | 1 of 1 | — |

Credits where due: no unlabeled form controls anywhere (0 across all five
pages), no buttons or links without an accessible name (0 across all five), all
4 images on the main site carry `alt`, and both `<canvas>` elements carry an
accessible name — that last one is a genuinely thoughtful touch for a
hand-written 3D viewer, and `verify-assistify.mjs` confirms reduced-motion is
honoured (the construction sequence does not auto-play).

Problems:

- **Focus styling is missing where it is needed most.** `blueprint-3d` has 49
  focusable controls and **one** `:focus` rule; `material-compare` (20
  controls) and `employee-hub` have **zero**. Keyboard users get the UA default
  ring only, over dark navy panels where it is weak.
- **`lang` is absent on the main site's `<html>`.** (`grep` finds
  `<html lang="en">` in the file, but that occurrence is inside one of the
  base64 sub-documents; the live document element has no `lang`.)
- **Contrast.** Systemic: `--blue-bright: #1674ff` on white measures **4.22:1**
  and on `--ice #f2f7ff` measures **3.92:1** — below the 4.5:1 floor for
  normal text, and it is used at 10–12px for the source links on the materials
  page ("Homewyse (May 2026 basis)", "A1 Garage Door Service"), the "within
  range" chips, and the "Material Scouting" eyebrow. `--cyan #68d4ff` on
  `--blue #0b4fd3` measures **4.05:1** on the "BUILDER ASSIST" price-comparison
  label. On the main site, `#71829a` on `--ice` measures 3.64:1 and `#65758b`
  on `#eef3f9` measures 4.21:1. Several other flagged items are false
  positives (cyan or near-white micro-labels sitting over the dark hero
  photograph, where my background walk resolved to white) and I am not counting
  them. `blueprint-3d` in dark returned **zero** failures — that palette is
  the best of the set.
- **No skip link on any page**, including `blueprint-3d` with its 12-button
  toolbar ahead of the content.
- **Van Horn's two quantity tables have no `<th>`.** A screen reader gets 6
  quantity rows and 3 model-check rows as undifferentiated cells, losing
  exactly the column semantics (`quantity` / `unit` / `drawn vs takeoff`) that
  make the panel meaningful.

### Performance and perceived weight — **5/10**

Measured on localhost: FCP 44 ms, load 237 ms, transfer 4,714,165 bytes. The
sub-apps are light and fast — Van Horn 98 KB / 63 ms, Material Compare 88 KB /
96 ms.

The main site is one 4.71 MB document, and **83% of it is payload not needed
for first paint**:

- 2,483,828 B (53%) is two `<script type="application/base64">` blocks holding
  the estimator and the full Assistify build, decoded and mounted lazily into
  iframe `srcdoc`. Correct architecture for an artifact — but the bytes ship on
  every visit even though most visitors never open either.
- 1,418,796 B (30%) is 71 `data:image/webp` URIs. Base64 costs ~33% over the
  raw bytes, so roughly 350 KB of that is encoding overhead alone, and none of
  it can be lazy-loaded, cached separately, or served responsively.

Because it is a single document, none of it can be deferred: the browser must
receive the whole 4.71 MB before the parser finishes. I did not retrieve any
figure for jobsite mobile bandwidth, so I will not convert that into seconds —
but I will note that this is the exact failure mode of the one non-reproducible
overflow bug above.

Also: no `<meta name="description">` on the main site (5 `og:`/`twitter:`
occurrences exist, but no description), and none on `material-compare`. Van
Horn and Assistify both have good ones.

### Portal / product experience — **8/10**

This is where the work is strongest, and it deserves a plain statement: **the
3D viewers and the materials page are better than anything I loaded in Part 1
at the specific thing they do.**

**Van Horn (`web/vanhorn-3d`) — the best surface we own.** Hand-written Canvas
2D isometric with dimension leaders (`32'-0"`, `56'-6"`, `83'-0" OVERALL`),
seven construction stages, auto-orbit / dimensions / reset controls, and a
right rail carrying the quantities *with their derivation*: "700 CY … to the
underside of the 9"×18" footing — 8'-9" below top of wall, with 2'-0" working
room", six line items with `LOW`/`MED` confidence chips, and — the part nobody
else does — a **MODEL CHECK** panel comparing drawn geometry against the
takeoff (`Pit volume drawn 705.8 vs 700 CY ✓`, `Garage footings 4.2 vs 5.3 CY
Δ`) with the discrepancy *explained in prose*: "The takeoff adds 25% for
thickened corners and pilasters the model does not draw." Togal.AI claims *"up
to 98% accuracy"* as a marketing number; Van Horn shows the residual, per line,
and says where it comes from. That is a materially stronger trust move and it
should be on the homepage.

**Material Compare** is the other one. The summary card reads *"17 of 130 lines
have a sourced market price"* — 15 comparable, 2 reference-only, **113
unavailable (87% of the table)** — and then explains *why*: "the Phoenician
catalog (74 lines) is priced per square foot of a made-to-size opening, while
market windows and doors are sold per unit at fixed sizes — no comparison is
possible without inventing a size." Every sourced row names its vendor, its URL
and its retrieval date (2026-08-26), and rows carry caveats like "BA scope does
not state fuel type; electric figure used. Gas tankless runs materially
higher." Judged on its own terms rather than against a marketing-page template:
this is a page that reports its own coverage as 13% and refuses to fill the
rest. Nothing in the loaded competitive set does that. It is the strongest
credibility asset in the repository and it is currently unbranded, unlinked,
unlabelled, and broken on phones.

**Admin portal** (after `TylerSchopper1/Tyler1`): 11 nav sections (Dashboard,
AutoQuote Control, Catalog & Pricing, Competitor Intel, Order Desk,
Walkthroughs, Members, 3D Model, Assistify 3D, Whole-Build Estimator, Cost
Estimator), five KPI tiles, four entry cards. Substantial and coherent.
**Member portal** (`Phoenician1/Tyler1`) opens on *"WELCOME, PHOENICIAN."* with
a numbered 01 Upload scope → 02 Choose items → 03 Final quote rail and a
drop-zone. Both feel like products.

**Employee Hub** leads with two honesty banners — *"SEEDED DEMO DATA — every
employee, job, time entry and request on this page was generated for this demo.
Not real payroll records."* and *"This is a demo, not a login. There is no
password, no server and no real authentication… Real access control needs a
backend."* Right call, clearly stated.

The deduction: **`web/blueprint-3d` (Assistify) ships empty.** Default state is
a bare grid on a dark void with *"UNVERIFIED GEOMETRY: 0 plan entries were
indexed, but none have been applied as 3D shapes"*, *"No conceptual geometry
has been generated for this model"*, `Visible supported elements 0`,
`Stage-supported elements 0`, `Measurement —`, `0% overall · 0 of 12 stages`,
and seven load/import/export buttons in a ragged 2-3-2-1 wrap. The truth
boundary is respected exactly as CLAUDE.md requires and `verify-assistify.mjs`
passes 31/31 — but a visitor's first sight of our flagship tool is an empty
room. Van Horn proves the same engine looks extraordinary with data in it.
Also: `blueprint-3d` defines its dark palette **only** under
`@media (prefers-color-scheme: dark)` with **zero** `[data-theme]` blocks,
which BUILD-CONSTRAINTS.md explicitly forbids; the other four pages get this
right (main-site 8 `data-theme` occurrences, vanhorn 9, matcomp 4, hub 2).

### Copy and voice — **8/10**

The best-written thing in the repo. It is specific where competitors are vague,
and it never reaches for a superlative it cannot back:

- *"Manufacturer-direct temporary anti-climb fencing and engineered
  flooring—built to deliver an excellent product at a rate that leaves more
  profit in every project."*
- *"Builder Assist owns the manufacturing company that builds the fencing and
  flooring products we sell. Because we control the product at the source, we
  avoid extra layers of distributor and reseller markup that inflate material
  costs."* — a mechanism, not an adjective. Compare Procore's *"Together, we
  can build it all."*
- *"Your company's sales reps never have to quote a job again."* — a real
  benefit statement aimed at a real person.
- The four-beat spine — *We manufacture / We remove markups / You pay less /
  You keep more* — is the clearest thing on the page.
- *"START WITH MATERIALS. STAY FOR THE SYSTEM."* is a genuinely good line, and
  it happens to be the same land-and-expand thesis Builders FirstSource sells
  myBLDR on.

Deductions: *"Portable 8-foot-wide by 6-foot-high panels built to establish a
secure perimeter without permanent installation"* is spec-sheet voice inside a
sales page; *"building homes, businesses, and the American Dream"* is the one
line that reaches; the *"TYPICAL COMPETITORS"* ranges are stated in an
authoritative voice with no citation, which is out of step with how the
materials page talks; and the section eyebrows (`BOTTOM OF FUNNEL / SOFTWARE`)
leak internal funnel vocabulary onto a customer-facing page.

---

## 2.3 Overall — **6/10**

A site with an unusually strong product core and an unusually weak commercial
surface, and the gap between the two is the whole story. The 3D work is
exceptional: Van Horn's Canvas 2D construction sequence with per-stage
quantities and a drawn-vs-takeoff reconciliation panel is more credible
evidence of competence than any logo wall I loaded in Part 1, and Material
Compare's decision to report 87% of its own table as unavailable — with vendor,
URL and retrieval date on the 13% that is sourced — is a trust instrument no
competitor in the loaded set attempts. The copy is specific, the token system
holds across five independently built pages, and the homepage already publishes
eight real unit prices that neither the fence rental company nor any of the
three distributors will publish. But a visitor cannot get to any of it: the
header nav's "Price your build" lands on an admin login, the hero's "Price your
whole build" lands on a six-field form, the header nav does not exist below
390px, the materials page has no viewport meta and renders at 40% on a real
phone, two pages have no charset and show mojibake in their first sentence, and
the homepage carries zero customers, zero testimonials, zero certifications and
no phone number in the header or footer. The score is 6 because everything
holding it down is a routing fix, a meta tag, or a content asset — none of it
requires rebuilding what is already good.

---

# PART 3 — Recommendations, ranked by impact/effort

Constraints respected throughout: **no external assets** (strict CSP — inline
CSS/JS, `data:` URIs, Google Fonts only); the main site stays **fixed-light**
while sub-pages stay theme-aware; **navy/blue/cyan tokens, Arial, heavy
letter-spaced uppercase labels** are kept. Nothing below adds a CDN script, a
remote image, or a fetch.

---

### R1. Point "Price your build" at a price, not at an employee login
**Effort: hours. Impact: highest.**

**Change:** repoint the header nav item "Price your build" away from
`#/build-estimate` (currently the admin sign-in, headline *"CONTROL EVERY
CLIENT CATALOG"*). Either restore the self-serve estimator on that route, or
route it to the on-page price comparison band anchor. Move the admin sign-in
behind `#/admin-signin` only, and remove it from public nav entirely. Relabel
the hero primary CTA from "Price your whole build" to **"See fence & flooring
pricing"** targeting the comparison band (which already shows $2.50/LF and
$4.00–$5.75/SF), and demote "Get a quote" to the secondary slot.

**Why:** measured 2026-08-28 — clicking the nav item named "Price your build"
yields a username/password field and zero prices. Every one of the nine loaded
SaaS/distributor sites pairs a *self-serve* hero action with a sales-assisted
one, and the self-serve one is never a login (STACK "Try it FREE", Fieldwire
"Get Started Free", Togal "Take a Tour", Procore "See pricing"). We are the
only site in the set where the pricing affordance is a staff door.

**Know it worked:** click-through from hero to a route that contains a `$`
figure > 0; zero sessions landing on `#/build-estimate` without an
authenticated cookie.

---

### R2. Add `<meta charset="utf-8">` and `<meta name="viewport">` to the two pages missing them
**Effort: two lines. Impact: very high.**

**Change:** in `web/material-compare/index.html` add both metas; in
`web/employee-hub/index.html` add the charset meta. Add `lang="en"` to the
`<html>` of both plus `web/main-site/index.html`.

**Why:** measured — `material-compare` under real mobile emulation resolves a
**980px** layout viewport on a 390px screen, scaling the whole page to ~40%; the
table is cut off with no scroll container. Both pages currently render
`unavailable â€" never estimated` and `Mike Torres â€" Foreman` because the
browser falls back to windows-1252 with no declared charset. The source bytes
are already correct UTF-8. This is the cheapest high-impact fix in the repo and
BUILD-CONSTRAINTS requires pages to be self-contained rather than depend on a
host's response headers.

**Know it worked:** `document.documentElement.clientWidth === 390` under
`isMobile:true` at 390×844; zero occurrences of `â€` in rendered `innerText`.

---

### R3. Give the phone number and one checkable fact permanent header/footer residency
**Effort: hours. Impact: high.**

**Change:** put **(517) 855-0947** as a `tel:` link in the sticky header (next
to the CTA at ≥820px, as a click-to-call icon below it) and in the footer.
Expand the footer from four lines to: address, phone, email, hours, licence or
entity number, privacy and terms links.

**Why:** measured — the number appears twice mid-page and nowhere in the header
or footer; there is no address, no email, no privacy link. National Rent-A-Fence
(retrieved 2026-08-28), the closest analogue to our physical line, puts
800-352-5675 in the top nav, repeatedly through the body, and in the footer as
mobile click-to-call. Builders FirstSource publishes a verifiable licence
number (CSLB #1099243). For a manufacturer-direct seller asking contractors to
commit material spend, a hidden phone number is a conversion tax.

**Know it worked:** `tel:` click events; inbound call volume attributed to web.

---

### R4. Build a mobile navigation
**Effort: half a day. Impact: high.**

**Change:** add a hamburger that opens a full-screen navy overlay listing all
five destinations plus "Call (517) 855-0947" and "Member sign in". Square
button, uppercase 800-weight labels, `--navy` ground, `--cyan` eyebrow — the
existing system, no new visual language. Pure CSS + one class toggle; no
library, no CSP impact.

**Why:** measured — at 390px all five `.main-nav` links compute to
`display:none` and there is no replacement control; the header holds the
wordmark and one button. Every loaded competitor retains a full mobile menu.
A landing page whose primary audience is on a phone at a jobsite cannot ship
with an unreachable nav.

**Know it worked:** ≥3 distinct routes reached per mobile session (vs. the
current ceiling of the one CTA plus in-body links).

---

### R5. Put the Van Horn model and the Material Compare coverage stat on the homepage
**Effort: 1–2 days. Impact: high.**

**Change:** add a section between "MORE PRODUCT. LESS MARKUP." and the
manufacturing essay: a still frame or live embed of the Van Horn stage-1 view
with its **MODEL CHECK** panel visible (`Pit volume drawn 705.8 vs 700 CY ✓`;
`Garage footings 4.2 vs 5.3 CY Δ` + the "adds 25% for thickened corners" note),
headed something like `WE SHOW OUR WORK.` Beside it, the Material Compare
number stated plainly: **"17 of 130 lines have a sourced market price. We
publish the other 113 as unavailable."** Link both. Brand the materials page
with the site header and a back link while you are in there.

**Why:** Togal.AI (retrieved 2026-08-28) sells on *"up to 98% accuracy"* and
*"5x faster"* — unverifiable assertions. We can show the residual, per line,
with its derivation, which is strictly stronger. Right now our best credibility
assets are on unlinked, unbranded sub-pages that no visitor will find, while
the homepage's own competitor price ranges ($3.50–$7.50, $8.00–$12.00) carry no
source at all — a standard our own materials page exceeds.

**Know it worked:** scroll-depth to that section; clicks through to
`vanhorn-3d` and `material-compare`; the two competitor ranges gain a cited
source and retrieval date.

---

### R6. Load a real project into Assistify by default
**Effort: hours. Impact: medium-high.**

**Change:** on first load with no stored model, auto-load the 4752-25 approved
plan (the button already exists) instead of rendering the empty grid. Keep
every truth-boundary marker exactly as-is — VERIFIED/INFERRED/UNVERIFIED,
dashed concept geometry, source citations. Add a one-line "Start empty" escape.
Collapse the seven load/import/export buttons into a single "Load / import"
menu so the ragged 2-3-2-1 wrap disappears.

**Why:** measured — the default state is a bare grid reading *"0 plan entries
were indexed"*, `Visible supported elements 0`, `Measurement —`, `0% overall ·
0 of 12 stages`. Van Horn, running comparable rendering with data loaded, is
the most impressive surface we own. Nothing about loading a sample violates the
truth boundary; it changes what is on screen, not what is claimed about it.

**Know it worked:** time-to-first-meaningful-render on `blueprint-3d`; share of
sessions that reach stage 2+ instead of bouncing on the empty grid.

---

### R7. Raise the type floor and fix the two failing tokens
**Effort: half a day. Impact: medium.**

**Change:** set an 11px minimum on all uppercase micro-labels — the six-to-nine
pixel cases are `BRANDED MESH` (6px), `PANEL SIZE` (7px), `TYPICAL COMPETITORS`
(7px), `per linear foot` (8px), `STANDARD PANEL` (8px), `.availability` (8px),
`.pricing-disclaimer` (8px), `.image-label` (9px), `.product-id` (9px),
`.admin-access-link` (9px). Lift `.pricing-disclaimer` to 13px. For small text
on light grounds, darken `--blue-bright` from `#1674ff` (**4.22:1** on white,
**3.92:1** on `--ice`) to a variant at ≥4.5:1, and stop using `--cyan #68d4ff`
on `--blue #0b4fd3` (**4.05:1**) for the price-comparison label — use white
there. Keep the heavy uppercase letter-spaced treatment; only the size and the
two token values change.

**Why:** all values measured with `transform` scale confirmed at 1.0, so these
are true rendered sizes. The affected `--blue-bright` usages include every
source link on the materials page — precisely the text a sceptical reader is
trying to check.

**Know it worked:** zero computed body font sizes below 11px; zero WCAG AA
normal-text contrast failures outside the known over-photograph false
positives.

---

### R8. Move the free warehouse walkthrough above the AutoQuote section
**Effort: hours. Impact: medium.**

**Change:** promote *"SCHEDULE A COMPLIMENTARY WAREHOUSE WALKTHROUGH"*
(currently second-to-last, below the entire software narrative) to directly
after the price comparison band, and add a compact repeat near the footer.

**Why:** it is the lowest-friction, highest-intent offer on the site —
"COMPLIMENTARY · NO OBLIGATION", see the product in person, staged and ready —
and it is buried behind a long B2B software argument. 84 Lumber (retrieved
2026-08-28) surfaces its store locator **twice**, including high on the page,
with a default branch pre-populated. Physical proximity is the distributor
conversion mechanic and we are hiding ours.

**Know it worked:** walkthrough bookings per session; scroll depth required to
reach the first booking CTA drops.

---

### R9. Move the prototype banner out of the way and stop printing credentials
**Effort: an hour. Impact: medium.**

**Change:** move the "INTERACTIVE PROTOTYPE" panel from fixed bottom-left to a
dismissible top strip (or bottom-right, clear of CTAs), persist DISMISS in
`localStorage` inside try/catch per BUILD-CONSTRAINTS, and replace the three
plaintext credential pairs with a single "Show demo sign-ins" disclosure.

**Why:** observed at 1440 — the panel overlaps the hero's primary CTA on `#/`
and covers a CTA on `#/get-pricing` and `#/build-estimate`. The candour is
correct (the Employee Hub's *"This is a demo, not a login… Real access control
needs a backend"* is exactly right in tone); printing three live passwords on
every route is not.

**Know it worked:** no overlap between the banner's bounding box and any
`.button-primary` at 1440, 1024 and 390.

---

### R10. Accessibility floor: focus rings, landmarks, table headers, skip links
**Effort: 1–2 days. Impact: medium.**

**Change:** (a) add an explicit `:focus-visible` ring using `--cyan` on dark
grounds and `--blue` on light to `material-compare` (0 rules, 20 controls),
`employee-hub` (0 rules) and `blueprint-3d` (1 rule, **49** controls); (b) wrap
`material-compare` in `<header>/<main>/<footer>` — it currently has none — and
give it the site header; (c) add `<th scope="col">` to Van Horn's two
quantity tables (currently 0 of 2 have any `<th>`); (d) add a skip link to all
five pages.

**Why:** measured in the table under Accessibility. The form-labelling and
accessible-name work is already at zero defects across all five pages, and both
`<canvas>` elements are labelled — the remaining gaps are keyboard visibility
and document structure, which are the cheap half.

**Know it worked:** every interactive control shows a visible ring on Tab in
both themes; `<main>` present on 5/5 pages; axe-core critical/serious count at
zero.

---

### R11. Split the hosted build from the artifact build
**Effort: 2–3 days. Impact: medium, compounding.**

**Change:** keep `web/main-site/index.html` as the single-file artifact exactly
as-is. Add a hosted variant from the same source where (a) the 71
`data:image/webp` URIs become real `<img src>` files with `loading="lazy"` and
`srcset`, and (b) the two `<script type="application/base64">` sub-documents
become separate fetched files loaded on demand. That is 1,418,796 B + 2,483,828
B = **3.90 MB of the 4.71 MB (83%)** removed from the first-paint payload.

**Why:** measured. Because it is one document, none of it can be deferred today
— the parser must consume all 4.71 MB. It is also the mechanism behind the one
non-reproducible defect I saw: a truncated transfer dropped the parser out of a
`<script>` block and rendered raw JavaScript as markup (phantom elements named
`GRID.LENGTH;I++){`), producing 158px of horizontal overflow at 390px on five
consecutive loads. I could not reproduce it in 22 later loads and am not
recording it as a standing defect — but a 4.7 MB monolith is the shape that
fails this way, and the fix removes the shape.

**Know it worked:** hosted first-paint transfer under 500 KB; artifact build
byte-identical to today's.

---

### R12. Fix `blueprint-3d`'s theme declaration and the admin zero-state tiles
**Effort: hours. Impact: low-medium.**

**Change:** (a) `web/blueprint-3d/index.html` defines its dark palette only
inside `@media (prefers-color-scheme: dark)` with **zero** `[data-theme]`
blocks — add the `:root:not([data-theme="light"])` guard and the
`:root[data-theme="dark"]` block that BUILD-CONSTRAINTS mandates and that the
other four pages already have (main-site 8 occurrences, vanhorn 9, matcomp 4,
hub 2). (b) In the admin dashboard, render `0` and `$0.00` tiles in `--muted`
with an explicit "No orders yet" caption rather than in the same 28px bold as
`74/74` and `500/500 active`.

**Why:** (a) is a stated non-negotiable in BUILD-CONSTRAINTS.md and
`blueprint-3d` is the only page violating it. (b) observed — five KPI tiles
share one treatment, and two of them showing `0` and `$0.00` at full weight
reads as a broken metric rather than an empty state, which undercuts the
portal's otherwise strong credibility.

**Know it worked:** `blueprint-3d` renders its dark palette under an explicit
`data-theme="dark"` with `prefers-color-scheme: light`; zero-value tiles
visually distinct from populated ones.

---

## Appendix — measurement artifacts

Screenshots (1440×900 and 390×844, light and dark; plus `isMobile` emulation
for the viewport-meta test) and the probe scripts used to produce every number
above are in this session's scratchpad at
`/tmp/claude-0/-home-user-Builder-assist/0e4b2398-0e9f-5b1a-a51d-fd41d937a6c5/scratchpad/`
(`shots/`, `shot.mjs`, `a11y.mjs`, `contrast.mjs`, `tiny.mjs`, `nav.mjs`,
`path.mjs`, `est.mjs`, `diag*.mjs`). These are working files, not deliverables.
