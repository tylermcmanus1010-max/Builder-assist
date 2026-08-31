import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reconcileBlueprintIR } from "../lib/blueprint-project-model.ts";
import { extractVectorPdf } from "../lib/vector-pdf.ts";
import { createProjectModel, parseStoredProjectModel } from "../lib/project-model.ts";
import { projectModelMeshDescriptors, projectModelObjectIdentities } from "../lib/project-model-mesh.ts";

const fixture = await readFile(new URL("./fixtures/synthetic-vector-floor-plan.pdf", import.meta.url));
const provenance = JSON.parse(await readFile(new URL("./fixtures/synthetic-vector-floor-plan.provenance.json", import.meta.url), "utf8"));
const projectId = "project-synthetic-vector-001";
const revisionId = "revision-synthetic-vector-001";
const documentId = `doc_${createHash("sha256").update(fixture).digest("hex").slice(0, 20)}`;
const source = { documentId, projectId, filename: "synthetic-vector-floor-plan.pdf", contentType: "application/pdf", sizeBytes: fixture.byteLength, lifecycleStatus: "persisted", storageKey: `projects/${projectId}/${documentId}.pdf`, sha256: createHash("sha256").update(fixture).digest("hex"), pageCount: 1, sheetIds: [] };

async function extractedModel() {
  const uploaded = createProjectModel(projectId, revisionId, [source]);
  const ir = await extractVectorPdf(fixture, { projectId, revisionId, sourceDocumentId: documentId, sheetIds: uploaded.sourceDocuments[0].sheetIds, extractedAt: "2026-08-30T12:00:00.000Z" });
  return { ir, model: reconcileBlueprintIR(uploaded, ir) };
}

test("synthetic vector fixture has explicit reusable provenance and no customer data", () => {
  assert.equal(fixture.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.equal(provenance.license, "CC0-1.0");
  assert.equal(provenance.thirdPartyData, false);
  assert.equal(provenance.customerData, false);
  assert.equal(provenance.excludedCustomerFixtures, true);
});

test("persisted vector PDF extracts sheet, viewport, text, vectors, scale, dimension, notes and walls", async () => {
  const { ir, model } = await extractedModel();
  assert.equal(ir.schemaVersion, "0.1");
  assert.equal(ir.sheets[0].classification, "floor_plan");
  assert.equal(ir.viewports.length, 1);
  assert.ok(ir.textBlocks.some((block) => block.text === "FLOOR PLAN"));
  assert.ok(ir.vectorPrimitives.length >= 9);
  const scale = ir.scaleCandidates.find((candidate) => candidate.status === "dimension_verified");
  assert.equal(scale?.ratio, 48);
  assert.equal(ir.dimensions.find((dimension) => dimension.text === "20'-0\"")?.value, 20);
  assert.ok(ir.organizedNotes.some((note) => note.category === "materials" && note.text.includes("EXTERIOR WALLS")));
  assert.equal(ir.geometryCandidates.length, 4);
  assert.equal(model.blueprintIRs[0].sourceDocumentId, documentId);
  assert.equal(model.sheets[0].scaleCalibration.calibratedBy, "document_extraction");
  assert.equal(model.status, "geometry_review");
});

test("reload preserves stable wall identity across Drawing, Takeoff, Estimate, Reports and Three.js", async () => {
  const first = await extractedModel();
  const second = await extractedModel();
  const reloaded = parseStoredProjectModel(JSON.stringify(first.model));
  const ids = reloaded.buildingElements.map((element) => element.elementId).sort();
  assert.deepEqual(ids, second.model.buildingElements.map((element) => element.elementId).sort(), "deterministic reprocessing");
  for (const elementId of ids) {
    assert.ok(reloaded.geometry2D.some((geometry) => geometry.elementId === elementId), "Drawing");
    assert.ok(reloaded.takeoffItems.some((item) => item.elementId === elementId), "Takeoff");
    assert.ok(reloaded.estimateLines.some((line) => line.elementId === elementId), "Estimate");
    assert.ok(reloaded.reports.some((report) => report.elementIds.includes(elementId)), "Reports");
    assert.ok(projectModelObjectIdentities(reloaded).some((identity) => identity.elementId === elementId), "Three.js identity");
  }
  assert.equal(projectModelMeshDescriptors(reloaded).length, 0, "preliminary walls do not render as approved geometry");
  assert.ok(reloaded.buildingElements.every((element) => element.reviewStatus === "requires_review"));
});
