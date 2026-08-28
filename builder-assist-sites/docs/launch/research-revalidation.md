# Research revalidation and saturation log

Access date: 2026-08-27

## Revalidation sample

Twenty-five qualifying records were reopened after the candidate set was
assembled. The sample was stratified exactly as required. All 25 remained
accessible, relevant, correctly classified, and consistent with the recorded
finding. No sampled source was removed.

### Direct user evidence (5)

1. Trimble mobile empty-model thread — confirmed a blank mobile viewer that
   persisted after refresh and a recovery control hidden in an overflowing
   toolbar. The user explicitly said the workaround was not acceptable for
   stakeholders.
2. Speckle slow-viewer thread — confirmed 1.6 GB memory use and freezes on a
   2,481-element model caused by excessive tessellation and subpixel geometry.
3. xeokit issue 1942 — confirmed section-plane pointer picking causes severe
   interaction degradation, with reproducible ARCHI and MEP steps.
4. Speckle issue 5735 — confirmed object-property results can fragment a single
   Revit parameter into misleading duplicate property records.
5. Estimator AI-takeoff discussion — confirmed strong first-person distrust of
   one-click AI takeoffs, several costly error anecdotes, and opposing evidence
   that AI is useful for document interrogation and human-reviewed verification.

### Official sources (5)

1. Procore drawing-revision comparison — confirmed per-sheet and set comparison,
   permissions, mobile support, and a failure condition for differently sized
   drawings.
2. Fieldwire plan upload — confirmed multi-file and multi-page PDF upload,
   visible processing, permissions, OCR confirmation, conflict resolution,
   revision history, and recovery from ordinary deletion.
3. Trimble clipping planes — confirmed a dedicated interactive clipping-plane
   workflow rather than a decorative cutaway toggle.
4. Maricopa County parcel service metadata — confirmed an official, queryable
   parcel feature service and its spatial-reference metadata; it does not make
   the boundary a legal survey.
5. Three.js cleanup guidance — confirmed that textures, geometries, and materials
   require explicit disposal to avoid long-session GPU/memory leaks.

### Research and standards (5)

1. WCAG reflow understanding — confirmed that maps and editing canvases may need
   two-dimensional layout, but surrounding content and individual panels still
   need reflow and bounded internal scrolling.
2. WCAG focus-not-obscured understanding — confirmed fixed viewer controls must
   not cover the currently focused control.
3. ARIA toolbar pattern — confirmed one logical toolbar name and managed keyboard
   navigation for dense related controls.
4. ITcon 2026 BIM research — confirmed web-based model access needs information
   linkage and field-use evaluation, not geometry alone.
5. Frontiers BIM-to-digital-twin review — confirmed that a twin requires
   lifecycle data exchange and is not synonymous with a static BIM model.

### Security, failure, and incident evidence (5)

1. OWASP file upload — confirmed allowlisted extensions, signature and MIME
   checks, generated storage names, size limits, authorization, non-webroot
   storage, and CSRF protection as defense in depth.
2. OWASP authorization — confirmed deny-by-default, per-request checks, opaque
   identifiers, safe failure, logging, and authorization regression tests.
3. Cloudflare December 2025 outage — confirmed dependency failures need visible
   status, bounded failure domains, and operator evidence rather than silent
   client retry loops.
4. GitHub August 17 outage — confirmed recovery work must address both incident
   symptoms and the organizational/technical conditions that allowed recurrence.
5. AWS idempotent API guidance — confirmed client-supplied intent identifiers and
   stored results are safer than guessing whether repeated requests are retries.

### Comparison, case-study, and engineering evidence (5)

1. Pomerleau/ASCE digital-twin case study — confirmed a practical twin links BIM,
   GIS, live site sensing, intent/status comparison, and decision feedback; it
   also records interoperability, setup-cost, and training limitations.
2. ENR Durham tower case — confirmed automated progress evidence is valuable only
   when it remains connected to project coordination and review.
3. EPIC field BIM-viewer research — confirmed field viewers need adaptive,
   collaborative, open information access across heterogeneous roles and devices.
4. Pan Borneo Highway case — confirmed GIS/BIM spatial context can support major
   delivery decisions, but reported savings remain case-specific evidence.
5. MDN WebGL best practices — confirmed conservative GPU limits, explicit context
   loss handling, batching, and bounded pixel ratio are required for reliable
   browser 3D.

## Additional recency verification

Four additional recent direct-user sources were reopened to retain exact dates:

- Speckle all-model load failure: 2026-07-10.
- Speckle model loader stuck: 2026-05-19.
- xeokit large-model performance issue: 2025-09-18.
- web-ifc large MEP/WASM memory failure: 2026-05-19.

## Saturation review

The last 25 qualifying records in the ledger are the independent comparisons and
case studies numbered 11–35 in that quota. They were inspected for new P0/P1
risks, new high-impact needs, recurring complaint categories, accessibility
barriers, and unresolved contradictions.

Result: **saturation reached for the current launch scope**. The final 25 added
corroboration for information integration, field usability, provenance,
coordinate consistency, 4D object/task linkage, and implementation cost. They
did not introduce a new launch-blocking category beyond the already registered
P1s: false digital-twin claims, unsourced parcel/model values, unreliable upload
transactions, weak authorization, inaccessible viewer controls, and invisible
failure or recovery state.

This saturation result does not certify the product. It only closes the research
discovery gate; implementation and verification gates remain independent.
