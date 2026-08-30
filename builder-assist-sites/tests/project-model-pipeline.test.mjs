import assert from "node:assert/strict";
import test from "node:test";
import { createProjectModel, parseStoredProjectModel, recordScaleCalibration, traceWall, validateProjectModel } from "../lib/project-model.ts";
import { projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

const source = { documentId: "source-boulder9-plans-pdf-001", projectId: "project-boulder9-fernandez", filename: "01-BOULDER-9-PLANS-20260830-073852-.pdf", contentType: "application/pdf", sizeBytes: 11746217, lifecycleStatus: "persisted", storageKey: "fixtures/boulder9/source-boulder9-plans-pdf-001.pdf", sha256: "8e30a0ddd7af2218e7cd8162d0882b7561b2661df8662ca11d649938f76f62f4", pageCount: 14, sheetIds: [] };

const projectId = "project-boulder9-fernandez";
const revisionId = "revision-boulder9-source-001";

function page3(model) {
  return model.sheets.find((sheet) => sheet.pageNumber === 3);
}

function calibrationInput(model) {
  const sheet = page3(model);
  return { sheetId: sheet.sheetId, drawingDistance: 26, drawingUnits: "in", realDistance: 104, units: "ft", calibratedAt: "2026-08-30T00:00:00.000Z", evidence: { sourceDocumentId: source.documentId, pageNumber: 3, description: "Page 3 architectural floor plan: 104'-0\" overall dimension at 1/4 inch = 1 foot." } };
}

const reviewEvidence = { reviewedAt: "2026-08-30T00:05:00.000Z", reviewedBy: "user", sourceDocumentId: source.documentId, pageNumber: 3, description: "Representative dimensions entered and approved by the geometry reviewer for pipeline verification." };

function calibratedModel() {
  const uploaded = createProjectModel(projectId, revisionId, [source]);
  return recordScaleCalibration(uploaded, calibrationInput(uploaded));
}

test("canonical ProjectModel starts fail-closed with persisted source and scale review", () => {
  const model = createProjectModel(projectId, revisionId, [source]);
  for (const field of ["sourceDocuments", "sheets", "levels", "geometry2D", "buildingElements", "takeoffItems", "estimateLines", "modelObjects", "issues", "revisionSets", "reports"]) assert.ok(Array.isArray(model[field]), field);
  assert.equal(model.sourceDocuments[0].lifecycleStatus, "persisted");
  assert.equal(model.status, "awaiting_scale");
  assert.equal(model.issues[0].title, "Scale calibration required");
  assert.equal(model.sheets.length, 14);
  assert.throws(() => traceWall(model, { sheetId: page3(model).sheetId, sourceGeometryId: "geo_wall_01", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 50, y: 0 }, height: 9, thickness: .5, reviewEvidence }), /Scale calibration is required/);
});

test("missing wall dimensions create review work and never fabricate a 3D object", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: page3(model).sheetId, sourceGeometryId: "geo_wall_incomplete", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 12, y: 0 } });
  assert.equal(traced.buildingElements[0].reviewStatus, "requires_review");
  assert.equal(traced.modelObjects.length, 0);
  assert.equal(projectModelMeshDescriptors(traced).length, 0);
  assert.ok(traced.issues.some((issue) => issue.title === "3D model requires geometry review"));
});

test("one traced wall preserves the same elementId in Drawing, Takeoff, Estimate and 3D", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: page3(model).sheetId, sourceGeometryId: "geom-boulder9-p03-wall-trace-001", elementId: "element-boulder9-level1-wall-trace-001", levelId: "level-boulder9-01", levelName: "Level 1", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 3, y: 0 }, height: 10, thickness: .5, reviewEvidence });
  const expected = "element-boulder9-level1-wall-trace-001";
  assert.equal(traced.geometry2D[0].elementId, expected, "Drawing");
  assert.equal(traced.buildingElements[0].elementId, expected, "canonical building element");
  assert.equal(traced.takeoffItems[0].elementId, expected, "Takeoff");
  assert.equal(traced.estimateLines[0].elementId, expected, "Estimate");
  assert.equal(traced.modelObjects[0].elementId, expected, "3D model object");
  const descriptor = projectModelMeshDescriptors(traced)[0];
  assert.equal(descriptor.elementId, expected);
  assert.deepEqual(descriptor.size, { length: 12, height: 10, thickness: .5 });
  assert.deepEqual(descriptor.position, { x: 6, y: 5, z: 0 });
  assert.equal(traced.status, "ready");
});

test("persistence round trip retains project, revision, sheet, source geometry and element identity", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: page3(model).sheetId, sourceGeometryId: "geo_wall_reload", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 5, y: 5 }, end: { x: 5, y: 55 }, height: 10, thickness: .67, reviewEvidence });
  const reloaded = parseStoredProjectModel(JSON.stringify(traced));
  assert.deepEqual(reloaded.buildingElements[0], traced.buildingElements[0]);
  assert.equal(reloaded.projectId, traced.projectId);
  assert.equal(reloaded.activeRevisionId, traced.activeRevisionId);
  assert.equal(reloaded.buildingElements[0].sheetId, page3(traced).sheetId);
  assert.equal(reloaded.buildingElements[0].sourceGeometryId, "geo_wall_reload");
});

test("invalid or cross-project canonical data is rejected instead of silently repaired", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: page3(model).sheetId, sourceGeometryId: "geo_wall_invalid", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 30, y: 40 }, height: 8, thickness: .5, reviewEvidence });
  const invalid = structuredClone(traced); invalid.buildingElements[0].projectId = "prj_other_project";
  assert.throws(() => validateProjectModel(invalid), /crosses the active project/);
  assert.throws(() => parseStoredProjectModel("{"), /malformed.*quarantined/);
});
