export const BLUEPRINT_IR_SCHEMA_VERSION = "0.1" as const;

export type BlueprintPoint = { x: number; y: number };
export type BlueprintBounds = { x: number; y: number; width: number; height: number };
export type BlueprintConfidence = number;

export type BlueprintViewport = {
  viewportId: string;
  projectId: string;
  revisionId: string;
  sourceDocumentId: string;
  sheetId: string;
  pageNumber: number;
  bounds: BlueprintBounds;
  classification: "floor_plan" | "notes" | "schedule" | "detail" | "unknown";
  discipline: "architectural" | "unknown";
  confidence: BlueprintConfidence;
};

export type BlueprintScaleCandidate = {
  scaleCandidateId: string;
  viewportId: string;
  sourceTextBlockId: string;
  writtenScale: string;
  ratio: number;
  status: "dimension_verified" | "candidate" | "conflict" | "not_to_scale";
  confidence: BlueprintConfidence;
  dimensionIds: string[];
};

export type BlueprintVectorPrimitive = {
  primitiveId: string;
  sheetId: string;
  viewportId: string;
  pageNumber: number;
  kind: "line";
  start: BlueprintPoint;
  end: BlueprintPoint;
  units: "pdf_pt";
  extractionMethod: "embedded_pdf_vector";
  confidence: BlueprintConfidence;
};

export type BlueprintTextBlock = {
  textBlockId: string;
  sheetId: string;
  viewportId: string;
  pageNumber: number;
  bounds: BlueprintBounds;
  text: string;
  extractionMethod: "embedded_pdf_text";
  confidence: BlueprintConfidence;
};

export type BlueprintDimension = {
  dimensionId: string;
  sheetId: string;
  viewportId: string;
  pageNumber: number;
  sourceTextBlockId: string;
  text: string;
  value: number;
  units: "ft";
  confidence: BlueprintConfidence;
};

export type BlueprintOrganizedNote = {
  noteId: string;
  projectId: string;
  revisionId: string;
  sourceDocumentId: string;
  sheetId: string;
  viewportId: string;
  pageNumber: number;
  sourceBounds: BlueprintBounds;
  category: "general_notes" | "materials" | "dimensions" | "assumptions";
  discipline: "architectural" | "unknown";
  title: string;
  text: string;
  sourceTextBlockIds: string[];
  extractionMethod: "embedded_pdf_text";
  confidence: BlueprintConfidence;
  assumptions: string[];
  reviewStatus: "requires_review" | "approved" | "rejected";
};

export type BlueprintGeometryCandidate = {
  geometryId: string;
  sheetId: string;
  viewportId: string;
  pageNumber: number;
  kind: "wall_centerline";
  points: [BlueprintPoint, BlueprintPoint];
  thicknessPdfPoints: number;
  heightFeet?: number;
  sourcePrimitiveIds: string[];
  extractionMethod: "vector_parallel_faces";
  confidence: BlueprintConfidence;
  assumptions: string[];
  reviewStatus: "requires_review";
};

export type BlueprintIR = {
  schemaVersion: typeof BLUEPRINT_IR_SCHEMA_VERSION;
  projectId: string;
  revisionId: string;
  sourceDocumentId: string;
  extractedAt: string;
  parser: { name: "buildscope-vector-pdf"; version: "0.1.0" };
  status: "partial" | "ready" | "quarantined";
  sheets: Array<{
    sheetId: string;
    pageNumber: number;
    title: string;
    width: number;
    height: number;
    units: "pdf_pt";
    classification: BlueprintViewport["classification"];
    confidence: BlueprintConfidence;
  }>;
  viewports: BlueprintViewport[];
  scaleCandidates: BlueprintScaleCandidate[];
  vectorPrimitives: BlueprintVectorPrimitive[];
  textBlocks: BlueprintTextBlock[];
  organizedNotes: BlueprintOrganizedNote[];
  dimensions: BlueprintDimension[];
  geometryCandidates: BlueprintGeometryCandidate[];
  warnings: Array<{ code: string; message: string; pageNumber?: number }>;
  provenance: Array<{ provenanceId: string; sourceDocumentId: string; pageNumber: number; method: "embedded_pdf_text" | "embedded_pdf_vector"; parserVersion: "0.1.0" }>;
};

export class BlueprintIRValidationError extends Error {}

export function stableBlueprintId(prefix: string, ...parts: Array<string | number>) {
  let hash = 2166136261;
  const value = parts.join("|");
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36).padStart(7, "0")}`;
}

function validId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value);
}

export function validateBlueprintIR(value: unknown): BlueprintIR {
  if (!value || typeof value !== "object") throw new BlueprintIRValidationError("BlueprintIR must be an object.");
  const ir = value as BlueprintIR;
  if (ir.schemaVersion !== BLUEPRINT_IR_SCHEMA_VERSION) throw new BlueprintIRValidationError(`Unsupported BlueprintIR schema version: ${String(ir.schemaVersion)}.`);
  if (!Number.isFinite(Date.parse(ir.extractedAt))) throw new BlueprintIRValidationError("BlueprintIR extractedAt must be an ISO timestamp.");
  for (const [field, id] of Object.entries({ projectId: ir.projectId, revisionId: ir.revisionId, sourceDocumentId: ir.sourceDocumentId })) {
    if (!validId(id)) throw new BlueprintIRValidationError(`${field} is invalid.`);
  }
  for (const field of ["sheets", "viewports", "scaleCandidates", "vectorPrimitives", "textBlocks", "organizedNotes", "dimensions", "geometryCandidates", "warnings", "provenance"] as const) {
    if (!Array.isArray(ir[field])) throw new BlueprintIRValidationError(`${field} must be an array.`);
  }
  const sheetIds = new Set(ir.sheets.map((sheet) => sheet.sheetId));
  const viewportIds = new Set(ir.viewports.map((viewport) => viewport.viewportId));
  const primitiveIds = new Set(ir.vectorPrimitives.map((primitive) => primitive.primitiveId));
  const textIds = new Set(ir.textBlocks.map((block) => block.textBlockId));
  if (sheetIds.size !== ir.sheets.length || viewportIds.size !== ir.viewports.length || primitiveIds.size !== ir.vectorPrimitives.length || textIds.size !== ir.textBlocks.length) throw new BlueprintIRValidationError("BlueprintIR contains duplicate stable identifiers.");
  for (const viewport of ir.viewports) {
    if (!sheetIds.has(viewport.sheetId) || viewport.projectId !== ir.projectId || viewport.revisionId !== ir.revisionId || viewport.sourceDocumentId !== ir.sourceDocumentId) throw new BlueprintIRValidationError(`Viewport ${viewport.viewportId} crosses its source boundary.`);
  }
  for (const candidate of ir.scaleCandidates) {
    if (!viewportIds.has(candidate.viewportId) || !textIds.has(candidate.sourceTextBlockId)) throw new BlueprintIRValidationError(`Scale candidate ${candidate.scaleCandidateId} has missing evidence.`);
    if (!Number.isFinite(candidate.ratio) || candidate.ratio <= 0 || candidate.confidence < 0 || candidate.confidence > 1) throw new BlueprintIRValidationError(`Scale candidate ${candidate.scaleCandidateId} is invalid.`);
  }
  for (const geometry of ir.geometryCandidates) {
    if (!viewportIds.has(geometry.viewportId) || geometry.sourcePrimitiveIds.some((id) => !primitiveIds.has(id))) throw new BlueprintIRValidationError(`Geometry candidate ${geometry.geometryId} has missing source evidence.`);
    if (geometry.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new BlueprintIRValidationError(`Geometry candidate ${geometry.geometryId} has invalid coordinates.`);
  }
  return ir;
}
