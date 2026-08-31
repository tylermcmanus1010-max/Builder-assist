import assert from "node:assert/strict";
import test from "node:test";
import { createProjectModel, parseStoredProjectModel, recordScaleCalibration, traceWall, validateProjectModel } from "../lib/project-model.ts";
import { projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

const source = { documentId: "source-generic-plan-001", projectId: "project-generic-001", filename: "generic-plan.pdf", contentType: "application/pdf", sizeBytes: 1000, lifecycleStatus: "persisted", storageKey: "fixtures/generic/source.pdf", sha256: "a".repeat(64), pageCount: 1, sheetIds: [] };
const projectId = source.projectId;
const revisionId = "revision-generic-001";

function calibrationInput(model) {
  const sheet = model.sheets[0];
  return { sheetId: sheet.sheetId, drawingDistance: 3, drawingUnits: "in", realDistance: 12, units: "ft", calibratedAt: "2026-08-30T00:00:00.000Z", evidence: { sourceDocumentId: source.documentId, pageNumber: 1, description: "Generic unit-test scale evidence." } };
}

const reviewEvidence = { reviewedAt: "2026-08-30T00:05:00.000Z", reviewedBy: "user", sourceDocumentId: source.documentId, pageNumber: 1, description: "Generic geometry reviewer evidence." };

function calibratedModel() {
  return recordScaleCalibration(createProjectModel(projectId, revisionId, [source]), calibrationInput(createProjectModel(projectId, revisionId, [source])));
}

test("canonical ProjectModel starts fail-closed with persisted source and scale review", () => {
  const model = createProjectModel(projectId, revisionId, [source]);
  for (const field of ["sourceDocuments", "sheets", "blueprintIRs", "viewports", "levels", "geometry2D", "buildingElements", "takeoffItems", "estimateLines", "modelObjects", "issues", "revisionSets", "reports", "organizedNotes"]) assert.ok(Array.isArray(model[field]), field);
  assert.equal(model.status, "awaiting_scale");
  assert.throws(() => traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_01", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 50, y: 0 }, height: 9, thickness: .5, reviewEvidence }), /Scale calibration is required/);
});

test("one reviewed wall preserves identity and source evidence across projections", () => {
  const model = calibratedModel();
  const sheet = model.sheets[0];
  const traced = traceWall(model, { sheetId: sheet.sheetId, sourceGeometryId: "geom-generic-wall-001", elementId: "element-generic-wall-001", levelId: "level-generic-01", levelName: "Level 1", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 3, y: 0 }, height: 10, thickness: .5, reviewEvidence });
  const expected = "element-generic-wall-001";
  assert.equal(traced.geometry2D[0].elementId, expected);
  assert.equal(traced.buildingElements[0].sourceDocumentId, source.documentId);
  assert.equal(traced.takeoffItems[0].elementId, expected);
  assert.equal(traced.estimateLines[0].elementId, expected);
  assert.equal(traced.modelObjects[0].elementId, expected);
  assert.equal(projectModelMeshDescriptors(traced)[0].elementId, expected);
  assert.deepEqual(parseStoredProjectModel(JSON.stringify(traced)), traced);
});

test("ProjectModel v1 migrates additively to v2", () => {
  const current = createProjectModel(projectId, revisionId, [source]);
  const legacy = structuredClone(current);
  legacy.schemaVersion = 1;
  delete legacy.blueprintIRs; delete legacy.viewports; delete legacy.organizedNotes;
  for (const sheet of legacy.sheets) { delete sheet.classification; delete sheet.classificationConfidence; delete sheet.viewportIds; }
  const migrated = parseStoredProjectModel(JSON.stringify(legacy));
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.blueprintIRs, []);
});

test("invalid cross-project canonical data is rejected", () => {
  const traced = traceWall(calibratedModel(), { sheetId: calibratedModel().sheets[0].sheetId, sourceGeometryId: "geo_wall_invalid", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 3, y: 4 }, height: 8, thickness: .5, reviewEvidence });
  const invalid = structuredClone(traced); invalid.buildingElements[0].projectId = "prj_other_project";
  assert.throws(() => validateProjectModel(invalid), /crosses the active project/);
  assert.throws(() => parseStoredProjectModel("{"), /malformed.*quarantined/);
});
