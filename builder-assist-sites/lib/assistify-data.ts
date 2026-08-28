export type EvidenceState =
  | "Verified from controlling plan"
  | "Verified from authoritative parcel source"
  | "Scaled from plan"
  | "Inferred from multiple plan references"
  | "Assumed for visualization"
  | "Unresolved"
  | "Not shown in supplied documents";

export type ModelObjectRecord = {
  id: string;
  name: string;
  type: string;
  discipline: string;
  layer: string;
  stage: number;
  sourceSheet: string;
  sourceDetail: string;
  sourceRevision: string;
  sourceDimension: string;
  sourceElevation: string;
  confidence: EvidenceState;
  ambiguity: string;
};

export const PROJECT_CONTROL = {
  projectName: "Swenka Residence",
  planCheck: "4752-25",
  address: "12228 N 66th St, Scottsdale, AZ 85254",
  controllingApprovalDate: "2026-02-19",
  subjectParcelDisplay: "175-08-001B",
  parcelConflict: "The civil site-data block also lists 175-08-001A. Official cadastral reconciliation is pending.",
  planLotAreas: ["31,350 sf (architectural site plan)", "37,221 sf / 0.8542 ac (civil grading plan)"],
  road: "N 66th Street",
  modelUnits: "US survey feet",
} as const;

export const CONSTRUCTION_STAGES = [
  { id: 1, title: "Parcel, survey & existing topography", short: "Parcel", description: "Plan-sourced parcel diagram, neighboring APNs, N 66th Street, existing contours and the proposed footprint reference.", sources: ["Civil grading & drainage plan", "A101", "A102"] },
  { id: 2, title: "Site preparation & layout", short: "Layout", description: "Construction access, erosion-control intent, staging and building-control layout.", sources: ["Civil grading & drainage plan", "A101", "A102"] },
  { id: 3, title: "Excavation & rough grading", short: "Excavate", description: "Building-pad excavation, cut/fill visualization and rough-grade relationship.", sources: ["Civil grading & drainage plan", "S001"] },
  { id: 4, title: "Underground utilities & drainage", short: "Utilities", description: "Plan-supported service corridors and drainage; routes not shown in the set remain explicitly unresolved.", sources: ["Civil grading & drainage plan", "A108", "A109", "A110", "E002"] },
  { id: 5, title: "Footings & foundation", short: "Foundation", description: "Footing zones, foundation walls, waterproofing intent and foundation drainage.", sources: ["S001", "S003"] },
  { id: 6, title: "Slab & below-grade completion", short: "Slab", description: "Base preparation, vapor control, reinforcement, slab, sleeves and backfill.", sources: ["S001", "S003", "A108"] },
  { id: 7, title: "Structural framing", short: "Framing", description: "Walls, beams, headers and roof-support framing inside the plan-controlled envelope.", sources: ["A103", "A107", "S002", "S003"] },
  { id: 8, title: "Roof & exterior enclosure", short: "Enclosure", description: "Roof massing, exterior walls, openings and weather enclosure.", sources: ["A105", "A106", "A107", "S002"] },
  { id: 9, title: "MEP rough-in", short: "MEP", description: "Plan-supported system zones only; detailed routing is not invented where coordination drawings are absent.", sources: ["A108", "A109", "A110", "E001", "E002"] },
  { id: 10, title: "Interior construction", short: "Interior", description: "Interior partitions and finish zones linked to the architectural floor and reflected-ceiling plans.", sources: ["A103", "A104", "A106"] },
  { id: 11, title: "Exterior site completion", short: "Site finish", description: "Final grading, driveway, drainage restoration and exterior site completion.", sources: ["Civil grading & drainage plan", "A102"] },
  { id: 12, title: "Final coordinated digital twin", short: "Complete", description: "Cumulative building, site, terrain, underground and evidence layers with unresolved items still visible.", sources: ["All 18 supplied sheets"] },
] as const;

export const MODEL_OBJECTS: ModelObjectRecord[] = [
  { id: "parcel-subject-diagram", name: "Subject parcel diagram", type: "Parcel", discipline: "Civil / cadastral", layer: "Parcel", stage: 1, sourceSheet: "Civil grading & drainage plan", sourceDetail: "Lot 1, Desert Estates Unit Four; APN title block and site-data block", sourceRevision: "Approved 2026-02-19", sourceDimension: "Boundary geometry scaled from 1\" = 20' plan; official GIS geometry pending", sourceElevation: "N/A", confidence: "Scaled from plan", ambiguity: "APN conflict: title block 175-08-001B; site data also lists 175-08-001A. Not a legal survey representation." },
  { id: "road-frontage-candidate", name: "Candidate N 66th Street frontage", type: "Road frontage", discipline: "Civil / cadastral", layer: "Road frontage", stage: 1, sourceSheet: "Civil grading & drainage plan", sourceDetail: "East/southeast parcel edge adjoining N 66th Street right-of-way", sourceRevision: "Approved 2026-02-19", sourceDimension: "Frontage length unresolved", sourceElevation: "Existing grade approximately 1389–1391 ft from plotted contours", confidence: "Unresolved", ambiguity: "Official parcel/ROW intersection has not been retrieved; this is not a verified legal frontage line." },
  { id: "existing-terrain", name: "Existing-grade surface", type: "Terrain", discipline: "Civil", layer: "Existing terrain", stage: 1, sourceSheet: "Civil grading & drainage plan", sourceDetail: "Existing contours and Sections A-A / B-B", sourceRevision: "Civil date 2025-06-12; approved 2026-02-19", sourceDimension: "Horizontal scale 1\" = 20'; vertical section scale 1\" = 2'", sourceElevation: "Plotted range approximately 1388–1392 ft NAVD88", confidence: "Scaled from plan", ambiguity: "Browser mesh is an interpolation for inspection; it is not a survey TIN." },
  { id: "proposed-pad", name: "Proposed building pad", type: "Grading", discipline: "Civil", layer: "Proposed grade", stage: 3, sourceSheet: "Civil grading & drainage plan", sourceDetail: "Pad and lowest-floor callouts", sourceRevision: "Approved 2026-02-19", sourceDimension: "Building control envelope 130'-6\" × 87'-6\" from A103", sourceElevation: "PAD 1390.33 ft; LF88 1391.00 ft", confidence: "Verified from controlling plan", ambiguity: "The control envelope is not the irregular finished footprint." },
  { id: "underground-service-zones", name: "Underground service zones", type: "Utilities", discipline: "Civil / MEP", layer: "Underground", stage: 4, sourceSheet: "Civil, A108, A109, A110, E002", sourceDetail: "Meters, service intent and building entry zones", sourceRevision: "Approved 2026-02-19", sourceDimension: "Detailed route/depth not shown", sourceElevation: "Depth unresolved", confidence: "Inferred from multiple plan references", ambiguity: "Displayed corridors are coordination zones, not verified installed routing." },
  { id: "foundation-system", name: "Footings and foundation walls", type: "Foundation", discipline: "Structural", layer: "Foundation", stage: 5, sourceSheet: "S001 / S003", sourceDetail: "Foundation plan, footing schedule and details", sourceRevision: "Approved 2026-02-19", sourceDimension: "F1–F6 schedule: 24–54 in square footings; monolithic footing 1'-4\" min where called out", sourceElevation: "Relative to FFE 0'-0\"; civil LF88 1391.00 ft", confidence: "Verified from controlling plan", ambiguity: "Browser geometry groups footing zones; individual schedule assignments require object-by-object digitization." },
  { id: "slab", name: "Slab-on-grade", type: "Slab", discipline: "Structural", layer: "Slab", stage: 6, sourceSheet: "S001 / S003", sourceDetail: "Foundation plan and slab details", sourceRevision: "Approved 2026-02-19", sourceDimension: "Within scaled architectural footprint", sourceElevation: "FFE 0'-0\" / LF88 1391.00 ft", confidence: "Inferred from multiple plan references", ambiguity: "Irregular slab outline is scaled; explicit control dimensions are retained separately." },
  { id: "wall-envelope", name: "Architectural wall envelope", type: "Walls", discipline: "Architectural", layer: "Structure", stage: 7, sourceSheet: "A103 / A107", sourceDetail: "Floor plan and building sections", sourceRevision: "Approved 2026-02-19", sourceDimension: "Overall control dimensions 130'-6\" × 87'-6\"", sourceElevation: "Ceiling controls 10'-0\" and 12'-0\"", confidence: "Scaled from plan", ambiguity: "Simplified browser wall geometry is not a fabrication model." },
  { id: "roof-massing", name: "Roof and parapet massing", type: "Roof", discipline: "Architectural / structural", layer: "Enclosure", stage: 8, sourceSheet: "A105 / A106 / A107 / S002", sourceDetail: "Roof plan, elevations, sections and framing plan", sourceRevision: "Approved 2026-02-19", sourceDimension: "Roof geometry scaled from plan", sourceElevation: "Parapet control 14'-0\"", confidence: "Scaled from plan", ambiguity: "Detailed drainage falls and structural members are not individually modeled." },
  { id: "mep-zones", name: "MEP coordination zones", type: "MEP", discipline: "MEP", layer: "MEP", stage: 9, sourceSheet: "A108 / A109 / A110 / E001 / E002", sourceDetail: "Plumbing, mechanical, gas and electrical plans", sourceRevision: "Approved 2026-02-19", sourceDimension: "System zones only", sourceElevation: "Routing elevations not shown", confidence: "Assumed for visualization", ambiguity: "Not coordinated fabrication routing; inspect source sheets before field use." },
  { id: "interior-partitions", name: "Interior partition zones", type: "Partitions", discipline: "Architectural", layer: "Interior", stage: 10, sourceSheet: "A103 / A104", sourceDetail: "Floor and reflected-ceiling plans", sourceRevision: "Approved 2026-02-19", sourceDimension: "Scaled from plans", sourceElevation: "10'-0\" / 12'-0\" ceiling controls", confidence: "Scaled from plan", ambiguity: "Room-level selection is not yet a fabrication model." },
  { id: "final-site", name: "Final site and driveway", type: "Sitework", discipline: "Civil / architectural", layer: "Site finish", stage: 11, sourceSheet: "Civil grading & drainage plan / A102", sourceDetail: "Proposed driveway, hardscape and finish grading", sourceRevision: "Approved 2026-02-19", sourceDimension: "Driveway callouts shown on civil plan", sourceElevation: "Proposed contours and spot elevations", confidence: "Scaled from plan", ambiguity: "Landscape design is not shown in the supplied set." },
];

export const DIMENSION_VERIFICATION = [
  { element: "Architectural plan control envelope", sourceSheet: "A103", sourceValue: "130'-6\" × 87'-6\"", modelValue: "130'-6\" × 87'-6\"", difference: "0 in at explicit controls", precision: "Written dimensions", status: "PASS", resolution: "Used as model calibration axes; not represented as a rectangular footprint." },
  { element: "Lowest floor", sourceSheet: "Civil grading & drainage plan", sourceValue: "1391.00 ft NAVD88", modelValue: "1391.00 ft model datum", difference: "0.00 ft", precision: "0.01 ft plan callout", status: "PASS", resolution: "Stored as the FFE datum." },
  { element: "Building pad", sourceSheet: "Civil grading & drainage plan", sourceValue: "1390.33 ft", modelValue: "1390.33 ft model datum", difference: "0.00 ft", precision: "0.01 ft plan callout", status: "PASS", resolution: "Stored as proposed-pad datum." },
  { element: "Low ceiling control", sourceSheet: "A107", sourceValue: "10'-0\"", modelValue: "10'-0\"", difference: "0 in", precision: "Written elevation", status: "PASS", resolution: "Used by simplified wall zones." },
  { element: "High ceiling control", sourceSheet: "A107", sourceValue: "12'-0\"", modelValue: "12'-0\"", difference: "0 in", precision: "Written elevation", status: "PASS", resolution: "Used by simplified wall zones." },
  { element: "Parapet control", sourceSheet: "A107", sourceValue: "14'-0\"", modelValue: "14'-0\"", difference: "0 in", precision: "Written elevation", status: "PASS", resolution: "Used by roof massing." },
  { element: "Irregular finished footprint", sourceSheet: "A103 / A102", sourceValue: "Plan geometry", modelValue: "Scaled browser geometry", difference: "Not fully verified", precision: "Scaled", status: "UNVERIFIED", resolution: "Requires calibrated vector digitization or source CAD before field-dimensional use." },
  { element: "Legal parcel boundary", sourceSheet: "Recorded plat / official cadastral GIS", sourceValue: "Not retrieved", modelValue: "Plan-scaled diagram", difference: "Not comparable", precision: "Unverified", status: "UNVERIFIED", resolution: "Retrieve authoritative geometry and reconcile APN conflict." },
] as const;

export const ADJACENT_PLAN_APNS = ["175-65-032", "175-08-008", "175-08-002A", "175-08-002B"] as const;
