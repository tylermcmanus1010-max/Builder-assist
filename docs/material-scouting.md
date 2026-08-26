# Material scouting — market prices vs Builder Assist prices

**Coverage: 17 of 130 lines have a sourced market price (13%).** Of those 17,
15 are unit-comparable enough to carry a delta and 2 are reference-only
(scope mismatch, no delta computed). The other 113 lines (87%) are marked
**UNAVAILABLE** with a stated reason. This is not a complete dataset and the
comparison page is designed so nobody can mistake it for one.

Page: `web/material-compare/index.html`. All market figures were retrieved
**2026-08-26** via live web search + page fetch; nothing was filled in from
memory or "typical" figures. The operating rule was the user's instruction
verbatim: *"if value is unavailable stand by."*

## 1. Our prices — where each number comes from

All Builder Assist prices were parsed out of the published site artifacts
(read-only reference copies under the session's `tool-results/` directory):

| Source | Lines | What it is |
|---|---|---|
| Cost Estimator (`artifact-0eb9704f`) RANCH template | 2 | The only lines with a **landed cost**: temporary fence rental (landed $0.95, sell $2.50 per lf-month, 62% margin) and engineered hardwood (landed $2.60, sell $4.75 per sf, 45% margin). These are the two `ba:` fields in the template data (`div 01` and `div 09`); a scan for every `ba:` key in the source confirmed there are exactly two such lines. |
| `window.__PHX` (`artifact-89d6cc50`) | 74 | Phoenician A-Series source-rate catalog: windows, exterior doors, one garage door. `rateCents` is a **per-square-foot-of-opening** rate (confirmed in the site's own line math: `price = rateCents × (w×h/144)`), except the garage door, which is quote-required per opening. No landed cost is published. |
| `window.__SCOPE` (`artifact-89d6cc50`) | 54 | `baRefCents` reference rates per stated unit (per sf, per lf, each, per house…). These are **installed scope rates including labor**, not bare material prices. No landed cost is published. |

`window.__PHXMODELS` (67 entries) carries model/finish metadata with no
prices, so it contributes descriptions only. `window.__TAKEOFF` (85 items)
carries quantities/units for the Van Horn build — demand, not prices — and is
not part of the price table.

Margin is computable only for the 2 estimator lines. Everywhere else "our
landed" is rendered as **not published** (a fact about our data, not a zero).

## 2. Market sourcing method

- WebSearch to find candidate sources, then **WebFetch of the actual page** to
  verify the figure as printed. A number that appeared only in a search-result
  summary was not recorded.
- Every recorded figure carries: the quoted range verbatim, vendor, URL, and
  retrieval date (2026-08-26). Homewyse pages additionally state their own
  "May 2026" national-average basis, which is preserved in the vendor label.
- Deltas are computed against the **midpoint of the sourced range** (labelled
  "vs mid" on the page), except garage-door openers where the source states a
  median ($908) — the delta uses that. Each row also gets a below/within/above
  range badge, which is assumption-free.
- Two derivations were allowed because they are exact arithmetic, not
  assumptions, and both are disclosed on the row:
  - Fixr's "$340–$1,020 per month for 200 feet" ÷ 200 = $1.70–$5.10 per
    lf-month.
  - Homewyse's $5.09–$6.66 per sf × 100 = $509–$666 per roofing square
    (1 square ≡ 100 sf by definition).

### Sourcing log (all retrieved 2026-08-26)

| Line | Market figure (as printed) | Vendor / URL | Comparability |
|---|---|---|---|
| Engineered hardwood (BA supply) | materials only "$4 and $12 per square foot" | Today's Homeowner — todayshomeowner.com/flooring/cost/engineered-hardwood-flooring-cost/ | comparable (material vs material) |
| Temp fence rental (BA supply + SCOPE-temp_fence) | "$340 and $1,020" per month per 200 ft; "$20 to $70 for a 6' x 12' panel per month" | Fixr — fixr.com/costs/rent-temporary-fences | comparable; spec caveat: market is standard 6' chain-link, ours is 8'×6' anti-climb |
| SCOPE-drywall | hang only "$2.26 - $2.69 per square foot" | Homewyse cost_to_hang_drywall | **reference only** — hang-only vs our hang+tape+texture |
| SCOPE-int_paint | "$1.29 - $2.78 per square foot" (walls) | Homewyse cost_to_paint_wall | comparable (ours adds ceilings/primer) |
| SCOPE-ext_stucco | "$10.69 - $17.33 per square foot" | Homewyse cost_to_install_stucco | comparable |
| SCOPE-roof_cover | "$5.09 - $6.66 per square foot" asphalt shingle | Homewyse cost_to_install_asphalt_shingle_roof | comparable; product caveat (ours spans tile/foam/metal) |
| SCOPE-tile_floor | "$16.38 - $20.21 per square foot" | Homewyse cost_to_install_tile_floor | comparable |
| SCOPE-carpet | "$5.27 - $7.72 per square foot" | Homewyse cost_to_install_carpet | comparable |
| SCOPE-resilient | "$7.89 - $12.79 per square foot" engineered wood; secondary: LVP "$6–$20 per square foot" | Homewyse cost_to_install_engineered_wood_floor; This Old House cost-to-install-vinyl-plank-flooring | comparable |
| SCOPE-int_doors | "$444 - $675 per door" | Homewyse cost_to_install_interior_door | comparable |
| SCOPE-trim | baseboard "$8.96 - $13.71 per linear foot" | Homewyse cost_to_install_baseboard | **reference only** — baseboard-only vs our base+casing+window-trim mix |
| SCOPE-gar_openers | median "$908"; middle half "$523 and $1,169" | A1 Garage Door Service — a1garage.com/garage-door-opener-installation-cost/ (193,346 invoices, 2021–2025) | comparable |
| SCOPE-toilets | "$635 - $1,151 per toilet" | Homewyse cost_to_install_toilet | comparable |
| SCOPE-fans | "$669 - $1,118 per fan" | Homewyse cost_to_install_ceiling_fan | comparable |
| SCOPE-water_heater | electric "$1,920 - $2,254 per heater" | Homewyse cost_to_install_electric_water_heater | comparable; caveat — BA scope doesn't state fuel type |
| SCOPE-concrete | driveway "$9.59 - $11.78 per square foot" | Homewyse cost_to_install_concrete_driveway | comparable |

## 3. What could not be sourced, and why

Unavailable lines carry one of these reasons on the page, per line:

- **UNIT MISMATCH — 73 lines** (the whole Phoenician window/door catalog).
  Our rate is per sf of a made-to-size opening; the market sells windows and
  doors per unit at fixed sizes. Any conversion requires assuming a size, so
  none was made. This is the single biggest comparability problem in the
  dataset and the reason coverage cannot honestly exceed ~40% without a
  different method (e.g. quoting specific sizes from manufacturers).
- **Quote-required product — 1 line** (Phoenician garage door): made-to-
  opening, no list-price basis exists on either side.
- **NO MATCHING MARKET UNIT — 18 lines**: bundled scopes and allowances
  ("per house", "per system", multi-trade sets). Published market prices do
  not map onto these units without decomposition assumptions.
- **SPEC AMBIGUOUS — 18 lines**: brand/grade/size unspecified in the BA line
  while market prices vary several-fold across that range (windows "each",
  cabinets per lf, HVAC per system, appliance suites…). Picking a point in
  that spread would be a guess.
- **SOURCING ATTEMPTED, NO VERIFIED RESULT — 1 line** (smoke/CO alarms):
  candidate pages 404'd/403'd on 2026-08-26; nothing quotable was retrieved.
- **NOT ATTEMPTED IN THIS PASS — 2 lines** (closet shelving per lf,
  electrical devices per device): no lookup was run; left honestly empty.

Fetch failures encountered along the way (recorded so the next pass doesn't
repeat them): homeguide.com and angi.com return HTTP 403 to the fetcher;
several guessed Homewyse slugs (water_heater, smoke_detector,
vinyl_plank_flooring) are 404 — the working slugs are in the log above.

## 4. Comparability caveats that apply even to sourced lines

- **Installed vs material basis.** SCOPE rates include labor; Homewyse
  figures also include labor + materials, so those pairs match. The two BA
  supply lines are material/rental-only and were only compared against
  material-only / rental figures.
- **Cost-guide ranges are estimates, not quotes.** Homewyse/Fixr/Today's
  Homeowner publish national-average ranges, not transactable prices. They
  are the market *reference*, and every row says which one it used. The one
  invoice-derived figure (A1, garage openers) is labelled as such.
- **Range-midpoint deltas.** A delta against a range midpoint is a summary,
  not a market fact; the below/within/above-range badge is the
  assumption-free signal.

## 5. Result snapshot (15 comparable lines)

Builder Assist prices sit **below or within** the sourced market range on 14
of 15 comparable lines (e.g. fence rental $2.50 vs $1.70–$5.10 lf-mo;
engineered hardwood sell $4.75 vs $4–$12 material; interior doors $320 vs
$444–$675; ceiling fans $320 vs $669–$1,118). The single line **above** its
sourced range is concrete flatwork at $12.00/sf vs $9.59–$11.78 (Homewyse
driveway basis — and our line also covers sidewalks/steps, so even this one
carries a scope caveat).
