import { parseBlueprintIR, parseProjectModel, type ProjectModel } from "./contracts";

export function reconcileBlueprintIR(value: unknown, modelVersion: number): ProjectModel {
  const ir = parseBlueprintIR(value);
  const eligible = ir.semanticElements.filter((element) => element.reviewStatus !== "rejected");
  const confirmed = eligible.filter((element) => element.reviewStatus === "confirmed");
  const sourceReferences = (element: (typeof eligible)[number]) => element.sourceReferences;
  const geometry2D = eligible.map((element) => ({ id: `geo_${element.id}`, elementId: element.id, geometry: element.geometry }));
  const buildingElements = eligible.map((element) => ({ ...element, elementId: element.id, sourceGeometryId: `geo_${element.id}` }));
  const takeoffItems = confirmed.flatMap((element) => element.quantities.map((quantity, index) => ({
    id: `to_${element.id}_${index}`,
    elementId: element.id,
    revisionId: ir.revisionId,
    modelVersion,
    sourceReferences: sourceReferences(element),
    ...quantity,
  })));
  const issues = eligible
    .filter((element) => element.reviewStatus !== "confirmed" || element.confidence < 0.8 || element.evidenceClass === "inferred")
    .map((element) => ({
      id: `issue_review_${element.id}`,
      elementId: element.id,
      revisionId: ir.revisionId,
      modelVersion,
      sourceReferences: sourceReferences(element),
      title: `Review ${element.category} interpretation`,
      blocking: element.reviewStatus === "needs_review" || element.confidence < 0.5,
    }));
  const now = new Date().toISOString();
  return parseProjectModel({
    schemaVersion: 1,
    modelVersion,
    projectId: ir.projectId,
    activeRevisionId: ir.revisionId,
    status: issues.length ? "needs_review" : "reviewed",
    sourceDocuments: ir.sourceDocuments,
    sheets: ir.sheets,
    viewports: ir.viewports,
    levels: ir.levels,
    geometry2D,
    buildingElements,
    takeoffItems,
    estimateLines: [],
    modelObjects: eligible.map((element) => ({
      id: `obj_${element.id}`,
      elementId: element.id,
      revisionId: ir.revisionId,
      modelVersion,
      sourceReferences: sourceReferences(element),
      geometry2DId: `geo_${element.id}`,
      evidenceClass: element.evidenceClass,
    })),
    issues,
    revisionSets: [],
    reports: [{
      id: `report_inputs_${ir.revisionId}_${modelVersion}`,
      revisionId: ir.revisionId,
      modelVersion,
      elementIds: eligible.map((element) => element.id),
      sourceReferences: eligible.flatMap(sourceReferences),
    }],
    organizedNotes: ir.organizedNotes,
    createdAt: ir.createdAt,
    updatedAt: now,
  });
}
