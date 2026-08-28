# Blueprint 3D — Van Horn Residence construction-stage model

`index.html` is a fully self-contained page (no external assets, artifact-safe)
that renders the Van Horn Residence in 3D with a hand-written Canvas 2D
pipeline and steps through seven construction stages. All quantities shown in
the side panel come from the real takeoff (`takeoff.json`, extracted verbatim
from `window.__TAKEOFF` in the published Builder Assist LLC artifact).

## Coordinate system

World coordinates are in **feet**:

- **x** — east, along the 83'-0" overall front. House occupies `0 .. 56.5`,
  garage `56.5 .. 83`.
- **y** — north, into the lot. House `0 .. 32` (front wall at y=0),
  garage `0 .. 38`.
- **z** — up. **Datum z = 0 is the top of the house foundation wall**, which
  is also grade (the 4'-0" site grid sits there). Everything below grade is
  negative: basement wall bottom at −8'-0", footing bottom / excavation floor
  at −8'-9".

All derived elevations (top of subfloor, plates, heels, ridges, garage slab a
7" step down, …) are computed once into the `D` object at the top of the
script from the sheet dimensions — change a source dimension there and the
whole model follows.

Rendering: orbit camera (azimuth / elevation / distance around a target),
perspective projection with near-plane clipping, painter's-algorithm depth
sort by view-space centroid, per-face Lambert shading precomputed against a
fixed light. `devicePixelRatio`-aware, resizes with its container.

## How stages are defined

Stage indices 1–7 are declared as constants (`S_EXC`, `S_FDN`, `S_SLAB`,
`S_FLOOR`, `S_FRAME`, `S_ROOF`, `S_DONE`). Two parallel structures define a
stage:

1. **Geometry** — every element in the store `E` carries the stage `s` at
   which it appears. `build()` creates them with the helpers
   `F(stage, points, role)` (face), `L(stage, a, b, role)` (line),
   `boxF`/`ringF` (boxes/wall rings), `frameWall` (plates + studs + headers)
   and `skin` (cladding plane with openings). The `role` string picks fill
   and edge colors from `STYLE`. At render time, elements with `s < current`
   draw receded, `s === current` draws emphasized in blue, `s > current` is
   hidden; forward stage changes tween in (grow from `zb` + fade), respecting
   `prefers-reduced-motion`.
2. **Panel copy** — `STAGES[n]` holds the name, description, headline metric,
   the list of takeoff **item names** shown in the quantities table (looked
   up by exact name in `BYNAME`; a missing name logs a console error), and a
   `checks()` function returning rows that recompute quantities from the
   drawn geometry and compare them against the takeoff (deltas are shown as
   `Δ` with an explanatory note, never hidden).

## Adding a stage

1. Add a stage constant and bump the count (search for `of 7`, the `for` loop
   in `initSelect`, and the `setStage` clamp — they all use 7).
2. Create its geometry in `build()` (or a helper called from it) tagging every
   element with the new stage index. Keep element z-bases honest — `zb` drives
   the grow-in animation.
3. Append a `STAGES` entry: name, description, headline (an `item` name from
   `takeoff.json`, or a `value()` function), the item-name list, and a
   `checks()` function that derives at least one number from the geometry.
4. If a new material is involved, add a `role` to `STYLE`.

## Data

`takeoff.json` is the source of truth (85 line items, verified byte-identical
in content to the published artifact's `window.__TAKEOFF` items). The page
inlines a subset of it between the `/*TAKEOFF:BEGIN*/ … /*TAKEOFF:END*/`
markers so it stays a single self-contained file. To re-inject after editing
`takeoff.json`:

```sh
cd web/blueprint-3d && python3 - <<'EOF'
import json, re
d = json.load(open('takeoff.json'))
p = {k: d[k] for k in ('project_name','source','items','assumptions','open_questions')}
src = open('index.html').read()
open('index.html','w').write(re.sub(
  r'/\*TAKEOFF:BEGIN\*/[\s\S]*?/\*TAKEOFF:END\*/',
  '/*TAKEOFF:BEGIN*/\nconst TAKEOFF = '+json.dumps(p,separators=(",",":"),ensure_ascii=False)+';\n/*TAKEOFF:END*/',
  src))
EOF
```

Known modeling liberties (all disclosed on the page under "What the model
assumes"): opening positions along each wall are indicative (sizes/counts are
real; only the three 9'-0" overhead doors are located by a dimension string),
the partition layout is indicative of the scaled ~175 LF, garage walls use the
takeoff's assumed 9'-0", porches are not modeled, and look-out wall heights are
not dimensioned so those runs draw full height.

## Verify

```sh
OUT_DIR=./reports node tools/verify-artifacts.mjs web/blueprint-3d/index.html
```

Then look at the screenshot — and click through all seven stages.
