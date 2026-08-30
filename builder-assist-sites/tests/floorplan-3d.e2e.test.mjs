import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createProjectModel, recordScaleCalibration, traceWall } from "../lib/project-model.ts";
import { projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

const bytes = await readFile(new URL("../public/project-plans/swenka-floor-plan.png", import.meta.url));

test("floor-plan upload, calibration and trace preserve one wall across Drawing, Takeoff and 3D", () => {
  const upload = new File([bytes], "swenka-floor-plan.png", { type: "image/png" });
  assert.ok(upload.size > 100_000, "the real uploaded floor-plan fixture is loaded");
  const sourceDocument = { documentId: "file_e2e_floorplan", projectId: "prj_e2e_floorplan", filename: upload.name, contentType: upload.type, sizeBytes: upload.size, lifecycleStatus: "persisted", sheetIds: [] };
  const uploaded = createProjectModel("prj_e2e_floorplan", "rev_e2e_floorplan", [sourceDocument]);
  assert.equal(uploaded.sourceDocuments[0].lifecycleStatus, "persisted");
  const calibrated = recordScaleCalibration(uploaded, { sheetId: uploaded.sheets[0].sheetId, drawingDistance: 100, realDistance: 20, units: "ft", calibratedAt: "2026-08-30T00:00:00.000Z" });
  const traced = traceWall(calibrated, { sheetId: calibrated.sheets[0].sheetId, sourceGeometryId: "geo_e2e_wall", levelId: "lvl_ground", levelName: "Ground", levelElevation: 0, start: { x: 10, y: 20 }, end: { x: 110, y: 20 }, height: 10, thickness: .5 });
  const drawingElementId = traced.geometry2D.at(-1).elementId;
  assert.equal(traced.buildingElements.at(-1).elementId, drawingElementId);
  assert.equal(traced.takeoffItems.at(-1).elementId, drawingElementId);
  assert.equal(traced.estimateLines.at(-1).elementId, drawingElementId);
  assert.equal(traced.modelObjects.at(-1).elementId, drawingElementId);
  assert.equal(projectModelMeshDescriptors(traced).at(-1).elementId, drawingElementId);
});
