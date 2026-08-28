export type Point3 = [number, number, number];

export type ModelEvidence =
  | "Verified from controlling plan"
  | "Scaled from plan"
  | "Inferred from multiple plan references"
  | "Assumed for visualization"
  | "Unresolved";

export type ModelPrimitive = {
  id: string;
  label: string;
  kind: "wall" | "slab" | "surface" | "path" | "column";
  role: "parcel" | "terrain" | "excavation" | "utility" | "foundation" | "structure" | "enclosure" | "mep" | "interior" | "site";
  stage: number;
  points: Point3[];
  height?: number;
  thickness?: number;
  sourceSheet: string;
  sourceDetail: string;
  evidence: ModelEvidence;
  note?: string;
};

export type PropertyModel = {
  key: string;
  projectName: string;
  address: string;
  planCheck: string;
  revision: string;
  units: "ft";
  status: "controlled";
  summary: string;
  assumptions: string[];
  stages: Array<{ id: number; title: string; short: string; description: string; sources: string[] }>;
  primitives: ModelPrimitive[];
  dimensions: Array<{ id: string; label: string; a: Point3; b: Point3; stage: number; sourceSheet: string; evidence: ModelEvidence }>;
};

const STAGES: PropertyModel["stages"] = [
  { id: 1, title: "Parcel, survey & existing topography", short: "Parcel", description: "Plan-sourced parcel context, road relationship, existing grade and the proposed building reference.", sources: ["Civil grading & drainage plan", "A101", "A102"] },
  { id: 2, title: "Site preparation & layout", short: "Layout", description: "Limits of work, building-control layout and construction-access intent.", sources: ["Civil grading & drainage plan", "A101", "A102"] },
  { id: 3, title: "Excavation & rough grading", short: "Excavate", description: "Building-pad excavation and rough-grade relationship shown as coordination geometry.", sources: ["Civil grading & drainage plan", "S001"] },
  { id: 4, title: "Underground utilities & drainage", short: "Utilities", description: "Only plan-supported service corridors are shown; unresolved routing remains visibly flagged.", sources: ["Civil grading & drainage plan", "A108", "A109", "A110", "E002"] },
  { id: 5, title: "Footings & foundation", short: "Foundation", description: "Footing and foundation-wall geometry linked to the structural sheets.", sources: ["S001", "S003"] },
  { id: 6, title: "Slab & below-grade completion", short: "Slab", description: "Slab, base preparation and foundation-to-grade relationship.", sources: ["S001", "S003", "A108"] },
  { id: 7, title: "Structural framing", short: "Framing", description: "Exterior and interior wall runs, openings and primary vertical structure.", sources: ["A103", "A107", "S002", "S003"] },
  { id: 8, title: "Roof & exterior enclosure", short: "Enclosure", description: "Roof planes, parapets, openings and enclosure surfaces.", sources: ["A105", "A106", "A107", "S002"] },
  { id: 9, title: "MEP rough-in", short: "MEP", description: "Plan-supported system zones; fabrication routing is not invented.", sources: ["A108", "A109", "A110", "E001", "E002"] },
  { id: 10, title: "Interior construction", short: "Interior", description: "Room partitions and finish zones linked to the floor and reflected-ceiling plans.", sources: ["A103", "A104", "A106"] },
  { id: 11, title: "Exterior site completion", short: "Site finish", description: "Driveway, patios, final grading and drainage-restoration intent.", sources: ["Civil grading & drainage plan", "A102"] },
  { id: 12, title: "Final coordinated digital twin", short: "Complete", description: "The cumulative project model with every evidence state and source reference retained.", sources: ["All supplied controlling sheets"] },
];

const source = (sheet: string, detail: string, evidence: ModelEvidence) => ({ sourceSheet: sheet, sourceDetail: detail, evidence });
const wall = (id: string, label: string, a: Point3, b: Point3, stage: number, role: ModelPrimitive["role"], sheet: string, detail: string, evidence: ModelEvidence, height = 10, thickness = .5): ModelPrimitive => ({ id, label, kind: "wall", role, stage, points: [a, b], height, thickness, ...source(sheet, detail, evidence) });
const path = (id: string, label: string, points: Point3[], stage: number, role: ModelPrimitive["role"], sheet: string, detail: string, evidence: ModelEvidence, thickness = .28): ModelPrimitive => ({ id, label, kind: "path", role, stage, points, thickness, ...source(sheet, detail, evidence) });
const slab = (id: string, label: string, points: Point3[], stage: number, role: ModelPrimitive["role"], sheet: string, detail: string, evidence: ModelEvidence, thickness = .35): ModelPrimitive => ({ id, label, kind: "slab", role, stage, points, thickness, ...source(sheet, detail, evidence) });
const surface = (id: string, label: string, points: Point3[], stage: number, role: ModelPrimitive["role"], sheet: string, detail: string, evidence: ModelEvidence): ModelPrimitive => ({ id, label, kind: "surface", role, stage, points, ...source(sheet, detail, evidence) });

/*
 * The engine consumes this record; it contains no rendering code and no geometry
 * from another property. Coordinates are calibrated in feet to A103's written
 * 130'-6" × 87'-6" control dimensions. Secondary offsets are scaled from A103
 * and remain labeled as such until source CAD is available.
 */
const swenkaOutline: Point3[] = [
  [0, 0, 0], [25.75, 0, 0], [25.75, 17.5, 0], [81.6, 17.5, 0], [81.6, 12.1, 0],
  [94, 12.1, 0], [94, 17.5, 0], [107.2, 17.5, 0], [107.2, 0, 0], [123.4, 0, 0],
  [123.4, 20, 0], [130.5, 20, 0], [130.5, 66, 0], [114.1, 66, 0], [114.1, 75.6, 0],
  [100.3, 75.6, 0], [100.3, 87.5, 0], [69, 87.5, 0], [69, 67.4, 0], [25.75, 67.4, 0],
  [25.75, 87.5, 0], [0, 87.5, 0],
];

const exteriorWalls = swenkaOutline.map((point, index) => wall(
  `ext-${index + 1}`,
  `Exterior wall run ${index + 1}`,
  point,
  swenkaOutline[(index + 1) % swenkaOutline.length],
  7,
  "structure",
  "A103 / A107",
  "Exterior envelope calibrated to written overall controls; offsets scaled from the controlling floor plan.",
  "Scaled from plan",
  index === 17 ? 12 : 10,
  .5,
));

const interiorRuns: Array<[Point3, Point3, string]> = [
  [[25.75, 17.5, 0], [25.75, 67.4, 0], "Garage / bedroom-wing separation"],
  [[25.75, 38.5, 0], [81.6, 38.5, 0], "Bedroom corridor north wall"],
  [[25.75, 56.8, 0], [81.6, 56.8, 0], "Bedroom corridor south wall"],
  [[38.6, 38.5, 0], [38.6, 67.4, 0], "Bedroom / bath partition"],
  [[51.5, 38.5, 0], [51.5, 67.4, 0], "Bedroom partition"],
  [[64.3, 38.5, 0], [64.3, 67.4, 0], "Bedroom partition"],
  [[81.6, 17.5, 0], [81.6, 67.4, 0], "Entry / great-room control wall"],
  [[94, 17.5, 0], [94, 66, 0], "Office / primary-suite control wall"],
  [[107.2, 17.5, 0], [107.2, 66, 0], "Primary-suite center partition"],
  [[114.1, 39.5, 0], [130.5, 39.5, 0], "Primary bedroom / closet partition"],
  [[100.3, 66, 0], [114.1, 66, 0], "Primary bath / closet partition"],
  [[69, 57.8, 0], [81.6, 57.8, 0], "Pantry / powder-room partition"],
  [[0, 36.3, 0], [25.75, 36.3, 0], "Garage / laundry wall"],
  [[0, 67.4, 0], [25.75, 67.4, 0], "Laundry / game-room wall"],
];

const interiorWalls = interiorRuns.map(([a, b, label], index) => wall(
  `int-${index + 1}`, label, a, b, 10, "interior", "A103 / A104", "Partition run scaled from the floor and reflected-ceiling plans.", "Scaled from plan", 10, .34,
));

const foundationWalls = swenkaOutline.map((point, index) => wall(
  `fdn-${index + 1}`,
  `Foundation wall run ${index + 1}`,
  [point[0], point[1], -1.7],
  [swenkaOutline[(index + 1) % swenkaOutline.length][0], swenkaOutline[(index + 1) % swenkaOutline.length][1], -1.7],
  5,
  "foundation",
  "S001 / S003",
  "Foundation perimeter coordinated to the architectural envelope; individual footing schedule assignments remain sheet-controlled.",
  "Inferred from multiple plan references",
  1.7,
  .85,
));

const SWENKA_MODEL: PropertyModel = {
  key: "swenka-4752-25",
  projectName: "Swenka Residence",
  address: "12228 N 66th St, Scottsdale, AZ 85254",
  planCheck: "4752-25",
  revision: "Approved 2026-02-19",
  units: "ft",
  status: "controlled",
  summary: "Project-specific plan reader calibrated to A103 and coordinated with the supplied architectural, structural, civil and MEP sheets.",
  assumptions: [
    "Written A103 overall dimensions control the model axes; secondary offsets are scaled from the sheet image.",
    "Parcel and road geometry remain plan-sourced until authoritative cadastral geometry resolves the APN conflict.",
    "MEP paths show coordination corridors only where fabrication routing is not documented.",
    "This browser model is for plan coordination and sequencing, not construction staking or fabrication.",
  ],
  stages: STAGES,
  primitives: [
    path("parcel", "Plan-sourced subject parcel", [[-26, -22, -.15], [157, -22, -.15], [162, 116, -.15], [-28, 118, -.15], [-26, -22, -.15]], 1, "parcel", "Civil grading & drainage plan", "Subject parcel diagram; official cadastral reconciliation remains pending.", "Unresolved", .45),
    ...Array.from({ length: 9 }, (_, index) => path(`contour-${index + 1}`, `Existing contour ${index + 1}`, [[-24, -10 + index * 15, -.35 + index * .06], [35, -12 + index * 15, -.22 + index * .06], [92, -7 + index * 15, -.08 + index * .06], [159, -11 + index * 15, .04 + index * .06]], 1, "terrain", "Civil grading & drainage plan", "Existing contour line interpolated between plotted plan controls.", "Scaled from plan", .18)),
    path("layout-envelope", "A103 building control envelope", [[0, 0, .05], [130.5, 0, .05], [130.5, 87.5, .05], [0, 87.5, .05], [0, 0, .05]], 2, "site", "A103", "Written overall control: 130'-6\" × 87'-6\".", "Verified from controlling plan", .24),
    slab("excavation", "Building-pad excavation", swenkaOutline.map(([x, y]) => [x, y, -2.05] as Point3), 3, "excavation", "Civil grading & drainage plan / S001", "Excavation visualization follows the project envelope; exact cut/fill requires survey TIN reconciliation.", "Inferred from multiple plan references", .25),
    path("water-zone", "Water-service coordination zone", [[-15, 42, -1.2], [8, 42, -1.2], [42, 43, -1.2], [74, 48, -1.2]], 4, "utility", "A108 / Civil", "Service corridor only; installed route and depth are unresolved.", "Inferred from multiple plan references", .38),
    path("sanitary-zone", "Sanitary coordination zone", [[-15, 48, -1.55], [16, 48, -1.55], [51, 50, -1.55], [73, 54, -1.55]], 4, "utility", "A108 / Civil", "Service corridor only; installed route and depth are unresolved.", "Inferred from multiple plan references", .46),
    path("electrical-zone", "Electrical-service coordination zone", [[147, 34, -1], [124, 34, -1], [106, 45, -1]], 4, "utility", "E002 / Civil", "Service entry zone only; conduit routing is not shown as fabrication geometry.", "Inferred from multiple plan references", .32),
    ...foundationWalls,
    slab("house-slab", "Main slab-on-grade", swenkaOutline.map(([x, y]) => [x, y, 0] as Point3), 6, "foundation", "S001 / S003", "Slab outline coordinated to the architectural envelope.", "Inferred from multiple plan references", .42),
    slab("garage-slab", "Garage slab", [[0, 0, .05], [25.75, 0, .05], [25.75, 36.3, .05], [0, 36.3, .05]], 6, "foundation", "S001 / A103", "Garage slab area scaled from A103 and coordinated to the structural foundation plan.", "Scaled from plan", .48),
    ...exteriorWalls,
    wall("garage-opening-1", "Garage door opening 1", [2.4, .02, .35], [11.6, .02, .35], 7, "structure", "A103 / A106", "Overhead-door opening from the architectural plan and elevation.", "Scaled from plan", 8, .18),
    wall("garage-opening-2", "Garage door opening 2", [14.1, .02, .35], [23.3, .02, .35], 7, "structure", "A103 / A106", "Overhead-door opening from the architectural plan and elevation.", "Scaled from plan", 8, .18),
    ...interiorWalls,
    surface("roof-west", "West roof plane", [[-1, -1, 10.15], [70, -1, 10.15], [70, 68, 12.15], [-1, 88.5, 12.15]], 8, "enclosure", "A105 / A107 / S002", "Roof plane coordinated to the roof plan, elevations and framing plan.", "Scaled from plan"),
    surface("roof-east", "East roof plane", [[68, 11, 12.15], [131.5, 11, 12.15], [131.5, 76, 14.05], [99, 88.5, 14.05], [68, 88.5, 12.15]], 8, "enclosure", "A105 / A107 / S002", "Roof and parapet geometry coordinated to the plan controls.", "Scaled from plan"),
    wall("parapet-west", "West parapet", [0, 87.5, 10], [69, 87.5, 10], 8, "enclosure", "A105 / A107", "Parapet control from architectural roof plan and elevations.", "Scaled from plan", 2, .35),
    wall("parapet-east", "Primary-suite parapet", [100.3, 87.5, 10], [130.5, 66, 10], 8, "enclosure", "A105 / A107", "14'-0\" parapet control retained at the primary suite.", "Verified from controlling plan", 4, .35),
    path("plumbing-main", "Plumbing rough-in zone", [[8, 58, 2.3], [36, 50, 2.3], [72, 52, 2.3], [104, 57, 2.3]], 9, "mep", "A108 / A109", "Plan-supported wet-wall coordination path; detailed branch routing is not modeled.", "Inferred from multiple plan references", .22),
    path("hvac-main", "HVAC distribution zone", [[25, 47, 8.2], [58, 47, 8.2], [86, 47, 9.2], [118, 50, 9.2]], 9, "mep", "A110", "Mechanical distribution zone; fabrication routing is not shown.", "Assumed for visualization", .24),
    path("electrical-main", "Electrical distribution zone", [[18, 43, 7.6], [47, 43, 7.6], [79, 43, 8.4], [112, 43, 8.4]], 9, "mep", "E001 / E002", "Circuit distribution zone; conductor routing is not fabrication geometry.", "Assumed for visualization", .18),
    slab("interior-finish-zone", "Interior finish floor zones", swenkaOutline.map(([x, y]) => [x, y, .48] as Point3), 10, "interior", "A103 / A104 / A106", "Finish-zone surface linked to the architectural room plan.", "Scaled from plan", .08),
    slab("driveway", "Driveway and garage approach", [[-18, -22, -.05], [34, -22, -.05], [30, 0, -.05], [-8, 0, -.05]], 11, "site", "Civil grading & drainage plan / A102", "Driveway geometry scaled from the site plans.", "Scaled from plan", .16),
    slab("covered-patio", "Covered patio", [[100, 66, .05], [130.5, 66, .05], [130.5, 87.5, .05], [100, 87.5, .05]], 11, "site", "A102 / A103", "Covered-patio footprint coordinated to the architectural plans.", "Scaled from plan", .14),
  ],
  dimensions: [
    { id: "overall-x", label: "130′-6″ OVERALL", a: [0, -7, 0], b: [130.5, -7, 0], stage: 2, sourceSheet: "A103", evidence: "Verified from controlling plan" },
    { id: "overall-y", label: "87′-6″ OVERALL", a: [-7, 0, 0], b: [-7, 87.5, 0], stage: 2, sourceSheet: "A103", evidence: "Verified from controlling plan" },
    { id: "garage", label: "25′-9″ GARAGE", a: [0, -3.5, .2], b: [25.75, -3.5, .2], stage: 6, sourceSheet: "A103", evidence: "Verified from controlling plan" },
    { id: "ceiling-low", label: "10′-0″ CEILING", a: [69, 75, 0], b: [69, 75, 10], stage: 7, sourceSheet: "A107", evidence: "Verified from controlling plan" },
    { id: "parapet", label: "14′-0″ PARAPET", a: [100.3, 82, 0], b: [100.3, 82, 14], stage: 8, sourceSheet: "A107", evidence: "Verified from controlling plan" },
  ],
};

const PROPERTY_MODELS: Record<string, PropertyModel> = {
  [SWENKA_MODEL.key]: SWENKA_MODEL,
};

export function getPropertyModel(key: string | null | undefined) {
  return key ? PROPERTY_MODELS[key] || null : null;
}
