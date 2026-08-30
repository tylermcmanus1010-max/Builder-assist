import assert from "node:assert/strict";
import test from "node:test";
import { createProjectModel, parseStoredProjectModel, recordScaleCalibration, stableElementId, traceWall, validateProjectModel } from "../lib/project-model.ts";
import { projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

const source = { documentId: "file_floorplan_fixture", projectId: "prj_floorplan_test", filename: "swenka-floor-plan.png", contentType: "image/png", sizeBytes: 364474, lifecycleStatus: "persisted", sheetIds: [] };

function calibratedModel() {
  const uploaded = createProjectModel("prj_floorplan_test", "rev_floorplan_01", [source]);
  return recordScaleCalibration(uploaded, { sheetId: uploaded.sheets[0].sheetId, drawingDistance: 100, realDistance: 20, units: "ft", calibratedAt: "2026-08-30T00:00:00.000Z" });
}

test("canonical ProjectModel starts fail-closed with persisted source and scale review", () => {
  const model = createProjectModel("prj_floorplan_test", "rev_floorplan_01", [source]);
  for (const field of ["sourceDocuments", "sheets", "levels", "geometry2D", "buildingElements", "takeoffItems", "estimateLines", "modelObjects", "issues", "revisionSets", "reports"]) assert.ok(Array.isArray(model[field]), field);
  assert.equal(model.sourceDocuments[0].lifecycleStatus, "persisted");
  assert.equal(model.status, "awaiting_scale");
  assert.equal(model.issues[0].title, "Scale calibration required");
  assert.throws(() => traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_01", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 50, y: 0 }, height: 9, thickness: .5 }), /Scale calibration is required/);
});

test("missing wall dimensions create review work and never fabricate a 3D object", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_incomplete", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 50, y: 0 } });
  assert.equal(traced.buildingElements[0].reviewStatus, "requires_review");
  assert.equal(traced.modelObjects.length, 0);
  assert.equal(projectModelMeshDescriptors(traced).length, 0);
  assert.ok(traced.issues.some((issue) => issue.title === "3D model requires geometry review"));
});

test("one traced wall preserves the same elementId in Drawing, Takeoff, Estimate and 3D", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_01", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 60, y: 0 }, height: 9, thickness: .5 });
  const expected = stableElementId(traced.projectId, traced.activeRevisionId, traced.sheets[0].sheetId, "geo_wall_01");
  assert.equal(traced.geometry2D[0].elementId, expected, "Drawing");
  assert.equal(traced.buildingElements[0].elementId, expected, "canonical building element");
  assert.equal(traced.takeoffItems[0].elementId, expected, "Takeoff");
  assert.equal(traced.estimateLines[0].elementId, expected, "Estimate");
  assert.equal(traced.modelObjects[0].elementId, expected, "3D model object");
  const descriptor = projectModelMeshDescriptors(traced)[0];
  assert.equal(descriptor.elementId, expected);
  assert.deepEqual(descriptor.size, { length: 12, height: 9, thickness: .5 });
  assert.deepEqual(descriptor.position, { x: 6, y: 4.5, z: 0 });
  assert.equal(traced.status, "ready");
});

test("persistence round trip retains project, revision, sheet, source geometry and element identity", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_reload", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 5, y: 5 }, end: { x: 5, y: 55 }, height: 10, thickness: .67 });
  const reloaded = parseStoredProjectModel(JSON.stringify(traced));
  assert.deepEqual(reloaded.buildingElements[0], traced.buildingElements[0]);
  assert.equal(reloaded.projectId, traced.projectId);
  assert.equal(reloaded.activeRevisionId, traced.activeRevisionId);
  assert.equal(reloaded.buildingElements[0].sheetId, traced.sheets[0].sheetId);
  assert.equal(reloaded.buildingElements[0].sourceGeometryId, "geo_wall_reload");
});

test("invalid or cross-project canonical data is rejected instead of silently repaired", () => {
  const model = calibratedModel();
  const traced = traceWall(model, { sheetId: model.sheets[0].sheetId, sourceGeometryId: "geo_wall_invalid", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 0, y: 0 }, end: { x: 30, y: 40 }, height: 8, thickness: .5 });
  const invalid = structuredClone(traced); invalid.buildingElements[0].projectId = "prj_other_project";
  assert.throws(() => validateProjectModel(invalid), /crosses the active project/);
  assert.throws(() => parseStoredProjectModel("{"), /malformed.*quarantined/);
});
