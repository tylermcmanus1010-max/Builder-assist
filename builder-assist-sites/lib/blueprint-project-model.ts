import { stableBlueprintId, validateBlueprintIR, type BlueprintIR } from "./blueprint-ir.ts";
import { stableElementId, validateProjectModel, type ProjectModel } from "./project-model.ts";

export function reconcileBlueprintIR(modelValue: ProjectModel, irValue: BlueprintIR): ProjectModel {
  const model = validateProjectModel(modelValue);
  const ir = validateBlueprintIR(irValue);
  if (ir.projectId !== model.projectId || ir.revisionId !== model.activeRevisionId) throw new Error("BlueprintIR crosses the active ProjectModel project or revision boundary.");
  const source = model.sourceDocuments.find((document) => document.documentId === ir.sourceDocumentId);
  if (!source) throw new Error("BlueprintIR source document is not persisted in ProjectModel.");
  const next = structuredClone(model);
  next.modelVersion += 1;
  next.blueprintIRs = next.blueprintIRs.filter((candidate) => !(candidate.sourceDocumentId === ir.sourceDocumentId && candidate.revisionId === ir.revisionId));
  next.blueprintIRs.push(ir);
  next.viewports = next.viewports.filter((viewport) => viewport.sourceDocumentId !== ir.sourceDocumentId);
  next.viewports.push(...ir.viewports.map((viewport) => ({ ...viewport })));
  next.organizedNotes = next.organizedNotes.filter((note) => note.sourceDocumentId !== ir.sourceDocumentId);
  next.organizedNotes.push(...ir.organizedNotes.map((note) => ({ ...note })));

  for (const irSheet of ir.sheets) {
    const sheet = next.sheets.find((candidate) => candidate.sheetId === irSheet.sheetId && candidate.sourceDocumentId === ir.sourceDocumentId);
    if (!sheet) throw new Error(`BlueprintIR sheet ${irSheet.sheetId} is not persisted in ProjectModel.`);
    sheet.title = irSheet.title;
    sheet.classification = irSheet.classification;
    sheet.classificationConfidence = irSheet.confidence;
    sheet.viewportIds = ir.viewports.filter((viewport) => viewport.sheetId === sheet.sheetId).map((viewport) => viewport.viewportId);
    const viewport = ir.viewports.find((candidate) => candidate.sheetId === sheet.sheetId);
    const scale = viewport && ir.scaleCandidates.find((candidate) => candidate.viewportId === viewport.viewportId && candidate.status === "dimension_verified");
    if (scale && viewport) {
      sheet.scaleCalibration = {
        status: "verified", drawingDistance: 1, drawingUnits: "in", realDistance: scale.ratio / 12, units: "ft",
        calibratedAt: ir.extractedAt, calibratedBy: "document_extraction", confidence: scale.confidence,
        evidence: { sourceDocumentId: ir.sourceDocumentId, pageNumber: sheet.pageNumber!, description: `${scale.writtenScale}; printed dimension cross-check ${scale.dimensionIds.join(", ")}.` },
      };
    }
  }

  const levelId = stableBlueprintId("lvl", model.projectId, model.activeRevisionId, "extracted-plan-level");
  if (!next.levels.some((level) => level.levelId === levelId)) next.levels.push({ levelId, projectId: model.projectId, revisionId: model.activeRevisionId, name: "Extracted plan level", elevation: 0, units: "ft", reviewStatus: "requires_review" });
  const newElementIds: string[] = [];
  let scaleAssumed = false;
  for (const geometry of ir.geometryCandidates) {
    const sheet = next.sheets.find((candidate) => candidate.sheetId === geometry.sheetId);
    if (!sheet || next.geometry2D.some((candidate) => candidate.geometryId === geometry.geometryId)) continue;
    // A preliminary model always assembles: a verified scale is preferred, an
    // unverified written scale is next, and 1/4" = 1'-0" is the assumed
    // fallback. Anything below verified is recorded as an explicit assumption
    // and stays requires_review — it is never silently upgraded.
    const verifiedScale = ir.scaleCandidates.find((candidate) => candidate.viewportId === geometry.viewportId && candidate.status === "dimension_verified");
    const writtenScale = verifiedScale || [...ir.scaleCandidates].filter((candidate) => candidate.viewportId === geometry.viewportId).sort((first, second) => second.confidence - first.confidence)[0];
    const ratio = writtenScale?.ratio ?? 48;
    const points = geometry.points.map((point) => ({ x: point.x * ratio / 864, y: point.y * ratio / 864 })) as [{ x: number; y: number }, { x: number; y: number }];
    const length = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    const thickness = geometry.thicknessPdfPoints * ratio / 864;
    const heightFeet = geometry.heightFeet ?? 9;
    const elementId = stableElementId(model.projectId, model.activeRevisionId, geometry.sheetId, geometry.geometryId);
    const assumptions = [...geometry.assumptions];
    const inferredFields = ["category", "centerline", "height"];
    if (!verifiedScale) {
      scaleAssumed = true;
      inferredFields.push("scale");
      assumptions.push(writtenScale ? `The written scale ${writtenScale.writtenScale} was read from the sheet but has not been cross-checked against a printed dimension.` : "No drawing scale was found; a typical 1/4\" = 1'-0\" plan scale is assumed until the user confirms one dimension.");
    }
    if (geometry.heightFeet !== undefined) assumptions.push("Wall height came from an extracted note and remains preliminary until user review.");
    else assumptions.push("Wall height was not found on the plans; a typical 9 ft height is assumed until the user confirms or changes it.");
    next.geometry2D.push({ geometryId: geometry.geometryId, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceDocumentId: ir.sourceDocumentId, sheetId: geometry.sheetId, viewportId: geometry.viewportId, kind: "wall_centerline", points, units: "ft", provenance: "document_extraction" });
    next.buildingElements.push({ elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceDocumentId: ir.sourceDocumentId, sheetId: geometry.sheetId, viewportId: geometry.viewportId, sourceGeometryId: geometry.geometryId, category: "wall", levelId, geometry: { kind: "centerline", start: points[0], end: points[1] }, dimensions: { length, height: heightFeet, thickness }, units: "ft", extractionMethod: "document_extraction", evidenceClass: "validated_vector_pdf", confidence: geometry.confidence, assumptions, reviewStatus: "requires_review", sourceReferences: geometry.sourcePrimitiveIds.map((primitiveId) => ({ sourceDocumentId: ir.sourceDocumentId, sheetId: geometry.sheetId, viewportId: geometry.viewportId, pageNumber: geometry.pageNumber, recordId: primitiveId })), inferredFields, relatedElementIds: [] });
    next.takeoffItems.push({ takeoffItemId: `tk_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: geometry.geometryId, category: "wall", quantity: length, units: "ft", modelVersion: next.modelVersion });
    next.estimateLines.push({ estimateLineId: `est_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: geometry.geometryId, description: "Preliminary extracted wall length", quantity: length, units: "ft", unitCostCents: null, modelVersion: next.modelVersion, reviewStatus: "requires_review" });
    next.modelObjects.push({ modelObjectId: `obj_${elementId}`, elementId, projectId: model.projectId, revisionId: model.activeRevisionId, sourceGeometryId: geometry.geometryId, category: "wall", modelVersion: next.modelVersion, reviewStatus: "requires_review" });
    newElementIds.push(elementId);
  }
  next.reports = next.reports.filter((report) => !(report.sourceDocumentId === ir.sourceDocumentId && report.kind === "blueprint_extraction"));
  next.reports.push({ reportId: stableBlueprintId("rpt", ir.sourceDocumentId, ir.revisionId), projectId: model.projectId, revisionId: model.activeRevisionId, sourceDocumentId: ir.sourceDocumentId, modelVersion: next.modelVersion, elementIds: newElementIds, noteIds: ir.organizedNotes.map((note) => note.noteId), kind: "blueprint_extraction", status: "draft" });
  if (newElementIds.length) next.issues.push({ issueId: stableBlueprintId("iss", ir.sourceDocumentId, ir.revisionId, "geometry-review"), projectId: model.projectId, revisionId: model.activeRevisionId, kind: "review", title: "Extracted wall geometry requires review", status: "open", reason: `${newElementIds.length} preliminary vector-PDF wall centerlines require source-overlay confirmation.` });
  if (newElementIds.length && scaleAssumed) next.issues.push({ issueId: stableBlueprintId("iss", ir.sourceDocumentId, ir.revisionId, "scale-preliminary"), projectId: model.projectId, revisionId: model.activeRevisionId, kind: "review", title: "Drawing scale is preliminary", status: "open", reason: "The preliminary model uses an unverified drawing scale. Confirm one printed dimension to verify overall sizes." });
  next.issues = next.issues.filter((issue) => !(issue.title === "Scale calibration required" && next.sheets.some((sheet) => sheet.scaleCalibration?.calibratedBy === "document_extraction")));
  next.status = newElementIds.length ? "geometry_review" : next.status;
  return validateProjectModel(next);
}
