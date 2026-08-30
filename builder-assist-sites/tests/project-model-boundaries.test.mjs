import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [api, schema, client, controls, viewer, threeAdapter, packageJson] = await Promise.all([
  readFile(new URL("../app/api/gen1/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/member-portal/assistify/assistify-client.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/member-portal/assistify/geometry-review-controls.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/member-portal/assistify/project-model-viewer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/project-model-three.ts", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

test("upload commits persisted documents into one canonical model transaction", () => {
  assert.match(api, /lifecycleStatus: "persisted"/);
  assert.match(api, /createProjectModel\(projectId/);
  assert.match(api, /appendSourceDocuments\(current\.model/);
  assert.match(api, /commitProjectModelTransition/);
  assert.match(api, /env\.DB\.batch\(statements\)/);
  assert.match(api, /MODEL_VERSION_CONFLICT/);
  assert.match(schema, /gen1ProjectModels/);
  assert.match(schema, /modelJson: text\("model_json"\)\.notNull/);
});

test("user projects have no hardcoded PropertyModel or implicit demo fallback", () => {
  for (const source of [client, viewer, threeAdapter]) assert.doesNotMatch(source, /getPropertyModel|swenka-4752-25|66th-st-approved-plans\.pdf/);
  assert.doesNotMatch(api, /getPropertyModel|swenka-4752-25/);
  assert.match(api, /searchParams\.get\("demo"\) === "true"/);
  assert.doesNotMatch(api, /controlledModelKey/);
  assert.match(api, /project\.id\.startsWith\("prj_featured_"\) \? estimateLines/);
});

test("Drawing, Takeoff and 3D expose the same canonical element identity", () => {
  assert.match(controls, /data-workspace="drawing"/);
  assert.match(controls, /data-workspace="takeoff"/);
  assert.match(controls, /data-element-id=\{geometry\.elementId\}/);
  assert.match(controls, /data-element-id=\{item\.elementId\}/);
  assert.match(viewer, /data-element-id=\{element\.elementId\}/);
  assert.match(threeAdapter, /mesh\.name = descriptor\.elementId/);
  assert.match(threeAdapter, /mesh\.userData = \{ elementId:/);
});

test("3D uses Three.js and refuses unreviewed or dimensionless walls", () => {
  assert.equal(packageJson.dependencies.three, "0.185.1");
  assert.match(viewer, /THREE\.WebGLRenderer/);
  assert.match(viewer, /OrbitControls/);
  assert.match(threeAdapter, /THREE\.BoxGeometry/);
  assert.doesNotMatch(viewer, /getContext\("2d"\)|height \|\||thickness \|\|/);
  assert.match(viewer, /3D model requires geometry review/);
});
