import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { reconcileBlueprintIR } from "../lib/blueprint-project-model.ts";
import { extractVectorPdf } from "../lib/vector-pdf.ts";
import { applyWallDimensionDefaults, createProjectModel, reviewBuildingElements, validateProjectModel } from "../lib/project-model.ts";
import { preliminaryWallMeshDescriptors, projectModelMeshDescriptors } from "../lib/project-model-mesh.ts";

// A synthetic single-page vector plan (CC0, generated in-test, no customer
// data): one horizontal wall whose faces are split into three fragments by
// door openings, one continuous vertical wall, and NO written scale text.
function syntheticFragmentedPlan() {
  const content = [
    "q", "0.5 w",
    // Horizontal wall, faces at y=300 and y=309, fragmented with small gaps.
    "100 300 m 200 300 l S", "204 300 m 320 300 l S", "326 300 m 460 300 l S",
    "100 309 m 200 309 l S", "204 309 m 320 309 l S", "326 309 m 460 309 l S",
    // Vertical wall, faces at x=100 and x=109.
    "100 100 m 100 260 l S", "109 100 m 109 260 l S",
    "BT /F1 12 Tf 72 540 Td (FLOOR PLAN) Tj ET",
    "Q", "",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n% synthetic in-test fixture; no customer data.\n";
  for (let index = 0; index < objects.length; index += 1) pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const fixture = syntheticFragmentedPlan();
const projectId = "project-preliminary-001";
const revisionId = "revision-preliminary-001";
const documentId = `doc_${createHash("sha256").update(fixture).digest("hex").slice(0, 20)}`;
const source = { documentId, projectId, filename: "fragmented-plan.pdf", contentType: "application/pdf", sizeBytes: fixture.byteLength, lifecycleStatus: "persisted", storageKey: `projects/${projectId}/${documentId}.pdf`, sha256: createHash("sha256").update(fixture).digest("hex"), pageCount: 1, sheetIds: [] };

async function extractedModel() {
  const uploaded = createProjectModel(projectId, revisionId, [source]);
  const ir = await extractVectorPdf(fixture, { projectId, revisionId, sourceDocumentId: documentId, sheetIds: uploaded.sourceDocuments[0].sheetIds, extractedAt: "2026-08-31T12:00:00.000Z" });
  return { ir, model: reconcileBlueprintIR(uploaded, ir) };
}

test("fragmented wall faces merge into one candidate per real wall", async () => {
  const { ir } = await extractedModel();
  assert.equal(ir.geometryCandidates.length, 2, "three fragments of one wall become one candidate, plus the vertical wall");
  const horizontal = ir.geometryCandidates.find((candidate) => candidate.points[0].y === candidate.points[1].y);
  assert.ok(horizontal, "merged horizontal wall exists");
  assert.equal(Math.min(horizontal.points[0].x, horizontal.points[1].x), 100);
  assert.equal(Math.max(horizontal.points[0].x, horizontal.points[1].x), 460);
});

test("a preliminary model assembles without a verified scale or wall-height note", async () => {
  const { model } = await extractedModel();
  assert.equal(model.buildingElements.length, 2);
  for (const element of model.buildingElements) {
    assert.equal(element.reviewStatus, "requires_review");
    assert.equal(element.dimensions.height, 9, "typical height applied as an explicit assumption");
    assert.ok(element.assumptions.some((assumption) => /1\/4" = 1'-0" plan scale is assumed/.test(assumption)), "assumed scale is recorded");
    assert.ok(element.assumptions.some((assumption) => /typical 9 ft height is assumed/.test(assumption)), "assumed height is recorded");
    assert.ok(element.inferredFields.includes("scale") && element.inferredFields.includes("height"));
  }
  assert.ok(model.issues.some((issue) => issue.title === "Drawing scale is preliminary" && issue.status === "open"));
  assert.equal(projectModelMeshDescriptors(model).length, 0, "nothing preliminary renders as approved geometry");
  assert.equal(preliminaryWallMeshDescriptors(model).length, 2, "preliminary walls render in the clearly-labeled preliminary layer");
});

test("building basics apply to every preliminary wall in one command", async () => {
  const { model } = await extractedModel();
  const updated = applyWallDimensionDefaults(model, { height: 10, thickness: .6, appliedAt: "2026-08-31T12:05:00.000Z" });
  assert.equal(updated.modelVersion, model.modelVersion + 1);
  for (const element of updated.buildingElements) {
    assert.equal(element.dimensions.height, 10);
    assert.equal(element.dimensions.thickness, .6);
    assert.ok(element.assumptions.some((assumption) => /applied by the user/.test(assumption)));
  }
  assert.throws(() => applyWallDimensionDefaults(model, { appliedAt: "2026-08-31T12:05:00.000Z" }), /height or thickness/);
});

test("bulk confirmation approves all preliminary walls and readies the model", async () => {
  const { model } = await extractedModel();
  const reviewed = reviewBuildingElements(model, { decision: "approved", reviewedAt: "2026-08-31T12:10:00.000Z", description: "Confirmed against the uploaded plan set." });
  assert.equal(reviewed.status, "ready");
  assert.ok(reviewed.buildingElements.every((element) => element.reviewStatus === "approved" && element.reviewEvidence));
  assert.equal(projectModelMeshDescriptors(reviewed).length, 2, "confirmed walls render as approved geometry");
  assert.equal(preliminaryWallMeshDescriptors(reviewed).length, 0);
  assert.ok(!reviewed.issues.some((issue) => issue.title === "Extracted wall geometry requires review"));
  assert.ok(reviewed.modelObjects.every((object) => object.reviewStatus === "approved"));
  assert.ok(reviewed.estimateLines.every((line) => line.reviewStatus === "approved"));
  validateProjectModel(JSON.parse(JSON.stringify(reviewed)));
});

test("removing a wrong detection deletes it from every projection", async () => {
  const { model } = await extractedModel();
  const removedId = model.buildingElements[0].elementId;
  const remainingId = model.buildingElements[1].elementId;
  const cleaned = reviewBuildingElements(model, { elementIds: [removedId], decision: "removed", reviewedAt: "2026-08-31T12:15:00.000Z", description: "Not a wall on the plans." });
  for (const collection of [cleaned.buildingElements, cleaned.geometry2D, cleaned.takeoffItems, cleaned.estimateLines, cleaned.modelObjects]) {
    assert.ok(!collection.some((item) => item.elementId === removedId));
  }
  assert.ok(!cleaned.reports.some((report) => report.elementIds.includes(removedId)));
  assert.ok(cleaned.buildingElements.some((element) => element.elementId === remainingId));
  validateProjectModel(cleaned);
  assert.throws(() => reviewBuildingElements(model, { elementIds: ["elm_missing"], decision: "approved", reviewedAt: "2026-08-31T12:16:00.000Z", description: "x" }), /no longer exist/);
});
