import { validateBlueprintIR, type BlueprintIR, type BlueprintOrganizedNote, type BlueprintViewport } from "./blueprint-ir.ts";

export const PROJECT_MODEL_SCHEMA_VERSION = 2 as const;

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
  storageKey?: string;
  sha256?: string;
  pageCount?: number;
  sheetIds: string[];
};

export type Sheet = {
  sheetId: string;
  projectId: string;
  sourceDocumentId: string;
  revisionId: string;
  title: string;
  pageNumber?: number;
  classification: BlueprintViewport["classification"];
  classificationConfidence: number;
  viewportIds: string[];
  scaleCalibration: null | {
    status: "verified";
    drawingDistance: number;
    drawingUnits: "in" | "mm" | "px";
    realDistance: number;
    units: LengthUnit;
    calibratedAt: string;
    calibratedBy: "user" | "document_extraction";
    confidence: number;
    evidence: {
      sourceDocumentId: string;
      pageNumber: number;
      description: string;
    };
  };
};

export type Geometry2D = {
  geometryId: string;
  elementId: string;
  projectId: string;
  revisionId: string;
  sourceDocumentId: string;
  sheetId: string;
  viewportId?: string;
  kind: "wall_centerline" | "opening" | "room" | "boundary";
  points: Point2[];
  units: LengthUnit;
  provenance: "user_trace" | "document_extraction";
};

export type BuildingElement = {
  elementId: string;
  projectId: string;
  revisionId: string;
  sourceDocumentId: string;
  sheetId: string;
  viewportId?: string;
  sourceGeometryId: string;
  category: "wall" | "opening" | "room" | "boundary";
  levelId: string;
  geometry: { kind: "centerline"; start: Point2; end: Point2 };
  dimensions: { length: number; height?: number; thickness?: number };
  units: LengthUnit;
  extractionMethod: "user_trace" | "document_extraction";
  evidenceClass: "user_reviewed" | "validated_vector_pdf";
  confidence: number;
  assumptions: string[];
  reviewStatus: ReviewStatus;
  reviewEvidence?: {
    reviewedAt: string;
    reviewedBy: "user";
    sourceDocumentId: string;
    pageNumber: number;
    description: string;
  };
  sourceReferences: Array<{ sourceDocumentId: string; sheetId: string; viewportId?: string; pageNumber: number; recordId: string }>;
  inferredFields: string[];
  relatedElementIds: string[];
};

export type ProjectModel = {
  schemaVersion: typeof PROJECT_MODEL_SCHEMA_VERSION;
  modelVersion: number;
  status: ProjectModelStatus;
  projectId: string;
  activeRevisionId: string;
  sourceDocuments: SourceDocument[];
  sheets: Sheet[];
  blueprintIRs: BlueprintIR[];
  viewports: BlueprintViewport[];
  levels: Array<{ levelId: string; projectId: string; revisionId: string; name: string; elevation: number; units: LengthUnit; reviewStatus: ReviewStatus }>;
  geometry2D: Geometry2D[];
  buildingElements: BuildingElement[];
  takeoffItems: Array<{ takeoffItemId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; category: string; quantity: number; units: LengthUnit; modelVersion: number }>;
  estimateLines: Array<{ estimateLineId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; description: string; quantity: number; units: LengthUnit; unitCostCents: null; modelVersion: number; reviewStatus: ReviewStatus }>;
  modelObjects: Array<{ modelObjectId: string; elementId: string; projectId: string; revisionId: string; sourceGeometryId: string; category: string; modelVersion: number; reviewStatus: ReviewStatus }>;
  issues: Array<{ issueId: string; projectId: string; revisionId: string; elementId?: string; kind: "review" | "rfi"; title: string; status: "open" | "closed"; reason: string }>;
  revisionSets: Array<{ revisionId: string; projectId: string; sourceDocumentIds: string[]; status: "active" | "superseded" }>;
  reports: Array<{ reportId: string; projectId: string; revisionId: string; sourceDocumentId?: string; modelVersion: number; elementIds: string[]; noteIds?: string[]; kind?: "blueprint_extraction"; status: "draft" | "issued" }>;
  organizedNotes: BlueprintOrganizedNote[];
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

function sheetsForDocuments(projectId: string, revisionId: string, sourceDocuments: SourceDocument[], sheetOffset = 0): Sheet[] {
  return sourceDocuments.flatMap((document, documentIndex) => Array.from({ length: Math.max(1, document.pageCount || 1) }, (_, pageIndex) => ({
    sheetId: `sht_${stableHash(`${revisionId}|${document.documentId}|${sheetOffset + documentIndex}|${pageIndex + 1}`)}`,
    projectId,
    sourceDocumentId: document.documentId,
    revisionId,
    title: document.pageCount && document.pageCount > 1 ? `${document.filename} - page ${pageIndex + 1}` : document.filename,
    pageNumber: pageIndex + 1,
    classification: "unknown",
    classificationConfidence: 0,
    viewportIds: [],
    scaleCalibration: null,
  })));
}

export function createProjectModel(projectId: string, revisionId: string, sourceDocuments: SourceDocument[]): ProjectModel {
  requiredId(projectId, "projectId");
  requiredId(revisionId, "activeRevisionId");
  const sheets = sheetsForDocuments(projectId, revisionId, sourceDocuments);
  return validateProjectModel({
    schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    modelVersion: 1,
    status: "awaiting_scale",
    projectId,
    activeRevisionId: revisionId,
    sourceDocuments: sourceDocuments.map((document) => ({ ...document, sheetIds: sheets.filter((sheet) => sheet.sourceDocumentId === document.documentId).map((sheet) => sheet.sheetId) })),
    sheets,
    blueprintIRs: [], viewports: [], organizedNotes: [],
    levels: [], geometry2D: [], buildingElements: [], takeoffItems: [], estimateLines: [], modelObjects: [],
    issues: [
      { issueId: `iss_${stableHash(`${projectId}|${revisionId}|scale`)}`, projectId, revisionId, kind: "review", title: "Scale calibration required", status: "open", reason: "Uploaded plans must be calibrated before geometry can be measured." },
      ...sourceDocuments.filter((document) => document.pageCount === undefined).map((document) => ({ issueId: `iss_${stableHash(`${projectId}|${revisionId}|${document.documentId}|pages`)}`, projectId, revisionId, kind: "review" as const, title: "Source sheet manifest requires review", status: "open" as const, reason: `Page count and sheet mapping are not yet verified for ${document.documentId}.` })),
    ],
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
  const sheets = sheetsForDocuments(model.projectId, model.activeRevisionId, additions, model.sourceDocuments.length);
  next.sourceDocuments.push(...additions.map((document) => ({ ...document, sheetIds: sheets.filter((sheet) => sheet.sourceDocumentId === document.documentId).map((sheet) => sheet.sheetId) })));
  next.sheets.push(...sheets);
  next.issues.push(...additions.filter((document) => document.pageCount === undefined).map((document) => ({ issueId: `iss_${stableHash(`${model.projectId}|${model.activeRevisionId}|${document.documentId}|pages`)}`, projectId: model.projectId, revisionId: model.activeRevisionId, kind: "review" as const, title: "Source sheet manifest requires review", status: "open" as const, reason: `Page count and sheet mapping are not yet verified for ${document.documentId}.` })));
  const revision = next.revisionSets.find((item) => item.revisionId === next.activeRevisionId);
  if (revision) revision.sourceDocumentIds.push(...additions.map((document) => document.documentId));
  next.status = "awaiting_scale";
  return validateProjectModel(next);
}

export function recordScaleCalibration(model: ProjectModel, input: { sheetId: string; drawingDistance: number; drawingUnits: "in" | "mm" | "px"; realDistance: number; units: LengthUnit; calibratedAt: string; evidence: { sourceDocumentId: string; pageNumber: number; description: string } }): ProjectModel {
  validateProjectModel(model);
  finitePositive(input.drawingDistance, "drawingDistance");
  finitePositive(input.realDistance, "realDistance");
  const next = structuredClone(model);
  const sheet = next.sheets.find((item) => item.sheetId === input.sheetId && item.revisionId === next.activeRevisionId);
  if (!sheet) throw new ProjectModelValidationError("sheetId does not belong to the active project revision.");
  if (sheet.sourceDocumentId !== input.evidence.sourceDocumentId || sheet.pageNumber !== input.evidence.pageNumber) throw new ProjectModelValidationError("Scale evidence does not identify the calibrated source sheet.");
  if (!input.evidence.description.trim()) throw new ProjectModelValidationError("Scale calibration evidence is required.");
  sheet.scaleCalibration = { status: "verified", drawingDistance: input.drawingDistance, drawingUnits: input.drawingUnits, realDistance: input.realDistance, units: input.units, calibratedAt: input.calibratedAt, calibratedBy: "user", confidence: 1, evidence: { ...input.evidence, description: input.evidence.description.trim() } };
  next.modelVersion += 1;
  next.status = "geometry_review";
  next.issues = next.issues.filter((issue) => !(issue.kind === "review" && issue.title === "Scale calibration required"));
  return validateProjectModel(next);
}

export function traceWall(model: ProjectModel, input: { elementId?: string; sheetId: string; sourceGeometryId: string; levelId: string; levelName?: string; levelElevation?: number; start: Point2; end: Point2; height?: number; thickness?: number; reviewEvidence?: { reviewedAt: string; reviewedBy: "user"; sourceDocumentId: string; pageNumber: number; description: string } }): ProjectModel {
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
  const elementId = input.elementId || stableElementId(model.projectId, model.activeRevisionId, input.sheetId, input.sourceGeometryId);
  requiredId(elementId, "elementId");
  if (model.buildingElements.some((element) => element.elementId === elementId)) throw new ProjectModelValidationError("This source geometry already has a building element.");
  const assumptions = [] as string[];
  if (input.height === undefined) assumptions.push("Wall height is missing; no 3D mesh is generated until reviewed.");
  if (input.thickness === undefined) assumptions.push("Wall thickness is missing; no 3D mesh is generated until reviewed.");
  if (input.height !== undefined && input.thickness !== undefined && !input.reviewEvidence) assumptions.push("Wall dimensions require explicit review evidence before a 3D mesh can be generated.");
  if (input.reviewEvidence && (input.reviewEvidence.sourceDocumentId !== sheet.sourceDocumentId || input.reviewEvidence.pageNumber !== sheet.pageNumber || !input.reviewEvidence.description.trim())) throw new ProjectModelValidationError("Wall review evidence does not identify the traced source sheet.");
  const reviewStatus: ReviewStatus = assumptions.length ? "requires_review" : "approved";
  const nextVersion = model.modelVersion + 1;
  const next = structuredClone(model);
  next.modelVersion = nextVersion;
  if (!existingLevel) next.levels.push({ levelId: input.levelId, projectId: model.projectId, revisionId: model.activeRevisionId, name: input.levelName!.trim(), elevation: input.levelElevation!, units: sheet.scaleCalibration.units, reviewStatus: "approved" });
  next.geometry2D.push({ geometryId: input.sourceGeometryId, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceDocumentId: sheet.sourceDocumentId, sheetId: input.sheetId, kind: "wall_centerline", points: [normalizedStart, normalizedEnd], units: sheet.scaleCalibration.units, provenance: "user_trace" });
  next.buildingElements.push({ elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceDocumentId: sheet.sourceDocumentId, sheetId: input.sheetId, sourceGeometryId: input.sourceGeometryId, category: "wall", levelId: input.levelId, geometry: { kind: "centerline", start: normalizedStart, end: normalizedEnd }, dimensions: { length, height: input.height, thickness: input.thickness }, units: sheet.scaleCalibration.units, extractionMethod: "user_trace", evidenceClass: "user_reviewed", confidence: 1, assumptions, reviewStatus, reviewEvidence: input.reviewEvidence ? { ...input.reviewEvidence, description: input.reviewEvidence.description.trim() } : undefined, sourceReferences: [{ sourceDocumentId: sheet.sourceDocumentId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber!, recordId: input.sourceGeometryId }], inferredFields: [], relatedElementIds: [] });
  next.takeoffItems.push({ takeoffItemId: `tk_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, category: "wall", quantity: length, units: sheet.scaleCalibration.units, modelVersion: nextVersion });
  next.estimateLines.push({ estimateLineId: `est_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, description: "Traced wall material allowance", quantity: length, units: sheet.scaleCalibration.units, unitCostCents: null, modelVersion: nextVersion, reviewStatus: "requires_review" });
  if (reviewStatus === "approved") next.modelObjects.push({ modelObjectId: `obj_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: input.sourceGeometryId, category: "wall", modelVersion: nextVersion, reviewStatus });
  else next.issues.push({ issueId: `iss_${elementId}`, projectId: model.projectId, revisionId: model.activeRevisionId, elementId, kind: "review", title: "3D model requires geometry review", status: "open", reason: assumptions.join(" ") });
  next.status = next.buildingElements.length > 0 && next.buildingElements.every((element) => element.reviewStatus === "approved") ? "ready" : "geometry_review";
  return validateProjectModel(next);
}

export function applyWallDimensionDefaults(model: ProjectModel, input: { height?: number; thickness?: number; appliedAt: string }): ProjectModel {
  validateProjectModel(model);
  if (input.height === undefined && input.thickness === undefined) throw new ProjectModelValidationError("Provide a wall height or thickness to apply.");
  if (input.height !== undefined) finitePositive(input.height, "height");
  if (input.thickness !== undefined) finitePositive(input.thickness, "thickness");
  const targets = model.buildingElements.filter((element) => element.category === "wall" && element.reviewStatus === "requires_review" && element.revisionId === model.activeRevisionId);
  if (!targets.length) throw new ProjectModelValidationError("There are no preliminary walls to update.");
  const next = structuredClone(model);
  next.modelVersion += 1;
  for (const element of next.buildingElements) {
    if (element.category !== "wall" || element.reviewStatus !== "requires_review" || element.revisionId !== next.activeRevisionId) continue;
    if (input.height !== undefined) {
      element.dimensions.height = input.height;
      element.assumptions = element.assumptions.filter((assumption) => !/wall height/i.test(assumption));
      element.assumptions.push(`Wall height ${input.height} ${element.units} was applied by the user to every preliminary wall and remains preliminary until the walls are confirmed.`);
    }
    if (input.thickness !== undefined) {
      element.dimensions.thickness = input.thickness;
      element.assumptions = element.assumptions.filter((assumption) => !/wall thickness/i.test(assumption));
      element.assumptions.push(`Wall thickness ${input.thickness} ${element.units} was applied by the user to every preliminary wall and remains preliminary until the walls are confirmed.`);
    }
  }
  return validateProjectModel(next);
}

export function reviewBuildingElements(model: ProjectModel, input: { elementIds?: string[]; decision: "approved" | "removed"; reviewedAt: string; description: string }): ProjectModel {
  validateProjectModel(model);
  const description = input.description.trim();
  if (!description) throw new ProjectModelValidationError("Review evidence is required.");
  const requested = input.elementIds?.length ? new Set(input.elementIds) : null;
  const targets = model.buildingElements.filter((element) => element.revisionId === model.activeRevisionId && (requested ? requested.has(element.elementId) : element.reviewStatus === "requires_review"));
  if (requested && targets.length !== requested.size) throw new ProjectModelValidationError("One or more elements to review no longer exist in the active revision.");
  if (!targets.length) throw new ProjectModelValidationError("There are no preliminary elements to review.");
  const targetIds = new Set(targets.map((element) => element.elementId));
  const next = structuredClone(model);
  next.modelVersion += 1;
  if (input.decision === "removed") {
    next.buildingElements = next.buildingElements.filter((element) => !targetIds.has(element.elementId));
    next.geometry2D = next.geometry2D.filter((geometry) => !targetIds.has(geometry.elementId));
    next.takeoffItems = next.takeoffItems.filter((item) => !targetIds.has(item.elementId));
    next.estimateLines = next.estimateLines.filter((line) => !targetIds.has(line.elementId));
    next.modelObjects = next.modelObjects.filter((object) => !targetIds.has(object.elementId));
    next.issues = next.issues.filter((issue) => !(issue.elementId && targetIds.has(issue.elementId)));
    for (const report of next.reports) report.elementIds = report.elementIds.filter((elementId) => !targetIds.has(elementId));
  } else {
    for (const element of next.buildingElements) {
      if (!targetIds.has(element.elementId)) continue;
      const sheet = next.sheets.find((candidate) => candidate.sheetId === element.sheetId);
      if (!sheet || sheet.pageNumber === undefined) throw new ProjectModelValidationError(`Element ${element.elementId} has no source sheet to cite as review evidence.`);
      const missing = [element.dimensions.height === undefined || element.dimensions.height <= 0 ? "height" : "", element.dimensions.thickness === undefined || element.dimensions.thickness <= 0 ? "thickness" : ""].filter(Boolean);
      if (missing.length) throw new ProjectModelValidationError(`Element ${element.elementId} is missing ${missing.join(" and ")}; set building basics before confirming.`);
      element.reviewStatus = "approved";
      element.reviewEvidence = { reviewedAt: input.reviewedAt, reviewedBy: "user", sourceDocumentId: sheet.sourceDocumentId, pageNumber: sheet.pageNumber, description };
      if (!next.modelObjects.some((object) => object.elementId === element.elementId)) next.modelObjects.push({ modelObjectId: `obj_${element.elementId}`, elementId: element.elementId, projectId: next.projectId, revisionId: next.activeRevisionId, sourceGeometryId: element.sourceGeometryId, category: element.category, modelVersion: next.modelVersion, reviewStatus: "approved" });
    }
    for (const object of next.modelObjects) if (targetIds.has(object.elementId)) object.reviewStatus = "approved";
    for (const line of next.estimateLines) if (targetIds.has(line.elementId)) line.reviewStatus = "approved";
    next.issues = next.issues.filter((issue) => !(issue.elementId && targetIds.has(issue.elementId) && issue.kind === "review"));
  }
  const remaining = next.buildingElements.filter((element) => element.revisionId === next.activeRevisionId);
  if (!remaining.some((element) => element.reviewStatus === "requires_review")) next.issues = next.issues.filter((issue) => issue.title !== "Extracted wall geometry requires review" && issue.title !== "3D model requires geometry review");
  next.status = remaining.length && remaining.every((element) => element.reviewStatus === "approved") ? "ready" : "geometry_review";
  return validateProjectModel(next);
}

export function validateProjectModel(value: unknown): ProjectModel {
  if (!value || typeof value !== "object") throw new ProjectModelValidationError("ProjectModel must be an object.");
  const model = value as ProjectModel;
  if (model.schemaVersion !== PROJECT_MODEL_SCHEMA_VERSION) throw new ProjectModelValidationError(`Unsupported ProjectModel schema version: ${String(model.schemaVersion)}.`);
  requiredId(model.projectId, "projectId");
  requiredId(model.activeRevisionId, "activeRevisionId");
  if (!Number.isInteger(model.modelVersion) || model.modelVersion < 1) throw new ProjectModelValidationError("modelVersion must be a positive integer.");
  for (const field of ["sourceDocuments", "sheets", "blueprintIRs", "viewports", "levels", "geometry2D", "buildingElements", "takeoffItems", "estimateLines", "modelObjects", "issues", "revisionSets", "reports", "organizedNotes"] as const) {
    if (!Array.isArray(model[field])) throw new ProjectModelValidationError(`${field} must be an array.`);
  }
  const documentIds = new Set<string>();
  for (const document of model.sourceDocuments) {
    requiredId(document.documentId, "sourceDocuments.documentId");
    if (document.projectId !== model.projectId || document.lifecycleStatus !== "persisted") throw new ProjectModelValidationError(`Source document ${document.documentId} crosses the project boundary or is not persisted.`);
    if (documentIds.has(document.documentId)) throw new ProjectModelValidationError(`Duplicate source document: ${document.documentId}.`);
    if (document.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(document.sha256)) throw new ProjectModelValidationError(`Source document ${document.documentId} has an invalid SHA-256 digest.`);
    if (document.storageKey !== undefined && !document.storageKey.trim()) throw new ProjectModelValidationError(`Source document ${document.documentId} has an invalid storage key.`);
    if (document.pageCount !== undefined && (!Number.isInteger(document.pageCount) || document.pageCount < 1)) throw new ProjectModelValidationError(`Source document ${document.documentId} has an invalid page count.`);
    documentIds.add(document.documentId);
  }
  for (const ir of model.blueprintIRs) {
    validateBlueprintIR(ir);
    if (ir.projectId !== model.projectId || ir.revisionId !== model.activeRevisionId || !documentIds.has(ir.sourceDocumentId)) throw new ProjectModelValidationError(`BlueprintIR ${ir.sourceDocumentId} crosses the active project, revision, or source boundary.`);
  }
  const viewportIds = new Set<string>();
  const persistedSheetIds = new Set(model.sheets.map((sheet) => sheet.sheetId));
  for (const viewport of model.viewports) {
    requiredId(viewport.viewportId, "viewports.viewportId");
    if (viewportIds.has(viewport.viewportId) || viewport.projectId !== model.projectId || viewport.revisionId !== model.activeRevisionId || !documentIds.has(viewport.sourceDocumentId) || !persistedSheetIds.has(viewport.sheetId)) throw new ProjectModelValidationError(`Viewport ${viewport.viewportId} is duplicated or crosses its source boundary.`);
    viewportIds.add(viewport.viewportId);
  }
  for (const note of model.organizedNotes) {
    requiredId(note.noteId, "organizedNotes.noteId");
    if (note.projectId !== model.projectId || note.revisionId !== model.activeRevisionId || !documentIds.has(note.sourceDocumentId) || !viewportIds.has(note.viewportId)) throw new ProjectModelValidationError(`Organized note ${note.noteId} crosses its source boundary.`);
  }
  for (const sheet of model.sheets) {
    requiredId(sheet.sheetId, "sheets.sheetId");
    if (sheet.projectId !== model.projectId || sheet.revisionId !== model.activeRevisionId || !documentIds.has(sheet.sourceDocumentId)) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} crosses the active project/revision or has no source document.`);
    const document = model.sourceDocuments.find((item) => item.documentId === sheet.sourceDocumentId);
    if (!document?.sheetIds.includes(sheet.sheetId)) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} is not linked by its source document.`);
    if (sheet.pageNumber !== undefined && (!Number.isInteger(sheet.pageNumber) || sheet.pageNumber < 1 || (document.pageCount !== undefined && sheet.pageNumber > document.pageCount))) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} has an invalid source page number.`);
    if (sheet.scaleCalibration && (sheet.scaleCalibration.evidence.sourceDocumentId !== sheet.sourceDocumentId || sheet.scaleCalibration.evidence.pageNumber !== sheet.pageNumber || !sheet.scaleCalibration.evidence.description.trim())) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} has invalid scale calibration evidence.`);
    if (!Array.isArray(sheet.viewportIds) || typeof sheet.classificationConfidence !== "number" || sheet.classificationConfidence < 0 || sheet.classificationConfidence > 1) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} has invalid classification metadata.`);
    if (sheet.viewportIds.some((viewportId) => !viewportIds.has(viewportId))) throw new ProjectModelValidationError(`Sheet ${sheet.sheetId} references a missing viewport.`);
  }
  const elementIds = new Set<string>();
  const sheetIds = new Set(model.sheets.filter((sheet) => sheet.revisionId === model.activeRevisionId).map((sheet) => sheet.sheetId));
  const levelIds = new Set(model.levels.filter((level) => level.revisionId === model.activeRevisionId).map((level) => level.levelId));
  const geometryIds = new Set(model.geometry2D.filter((geometry) => geometry.revisionId === model.activeRevisionId).map((geometry) => geometry.geometryId));
  for (const element of model.buildingElements) {
    for (const [field, id] of Object.entries({ elementId: element.elementId, projectId: element.projectId, revisionId: element.revisionId, sheetId: element.sheetId, sourceGeometryId: element.sourceGeometryId, levelId: element.levelId })) requiredId(id, `buildingElements.${field}`);
    if (element.projectId !== model.projectId || element.revisionId !== model.activeRevisionId || !documentIds.has(element.sourceDocumentId)) throw new ProjectModelValidationError(`Building element ${element.elementId} crosses the active project, revision, or source boundary.`);
    if (elementIds.has(element.elementId)) throw new ProjectModelValidationError(`Duplicate elementId: ${element.elementId}.`);
    if (!sheetIds.has(element.sheetId) || !levelIds.has(element.levelId) || !geometryIds.has(element.sourceGeometryId)) throw new ProjectModelValidationError(`Building element ${element.elementId} has a missing sheet, level, or source geometry reference.`);
    const sourceGeometry = model.geometry2D.find((geometry) => geometry.geometryId === element.sourceGeometryId);
    if (sourceGeometry?.elementId !== element.elementId) throw new ProjectModelValidationError(`Building element ${element.elementId} does not preserve its source geometry identity.`);
    if (element.reviewStatus === "approved" && !element.reviewEvidence) throw new ProjectModelValidationError(`Approved building element ${element.elementId} is missing review evidence.`);
    const sourceSheet = model.sheets.find((sheet) => sheet.sheetId === element.sheetId);
    if (element.reviewEvidence && (element.reviewEvidence.sourceDocumentId !== sourceSheet?.sourceDocumentId || element.reviewEvidence.pageNumber !== sourceSheet?.pageNumber || !element.reviewEvidence.description.trim())) throw new ProjectModelValidationError(`Building element ${element.elementId} has invalid review evidence.`);
    if (typeof element.confidence !== "number" || element.confidence < 0 || element.confidence > 1) throw new ProjectModelValidationError(`Building element ${element.elementId} has invalid confidence.`);
    if (!Array.isArray(element.sourceReferences) || element.sourceReferences.some((reference) => reference.sourceDocumentId !== element.sourceDocumentId || reference.sheetId !== element.sheetId)) throw new ProjectModelValidationError(`Building element ${element.elementId} has invalid source references.`);
    elementIds.add(element.elementId);
  }
  for (const collection of [model.geometry2D, model.takeoffItems, model.estimateLines, model.modelObjects]) {
    for (const item of collection) {
      if (item.elementId && !elementIds.has(item.elementId)) throw new ProjectModelValidationError(`Projection references missing elementId: ${item.elementId}.`);
      const element = model.buildingElements.find((candidate) => candidate.elementId === item.elementId);
      if (!element) continue;
      if (item.projectId !== element.projectId || item.revisionId !== element.revisionId) throw new ProjectModelValidationError(`Projection ${item.elementId} crosses its project or revision boundary.`);
      if ("sourceGeometryId" in item && item.sourceGeometryId !== element.sourceGeometryId) throw new ProjectModelValidationError(`Projection ${item.elementId} loses its source geometry identity.`);
      if ("geometryId" in item && item.geometryId !== element.sourceGeometryId) throw new ProjectModelValidationError(`Drawing geometry ${item.elementId} loses its source geometry identity.`);
    }
  }
  for (const report of model.reports) {
    requiredId(report.reportId, "reports.reportId");
    if (report.projectId !== model.projectId || report.revisionId !== model.activeRevisionId || report.elementIds.some((elementId) => !elementIds.has(elementId)) || (report.sourceDocumentId !== undefined && !documentIds.has(report.sourceDocumentId))) throw new ProjectModelValidationError(`Report ${report.reportId} crosses its canonical identity boundary.`);
  }
  return model;
}

export function parseStoredProjectModel(value: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); }
  catch { throw new ProjectModelValidationError("Stored ProjectModel JSON is malformed and was quarantined."); }
  return validateProjectModel(migrateProjectModel(parsed));
}

export function migrateProjectModel(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1) return value;
  const migrated = structuredClone(source) as unknown as ProjectModel;
  migrated.schemaVersion = PROJECT_MODEL_SCHEMA_VERSION;
  migrated.blueprintIRs = [];
  migrated.viewports = [];
  migrated.organizedNotes = [];
  migrated.sheets = migrated.sheets.map((sheet) => ({ ...sheet, classification: "unknown", classificationConfidence: 0, viewportIds: [], scaleCalibration: sheet.scaleCalibration ? { ...sheet.scaleCalibration, confidence: 1 } : null }));
  const documentForSheet = new Map(migrated.sheets.map((sheet) => [sheet.sheetId, sheet.sourceDocumentId]));
  migrated.geometry2D = migrated.geometry2D.map((geometry) => ({ ...geometry, sourceDocumentId: documentForSheet.get(geometry.sheetId)! }));
  migrated.buildingElements = migrated.buildingElements.map((element) => ({ ...element, sourceDocumentId: documentForSheet.get(element.sheetId)!, evidenceClass: "user_reviewed", sourceReferences: [{ sourceDocumentId: documentForSheet.get(element.sheetId)!, sheetId: element.sheetId, pageNumber: migrated.sheets.find((sheet) => sheet.sheetId === element.sheetId)?.pageNumber || 1, recordId: element.sourceGeometryId }], inferredFields: [], relatedElementIds: [] }));
  return migrated;
}
