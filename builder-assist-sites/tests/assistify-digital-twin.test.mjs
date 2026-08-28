import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [client, engine, models, api, css, staticHtml, operational, planRegister, verification, pkg] = await Promise.all([
  readFile(new URL("../app/member-portal/assistify/assistify-client.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/member-portal/assistify/project-model-viewer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/property-models.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/gen1/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/gen1-operational.js", import.meta.url), "utf8"),
  readFile(new URL("../docs/launch/plan-sheet-register.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../docs/launch/plan-to-model-verification.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

test("Assistify uses one reusable project-model engine and the active house supplies its data", () => {
  assert.match(client, /<ProjectModelViewer/);
  assert.match(client, /model=\{activeProject\.model\}/);
  assert.match(client, /key=\{activeProject\.id\}/);
  assert.match(api, /getPropertyModel\(controlledModelKey\)/);
  assert.match(api, /modelStatus: model \? "ready"/);
  assert.match(engine, /export function ProjectModelViewer/);
  assert.doesNotMatch(client, /<iframe|vanhorn-reader/i);
});
test("the deleted reference residence is absent from all shipped viewer surfaces", () => {
  for (const source of [client, engine, models, api, css, staticHtml, operational]) {
    assert.doesNotMatch(source, /van[ -]?horn|hubble construction/i);
  }
  assert.doesNotMatch(staticHtml, /window\.__BP3D|BP3D_MARKUP|viewVanHornReader/);
});

test("the block-massing Three.js engine remains removed", () => {
  for (const value of ["THREE", "BoxGeometry", "MeshStandardMaterial", "OrbitControls"]) assert.doesNotMatch(engine, new RegExp(value));
  assert.equal(pkg.dependencies.three, undefined);
  assert.equal(pkg.devDependencies["@types/three"], undefined);
  assert.match(engine, /getContext\("2d"\)/);
  assert.match(engine, /sceneFor\(model\)/);
});

test("the current controlled property model is source-linked rather than generic", () => {
  assert.match(models, /key: "swenka-4752-25"/);
  assert.match(models, /projectName: "Swenka Residence"/);
  assert.match(models, /130′-6″ OVERALL/);
  assert.match(models, /87′-6″ OVERALL/);
  for (const sheet of ["A103", "A107", "S001", "S003", "A108", "E001", "E002"]) assert.match(models, new RegExp(sheet));
  assert.match(models, /Coordinates are calibrated in feet/);
  assert.match(models, /another property/i);
});

test("the reusable engine provides all twelve construction stages and controls real geometry", () => {
  assert.equal((models.match(/\{ id: \d+, title:/g) || []).length, 12);
  for (const stage of ["Parcel, survey & existing topography", "Underground utilities & drainage", "Footings & foundation", "Structural framing", "MEP rough-in", "Final coordinated digital twin"]) assert.match(models, new RegExp(stage));
  assert.match(engine, /face\.primitive\.stage > stage/);
  assert.match(engine, /model\.primitives\.filter/);
  assert.match(engine, /setInterval/);
  assert.match(engine, /Previous/);
  assert.match(engine, /Play/);
  assert.match(engine, /Next/);
});

test("orbit, zoom, keyboard, selection, dimensions and recovery are implemented", () => {
  assert.match(engine, /onPointerDown/);
  assert.match(engine, /onPointerMove/);
  assert.match(engine, /onWheel/);
  assert.match(engine, /onKeyDown/);
  assert.match(engine, /pointInPolygon/);
  assert.match(engine, /model\.dimensions\.filter/);
  assert.match(engine, /resetCamera/);
  assert.match(engine, /Auto orbit/);
  assert.match(engine, /Dimensions/);
  assert.match(engine, /Top/);
  assert.match(engine, /Reset/);
});

test("houses without issued geometry show an honest pending state", () => {
  assert.match(engine, /No substitute geometry shown/);
  assert.match(engine, /its project-specific geometry has not been issued/);
  assert.match(client, /Another property will never be substituted/);
  assert.match(api, /"awaiting_model"/);
  assert.match(api, /"awaiting_plans"/);
});

test("evidence states and unresolved parcel conflicts remain visible", () => {
  for (const state of ["Verified from controlling plan", "Scaled from plan", "Inferred from multiple plan references", "Assumed for visualization", "Unresolved"]) assert.match(models, new RegExp(state));
  assert.match(models, /official cadastral reconciliation remains pending/i);
  assert.match(engine, /evidenceClass/);
});

test("all supplied plan sheets remain inventoried and explicit controls remain tested", () => {
  assert.equal(planRegister.page_count, 18);
  assert.equal(planRegister.sheets.length, 18);
  assert.deepEqual(planRegister.sheets.map((sheet) => sheet.page), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.equal(verification.checks.filter((check) => check.result === "PASS").length, 6);
  assert.ok(verification.checks.some((check) => check.element.includes("Parcel") && check.result === "UNVERIFIED"));
});

test("the project model remains viewport-bound and responsive", () => {
  assert.match(css, /\.pmv-shell \{[^}]*min-height:0/);
  assert.match(css, /\.pmv-main \{[^}]*overflow:hidden/);
  assert.match(css, /\.pmv-viewport \{[^}]*overflow:hidden/);
  assert.match(css, /@media \(max-width:900px\)/);
  assert.match(css, /@media \(max-width:600px\)/);
  assert.match(css, /body:has\(\.assistify-shell\) \{ overflow: hidden/);
  assert.match(client, /member-portal\/assistify-operations/);
});
