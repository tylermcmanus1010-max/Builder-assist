# BlueprintIR v0.1 to ProjectModel v2 Mapping

BlueprintIR is the immutable, source-oriented extraction record. ProjectModel is the canonical mutable project state. The vector-PDF adapter creates BlueprintIR only after the uploaded source has a persisted document and sheet identity. `reconcileBlueprintIR` is the sole transition into downstream workspaces.

| BlueprintIR v0.1 | ProjectModel v2 | Identity and behavior |
| --- | --- | --- |
| `sourceDocumentId` | `sourceDocuments[].documentId` | Must already be persisted; cross-project input is rejected. |
| `sheets[]` | `sheets[]` | Existing persisted sheet IDs are updated with classification and viewport membership. |
| `viewports[]` | `viewports[]` | Viewport IDs remain source/revision scoped; scale never leaks across viewports. |
| `scaleCandidates[]` | `sheets[].scaleCalibration` | Only `dimension_verified` candidates become verified calibrations. |
| `organizedNotes[]` | `organizedNotes[]` | Original text and bounds are preserved; review remains required. |
| `geometryCandidates[]` | `geometry2D[]` and `buildingElements[]` | Stable geometry IDs generate deterministic element IDs. Vector candidates remain preliminary. |
| wall element ID | `takeoffItems[]`, `estimateLines[]`, `modelObjects[]`, `reports[].elementIds[]` | The same element ID is used by Drawing, Takeoff, Estimate, Reports, and Three.js selection identity. |

ProjectModel v1 records are migrated in memory to v2 by adding empty BlueprintIR, viewport, and note collections plus explicit source references for existing user-traced elements. Invalid or incompatible records remain quarantined by the existing persistence boundary.
