export const PROJECT_MODEL_SCHEMA_VERSION = 1 as const;

export type LengthUnit = "ft" | "m";
export type ReviewStatus = "requires_review" | "approved" | "rejected";
export type ProjectModelStatus = "awaiting_scale" | "geometry_review" | "ready";
export type Point2 = { x: number; y: number };

export type SourceDocument = {
  documentId: string;
  projectId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  lifecycleStatus: "persisted";
  sheetIds: string[];
};

export type Sheet = {
  sheetId: string;
  projectId: string;
  sourceDocumentId: string;
  revisionId: string;
  title: string;
  scaleCalibration: null | {
    status: "verified";
    drawingDistance: number;
    realDistance: number;
    units: LengthUnit;
    calibratedAt: string;
    calibratedBy: "user";
  };
};

export type Geometry2D = {
  geometryId: string;
  elementId: string;
  projectId: string;
  revisionId: string;
  sheetId: string;
  kind: "wall_centerline" | "opening" | "room" | "boundary";
  points: Point2[];
  units: LengthUnit;
  provenance: "user_trace" | "document_extraction";
};

export type BuildingElement = {
  elementId: string;
  projectId: string;
  revisionId: string;
  sheetId: string;
  sourceGeometryId: string;
  category: "wall" | "opening" | "room" | "boundary";
  levelId: string;
  geometry: { kind: "centerline"; start: Point2; end: Point2 };
  dimensions: { length: number; height?: number; thickness?: number };
  units: LengthUnit;
  extractionMethod: "user_trace" | "document_extraction";
  confidence: number;
  assumptions: string[];
  reviewStatus: ReviewStatus;
};

export type ProjectModel = {
  schemaVersion: typeof PROJECT_MODEL_SCHEMA_VERSION;
  modelVersion: number;
  status: ProjectModelStatus;
  projectId: string;
  activeRevisionId: string;
  sourceDocuments: SourceDocument[];
  sheets: Sheet[];
  levels: Array<{ levelId: string; projectId: string; revisionId: string; name: string; elevation: number; units: LengthUnit; reviewStatus: ReviewStatus }>;
  geometry2D: Geometry2D[];
  buildingElements: BuildingElement[];
  takeoffItems: Array<{ takeoffItemId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; category: string; quantity: number; units: LengthUnit; modelVersion: number }>;
  estimateLines: Array<{ estimateLineId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; description: string; quantity: number; units: LengthUnit; unitCostCents: null; modelVersion: number; reviewStatus: ReviewStatus }>;
  modelObjects: Array<{ modelObjectId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; category: string; modelVersion: number; reviewStatus: ReviewStatus }>;
  issues: Array<{ issueId: string; projectId: string; revisionId: string; elementId?: string; kind: "review" | "rfi"; title: string; status: "open" | "closed"; reason: string }>;
  revisionSets: Array<{ revisionId: string; projectId: string; sourceDocumentIds: string[]; status: "active" | "superseded" }>;
  reports: Array<{ reportId: string; projectId: string; revisionId: string; modelVersion: number; elementIds: string[]; status: "draft" | "issued" }>;
};

export class ProjectModelValidationError extends Error {}

function requiredId(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)) throw new ProjectModelValidationError(`${field} is invalid.`);
}

function finitePositive(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new ProjectModelValidationError(`${field} must be a positive finite number.`);
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function stableElementId(projectId: string, revisionId: string, sheetId: string, sourceGeometryId: string) {
  return `elm_${stableHash([projectId, revisionId, sheetId, sourceGeometryId].join("|"))}`;
}

export function createProjectModel(projectId: string, revisionId: string, sourceDocuments: SourceDocument[]): ProjectModel {
  requiredId(projectId, "projectId");
  requiredId(revisionId, "activeRevisionId");
  const sheets = sourceDocuments.map((document, index) => ({
    sheetId: `sht_${stableHash(`${revisionId}|${document.documentId}|${index}`)}`,
    projectId, sourceDocumentId: document.documentId, revisionId, title: document.filename, scaleCalibration: null,
  }));
  return validateProjectModel({
    schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    modelVersion: 1,
    status: "awaiting_scale",
    projectId,
    activeRevisionId: revisionId,
    sourceDocuments: sourceDocuments.map((document, index) => ({ ...document, sheetIds: [sheets[index].sheetId] })),
    sheets,
    levels: [], geometry2D: [], buildingElements: [], takeoffItems: [], estimateLines: [], modelObjects: [],
    issues: [{ issueId: `iss_${stableHash(`${projectId}|${revisionId}|scale`)}`, projectId, revisionId, kind: "review", title: "Scale calibration required", status: "open", reason: "Uploaded plans must be calibrated before geometry can be measured." }],
    revisionSets: [{ revisionId, projectId, sourceDocumentIds: sourceDocuments.map((document) => document.documentId), status: "active" }],
    reports: [],
  });
}

export function appendSourceDocuments(model: ProjectModel, documents: SourceDocument[]): ProjectModel {
  validateProjectModel(model);
  const known = new Set(model.sourceDocuments.map((document) => document.documentId));
  const additions = documents.filter((document) => !known.has(document.documentId));
  const next = structuredClone(model);
  next.modelVersion += 1;
  const sheets = additions.map((document, index) => ({
    sheetId: `sht_${stableHash(`${model.activeRevisionId}|${document.documentId}|${model.sheets.length + index}`)}`,
    projectId: model.projectId,
    sourceDocumentId: document.documentId,
    revisionId: model.activeRevisionId,
    title: document.filename,
    scaleCalibration: null,
  }));
  next.sourceDocuments.push(...additions.map((document, index) => ({ ...document, sheetIds: [sheets[index].sheetId] })));
  next.sheets.push(...sheets);
  const revision = next.revisionSets.find((item) => item.revisionId === next.activeRevisionId);
  if (revision) revision.sourceDocumentIds.push(...additions.map((document) => document.documentId));
  next.status = "awaiting_scale";
  return validateProjectModel(next);
}

export function recordScaleCalibration(model: ProjectModel, input: { sheetId: string; drawingDistance: number; realDistance: number; units: LengthUnit; calibratedAt: string }): ProjectModel {
  validateProjectModel(model);
  finitePositive(input.drawingDistance, "drawingDistance");
  finitePositive(input.realDistance, "realDistance");
  const next = structuredClone(model);
  const sheet = next.sheets.find((item) => item.sheetId === input.sheetId && item.revisionId === next.activeRevisionId);
  if (!sheet) throw new ProjectModelValidationError("sheetId does not belong to the active project revision.");
  sheet.scaleCalibration = { status: "verified", drawingDistance: input.drawingDistance, realDistance: input.realDistance, units: input.units, calibratedAt: input.calibratedAt, calibratedBy: "user" };
  next.modelVersion += 1;
  next.status = "geometry_review";
  next.issues = next.issues.filter((issue) => !(issue.kind === "review" && issue.title === "Scale calibration required"));
  return validateProjectModel(next);
}

export function traceWall(model: ProjectModel, input: { sheetId: string; sourceGeometryId: string; levelId: string; levelName?: string; levelElevation?: number; start: Point2; end: Point2; height?: number; thickness?: number }): ProjectModel {
  validateProjectModel(model);
  requiredId(input.sourceGeometryId, "sourceGeometryId");
  requiredId(input.levelId, "levelId");
  const sheet = model.sheets.find((item) => item.sheetId === input.sheetId && item.revisionId === model.activeRevisionId);
  if (!sheet) throw new ProjectModelValidationError("sheetId does not belong to the active project revision.");
  if (!sheet.scaleCalibration) throw new ProjectModelValidationError("Scale calibration is required before tracing geometry.");
  const rawLength = Math.hypot(input.end.x - input.start.x, input.end.y - input.start.y);
  finitePositive(rawLength, "wall length");
  if (input.height !== undefined) finitePositive(input.height, "height");
  if (input.thickness !== undefined) finitePositive(input.thickness, "thickness");
  const existingLevel = model.levels.find((level) => level.levelId === input.levelId && level.revisionId === model.activeRevisionId);
  if (!existingLevel && (typeof input.levelName !== "string" || !input.levelName.trim() || typeof input.levelElevation !== "number" || !Number.isFinite(input.levelElevation))) {
    throw new ProjectModelValidationError("A traced wall must reference an existing level or include an explicit level name and elevation.");
  }
  const scaleFactor = sheet.scaleCalibration.realDistance / sheet.scaleCalibration.drawingDistance;
  const length = rawLength * scaleFactor;
  const normalizedStart = { x: input.start.x * scaleFactor, y: input.start.y * scaleFactor };
  const normalizedEnd = { x: input.end.x * scaleFactor, y: input.end.y * scaleFactor };
  const elementId = stableElementId(model.projectId, model.activeRevisionId, input.sheetId, input.sourceGeometryId);
  if (model.buildingElements.some((element) => element.elementId === elementId)) throw new ProjectModelValidationError("This source geometry already has a building element.");
  const assumptions = [] as string[];
  if (input.height === undefined) assumptions.push("Wall height is missing; no 3D mesh is generated until reviewed.");
  if (input.thickness === undefined) assumptions.push("Wall thickness is missing; no 3D mesh is generated until reviewed.");
  const reviewStatus: ReviewStatus = assumptions.length ? "requires_review" : "approved";
  const nextVersion = model.modelVersion + 1;
  const next = structuredClone(model);
  next.modelVersion = nextVersion;
  if (!existingLevel) next.levels.push({ levelId: input.levelId, projectId: model.projectId, revisionId: model.activeRevisionId, name: input.levelName!.trim(), elevation: input.levelElevation!, units: sheet.scaleCalibration.units, reviewStatus: "approved" });
  next.geometry2D.push({ geometryId: input.sourceGeometryId, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sheetId: input.sheetId, kind: "wall_centerline", points: [normalizedStart, normalizedEnd], units: sheet.scaleCalibration.units, provenance: "user_trace" });
  next.buildingElements.push({ elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sheetId: input.sheetId, sourceGeometryId: input.sourceGeometryId, category: "wall", levelId: input.levelId, geometry: { kind: "centerline", start: normalizedStart, end: normalizedEnd }, dimensions: { length, height: input.height, thickness: input.thickness }, units: sheet.scaleCalibration.units, extractionMethod: "user_trace", confidence: 1, assumptions, reviewStatus });
  next.takeoffItems.push({ takeoffItemId: `tk_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, category: "wall", quantity: length, units: sheet.scaleCalibration.units, modelVersion: nextVersion });
  next.estimateLines.push({ estimateLineId: `est_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, description: "Traced wall material allowance", quantity: length, units: sheet.scaleCalibration.units, unitCostCents: null, modelVersion: nextVersion, reviewStatus: "requires_review" });
  if (reviewStatus === "approved") next.modelObjects.push({ modelObjectId: `obj_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, category: "wall", modelVersion: nextVersion, reviewStatus });
  else next.issues.push({ issueId: `iss_${elementId}`, projectId: model.projectId, revisionId: model.activeRevisionId, elementId, kind: "review", title: "3D model requires geometry review", status: "open", reason: assumptions.join(" ") });
  next.status = next.buildingElements.length > 0 && next.buildingElements.every((element) => element.reviewStatus === "approved") ? "ready" : "geometry_review";
  return validateProjectModel(next);
}

export function validateProjectModel(value: unknown): ProjectModel {
  if (!value || typeof value !== "object") throw new ProjectModelValidationError("ProjectModel must be an object.");
  const model = value as ProjectModel;
  if (model.schemaVersion !== PROJECT_MODEL_SCHEMA_VERSION) throw new ProjectModelValidationError(`Unsupported ProjectModel schema version: ${String(model.schemaVersion)}.`);
  requiredId(model.projectId, "projectId");
  requiredId(model.activeRevisionId, "activeRevisionId");
  if (!Number.isInteger(model.modelVersion) || model.modelVersion < 1) throw new ProjectModelValidationError("modelVersion must be a positive integer.");
  for (const field of ["sourceDocuments", "sheets", "levels", "geometry2D", "buildingElements", "takeoffItems", "estimateLines", "modelObjects", "issues", "revisionSets", "reports"] as const) {
    if (!Array.isArray(model[field])) throw new ProjectModelValidationError(`${field} must be an array.`);
  }
  const documentIds = new Set<string>();
  for (const document of model.sourceDocuments) {
    requiredId(document.documentId, "sourceDocuments.documentId");
    if (document.projectId !== model.projectId || document.lifecycleStatus !== "persisted") throw new ProjectModelValidationError(`Source document ${document.documentId} crosses the project boundary or is not persisted.`);
    if (documentIds.has(document.documentId)) throw new ProjectModelValidationError(`Duplicate source document: ${document.documentId}.`);
    documentIds.add(document.documentId);
  }
  for (const sheet of model.sheets) {
    requiredId(sheet.sheetId, "sheets.sheetId");
    if (sheet.projectId !== model.projectId || sheet.revisionId !== model.activeRevisionId || !documentIds.has(sheet.sourceDocumentId)) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} crosses the active project/revision or has no source document.`);
    const document = model.sourceDocuments.find((item) => item.documentId === sheet.sourceDocumentId);
    if (!document?.sheetIds.includes(sheet.sheetId)) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} is not linked by its source document.`);
  }
  const elementIds = new Set<string>();
  const sheetIds = new Set(model.sheets.filter((sheet) => sheet.revisionId === model.activeRevisionId).map((sheet) => sheet.sheetId));
  const levelIds = new Set(model.levels.filter((level) => level.revisionId === model.activeRevisionId).map((level) => level.levelId));
  const geometryIds = new Set(model.geometry2D.filter((geometry) => geometry.revisionId === model.activeRevisionId).map((geometry) => geometry.geometryId));
  for (const element of model.buildingElements) {
    for (const [field, id] of Object.entries({ elementId: element.elementId, projectId: element.projectId, revisionId: element.revisionId, sheetId: element.sheetId, sourceGeometryId: element.sourceGeometryId, levelId: element.levelId })) requiredId(id, `buildingElements.${field}`);
    if (element.projectId !== model.projectId || element.revisionId !== model.activeRevisionId) throw new ProjectModelValidationError(`Building element ${element.elementId} crosses the active project or revision boundary.`);
    if (elementIds.has(element.elementId)) throw new ProjectModelValidationError(`Duplicate elementId: ${element.elementId}.`);
    if (stableElementId(model.projectId, element.revisionId, element.sheetId, element.sourceGeometryId) !== element.elementId) throw new ProjectModelValidationError(`Building element ${element.elementId} is not derived from its stable source identity.`);
    if (!sheetIds.has(element.sheetId) || !levelIds.has(element.levelId) || !geometryIds.has(element.sourceGeometryId)) throw new ProjectModelValidationError(`Building element ${element.elementId} has a missing sheet, level, or source geometry reference.`);
    if (typeof element.confidence !== "number" || element.confidence < 0 || element.confidence > 1) throw new ProjectModelValidationError(`Building element ${element.elementId} has invalid confidence.`);
    elementIds.add(element.elementId);
  }
  for (const collection of [model.geometry2D, model.takeoffItems, model.estimateLines, model.modelObjects]) {
    for (const item of collection) if (item.elementId && !elementIds.has(item.elementId)) throw new ProjectModelValidationError(`Projection references missing elementId: ${item.elementId}.`);
  }
  return model;
}

export function parseStoredProjectModel(value: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); }
  catch { throw new ProjectModelValidationError("Stored ProjectModel JSON is malformed and was quarantined."); }
  return validateProjectModel(parsed);
}
