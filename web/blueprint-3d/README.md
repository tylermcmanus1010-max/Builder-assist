# Assistify project-specific 3D viewer

The completed approved-plan test model is available as
`approvedplans-4752-25-assistify-model.json`. When the repository is served,
choose **Load 4752-25 approved plan** to fetch, validate, and persist it in one
step. **Import project model** remains available for a downloaded or modified
copy. **Plan intelligence** reports sheet-by-sheet coverage, separates the
approved set into civil, architectural, MEP, electrical, and structural work,
and shows which sheets actually support 3D. Use the **Plan note & detail
register** to filter extracted requirements, callouts, dimensions, schedules,
calculations, and drawing text by sheet, discipline, or processing status.

## PDF import

Choose **Import plan PDF** to process a PDF entirely in the browser. Assistify
hashes the file, extracts its text layer with the vendored PDF.js runtime, and
builds a source-linked note register for review. It does not invent geometry:
dimensions, symbols, schedules, and drawing context remain unverified until a
reviewer applies them to a project model. Text-free scanned plans require OCR
before their notes can be indexed.

The exact `66thST4752-25_APPROVEDPlans_639076997322694800.pdf` file is matched
by SHA-256 to its committed reviewed model, so importing it restores the 30
source-linked geometry elements and 1,547-note register. Renamed copies work;
modified PDFs fall back to the generic review flow.

For this reviewed set, all 18 sheets are indexed but only A103, A105, and A106
currently cite physical 3D elements. Civil, ceiling/lighting, sections,
plumbing, mechanical, gas, electrical, foundation, framing, schedules, and
details remain visible as registered plan intelligence until their geometry is
reviewed and reconstructed. Assistify labels that boundary instead of treating
the floor-plan trace as a complete model.

The reviewed set also loads 104 optional **concept geometry** elements derived
from 11 sheets. These approximate site/grading lines, demolition limits,
utilities, footings, foundation walls, framing, roof members, plumbing,
mechanical, gas, electrical distribution, and ceiling lights. Concept elements
are `INFERRED`, carry a sheet citation plus a written inference basis, render as
dashed discipline-colored geometry, and can be hidden independently. They are
communication guesses—not permit, survey, coordination, fabrication, or
takeoff geometry.

PDF.js 5.6.205 is vendored under `vendor/pdfjs/` with its Apache 2.0 license.

This directory contains the reusable, feet-based Assistify construction
viewer. It intentionally ships with an **unconfigured project** and no
physical building, parcel, terrain, utility, or grading geometry. A project
model must be generated from that property's plan evidence and pass runtime
validation before it can render.

## Architecture

- `index.html` is the responsive and accessible viewer shell.
- `engine.js` owns schema enforcement, the Canvas perspective renderer,
  camera, near-plane clipping, depth sorting, interaction, twelve stage
  controls, twelve tools, provenance display, and project-scoped prototype
  persistence.
- `concept-geometry.js` adds the optional, explicitly labeled conceptual
  geometry layer for the reviewed 4752-25 plan set.
- `progress-tracker.js` stores project-scoped field progress, stage status,
  update history, crew notes, and evidence-photo references for the prototype.
- `model-schema.json` is the machine-readable project-model contract.
- `project-model.json` is the truthful empty boot model. All missing values are
  explicitly `UNVERIFIED` and `null`.

The admin portal embeds this shared viewer in an iframe. Run
`web/main-site/build-bp3d.py` after changing the integration contract; it
removes any legacy generated engine copy and keeps the portal pointed at this
directory.

## Model truth rules

- Units are feet.
- Physical geometry is accepted only in `VERIFIED` or `INFERRED` state.
- Every physical element must cite a registered source document and fact.
- Every source document requires a SHA-256 hash and page count; citations
  require a page and region.
- `UNVERIFIED` and `CONFLICT` facts use `value: null` and never compile into
  geometry.
- Unsupported geometry is omitted. The visible grid is a neutral reference
  plane, not site grade or a survey.
- GIS context is not a legal survey. Map synchronization remains disabled
  until the model supplies verified registration control.

## Exactly twelve construction stages

1. Site controls
2. Clearing & erosion control
3. Earthwork & grading
4. Underground utilities
5. Footings
6. Foundation & waterproofing
7. Slabs & flatwork
8. Floor structure
9. Wall framing & sheathing
10. Roof structure & envelope
11. MEP & insulation
12. Finishes & closeout

A stage with no supported geometry reports `UNVERIFIED` instead of drawing a
placeholder.

## Exactly twelve tools

Orbit, Pan, Zoom, Fit model, Stage filter, Play sequence, Dimensions,
Measure, Section, Inspect, Source citation, and Map / 3D sync. Tools that lack
required evidence are present but disabled with a reason.

## Persistence boundary

Imported model JSON and view state are stored in browser `localStorage` under
project-scoped, versioned keys. This is a prototype convenience only. It is
not production storage, authorization, authentication, backup, or workspace
isolation.

Field progress uses the same prototype boundary. Each construction stage can
be marked not started, in progress, blocked, needing inspection, or complete,
with a completion percentage, updater, field note, timestamp, and photo-file
reference. Progress mode colors the model gray, blue, red, yellow, or green and
rolls the twelve stages into overall completion and recent activity. Real
multi-user jobsite updates require a shared project database, authenticated
worker accounts, conflict handling, and durable evidence-photo storage.

## Verification

From the repository root, run `node tools/verify-assistify.mjs` and the
existing artifact verifier. The targeted harness covers schema rejection,
stage/tool counts, reachability, persistence, provenance, reduced motion,
keyboard operation, and the required viewport/zoom matrix.
