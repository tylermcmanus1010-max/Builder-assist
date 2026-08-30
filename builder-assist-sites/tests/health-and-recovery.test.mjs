import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const health = fs.readFileSync("app/api/health/route.ts", "utf8");
const boundary = fs.readFileSync("app/error.tsx", "utf8");
const assistify = fs.readFileSync("app/member-portal/assistify/assistify-client.tsx", "utf8");
const modelViewer = fs.readFileSync("app/member-portal/assistify/project-model-viewer.tsx", "utf8");

test("readiness reports D1 and R2 independently without caching", () => {
  assert.match(health, /from\(gen1Workspaces\)\.limit\(1\)/);
  assert.match(health, /SELECT 1 while every user query fails/);
  assert.match(health, /BUCKET\.head/);
  assert.match(health, /status: ready \? 200 : 503/);
  assert.match(health, /"cache-control": "no-store"/);
  assert.doesNotMatch(health, /error\.message|error\.stack/);
});

test("route failures and missing model data provide truthful recovery", () => {
  assert.match(boundary, /Your saved project data was not changed/);
  assert.match(boundary, /onClick=\{reset\}/);
  assert.doesNotMatch(boundary, /error\.message|error\.stack/);
  assert.match(assistify, /Project data could not be loaded/);
  assert.match(assistify, />Retry</);
  assert.match(modelViewer, /No substitute geometry shown/);
  assert.match(modelViewer, /never inherit demonstration geometry/);
});
