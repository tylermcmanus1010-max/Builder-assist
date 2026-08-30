import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createProjectModel, parseStoredProjectModel, recordScaleCalibration, traceWall } from "../lib/project-model.ts";
import { projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

let threeAdapter = null;
try { threeAdapter = await import("../lib/project-model-three.ts"); }
catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const fixturePath = process.env.BOULDER9_PDF_FIXTURE;
const fixtureBytes = fixturePath ? await readFile(fixturePath) : null;

const identity = {
  projectId: "project-boulder9-fernandez",
  revisionId: "revision-boulder9-source-001",
  sourceDocumentId: "source-boulder9-plans-pdf-001",
  elementId: "element-boulder9-level1-wall-trace-001",
  sourceGeometryId: "geom-boulder9-p03-wall-trace-001",
};

const sourceDocument = {
  documentId: identity.sourceDocumentId,
  projectId: identity.projectId,
  filename: "01-BOULDER-9-PLANS-20260830-073852-.pdf",
  contentType: "application/pdf",
  sizeBytes: 11746217,
  lifecycleStatus: "persisted",
  storageKey: `projects/${identity.projectId}/${identity.sourceDocumentId}.pdf`,
  sha256: "8e30a0ddd7af2218e7cd8162d0882b7561b2661df8662ca11d649938f76f62f4",
  pageCount: 14,
  sheetIds: [],
};

function calibratedModel() {
  const uploaded = createProjectModel(identity.projectId, identity.revisionId, [sourceDocument]);
  const sheet = uploaded.sheets.find((candidate) => candidate.pageNumber === 3);
  assert.ok(sheet, "page 3 is represented by a stable sheet");
  const calibrated = recordScaleCalibration(uploaded, {
    sheetId: sheet.sheetId,
    drawingDistance: 26,
    drawingUnits: "in",
    realDistance: 104,
    units: "ft",
    calibratedAt: "2026-08-30T08:00:00.000Z",
    evidence: {
      sourceDocumentId: identity.sourceDocumentId,
      pageNumber: 3,
      description: "Architectural floor plan, page 3: 104'-0\" overall dimension at 1/4 inch = 1 foot.",
    },
  });
  return { calibrated, sheet: calibrated.sheets.find((candidate) => candidate.sheetId === sheet.sheetId) };
}

test("Boulder 9 acceptance source matches the uploaded 14-page plan-set bytes", { skip: !fixtureBytes && "Set BOULDER9_PDF_FIXTURE to the uploaded plan-set path." }, () => {
  assert.equal(fixtureBytes.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.equal(fixtureBytes.byteLength, sourceDocument.sizeBytes);
  assert.equal(createHash("sha256").update(fixtureBytes).digest("hex"), sourceDocument.sha256);
});

test("Boulder 9 incomplete wall fails closed with an actionable 3D review item", () => {
  const { calibrated, sheet } = calibratedModel();
  const traced = traceWall(calibrated, {
    elementId: identity.elementId,
    sheetId: sheet.sheetId,
    sourceGeometryId: identity.sourceGeometryId,
    levelId: "level-boulder9-01",
    levelName: "Level 1",
    levelElevation: 0,
    start: { x: 0, y: 0 },
    end: { x: 3, y: 0 },
  });
  assert.equal(traced.status, "geometry_review");
  assert.equal(traced.buildingElements[0].reviewStatus, "requires_review");
  assert.equal(traced.modelObjects.length, 0);
  assert.ok(traced.issues.some((issue) => issue.elementId === identity.elementId && issue.title === "3D model requires geometry review"));
  assert.equal(projectModelMeshDescriptors(traced).length, 0, "unreviewed geometry produces no inferred mesh descriptor");
});

test("Boulder 9 upload, reload, scale and reviewed trace preserve identity through Drawing, Takeoff, Estimate and Three.js", () => {
  const upload = new File([fixtureBytes || Buffer.from("%PDF-fixture-manifest-only")], sourceDocument.filename, { type: sourceDocument.contentType });
  const { calibrated, sheet } = calibratedModel();
  assert.equal(calibrated.projectId, identity.projectId);
  assert.equal(calibrated.activeRevisionId, identity.revisionId);
  assert.equal(calibrated.sourceDocuments[0].documentId, identity.sourceDocumentId);
  assert.equal(calibrated.sourceDocuments[0].lifecycleStatus, "persisted");
  assert.equal(calibrated.sourceDocuments[0].filename, upload.name);
  assert.equal(sheet.scaleCalibration.evidence.sourceDocumentId, identity.sourceDocumentId);
  assert.equal(sheet.scaleCalibration.evidence.pageNumber, 3);

  const traced = traceWall(calibrated, {
    elementId: identity.elementId,
    sheetId: sheet.sheetId,
    sourceGeometryId: identity.sourceGeometryId,
    levelId: "level-boulder9-01",
    levelName: "Level 1",
    levelElevation: 0,
    start: { x: 0, y: 0 },
    end: { x: 3, y: 0 },
    height: 10,
    thickness: .5,
    reviewEvidence: {
      reviewedAt: "2026-08-30T08:05:00.000Z",
      reviewedBy: "user",
      sourceDocumentId: identity.sourceDocumentId,
      pageNumber: 3,
      description: "Acceptance-test dimensions explicitly approved by the geometry reviewer; not automatically extracted.",
    },
  });
  const reloaded = parseStoredProjectModel(JSON.stringify(traced));

  assert.equal(reloaded.geometry2D[0].elementId, identity.elementId, "Drawing");
  assert.equal(reloaded.geometry2D[0].geometryId, identity.sourceGeometryId, "Drawing source geometry");
  assert.equal(reloaded.buildingElements[0].elementId, identity.elementId, "ProjectModel building element");
  assert.equal(reloaded.takeoffItems[0].elementId, identity.elementId, "Takeoff");
  assert.equal(reloaded.estimateLines[0].elementId, identity.elementId, "Estimate provenance");
  assert.equal(reloaded.modelObjects[0].elementId, identity.elementId, "3D projection");
  assert.equal(reloaded.takeoffItems.length, 1, "no demo takeoff quantity is inherited");
  assert.equal(reloaded.estimateLines.length, 1, "no demo estimate quantity is inherited");
  assert.equal(reloaded.buildingElements.length, 1, "no demo geometry is inherited");

  const descriptor = projectModelMeshDescriptors(reloaded)[0];
  assert.equal(descriptor.elementId, identity.elementId);
  assert.equal(descriptor.projectId, identity.projectId);
  assert.equal(descriptor.revisionId, identity.revisionId);
  assert.equal(descriptor.sheetId, sheet.sheetId);
  assert.equal(descriptor.sourceGeometryId, identity.sourceGeometryId);
});

test("Boulder 9 reviewed wall identity reaches Three.js mesh userData", { skip: !threeAdapter && "The installed Three.js dependency is required for mesh execution." }, () => {
  const { calibrated, sheet } = calibratedModel();
  const traced = traceWall(calibrated, {
    elementId: identity.elementId,
    sheetId: sheet.sheetId,
    sourceGeometryId: identity.sourceGeometryId,
    levelId: "level-boulder9-01",
    levelName: "Level 1",
    levelElevation: 0,
    start: { x: 0, y: 0 },
    end: { x: 3, y: 0 },
    height: 10,
    thickness: .5,
    reviewEvidence: { reviewedAt: "2026-08-30T08:05:00.000Z", reviewedBy: "user", sourceDocumentId: identity.sourceDocumentId, pageNumber: 3, description: "Acceptance-test dimensions explicitly approved by the geometry reviewer; not automatically extracted." },
  });
  const group = threeAdapter.createProjectModelGroup(traced);
  assert.equal(group.children.length, 1);
  assert.deepEqual(group.children[0].userData, {
    elementId: identity.elementId,
    projectId: identity.projectId,
    revisionId: identity.revisionId,
    sheetId: sheet.sheetId,
    sourceGeometryId: identity.sourceGeometryId,
  });
  threeAdapter.disposeProjectModelGroup(group);
});
