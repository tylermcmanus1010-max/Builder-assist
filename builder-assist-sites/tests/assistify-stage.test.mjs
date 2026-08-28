import assert from "node:assert/strict";
import test from "node:test";
import { clampConstructionStage, isObjectVisibleForStage, restoreViewerPreference } from "../lib/assistify-stage.ts";

test("cumulative and current-stage modes control real object visibility", () => {
  assert.equal(isObjectVisibleForStage(1,5,true),true);
  assert.equal(isObjectVisibleForStage(5,5,true),true);
  assert.equal(isObjectVisibleForStage(6,5,true),false);
  assert.equal(isObjectVisibleForStage(4,5,false),false);
  assert.equal(isObjectVisibleForStage(5,5,false),true);
  for (let objectStage=1;objectStage<=11;objectStage++) assert.equal(isObjectVisibleForStage(objectStage,12,false),true);
});

test("invalid and interrupted viewer preferences recover to bounded defaults", () => {
  assert.equal(clampConstructionStage(-100),1);
  assert.equal(clampConstructionStage(100),12);
  assert.equal(clampConstructionStage("6.4"),6);
  assert.deepEqual(restoreViewerPreference("not json"),{stage:1,cumulative:true});
  assert.deepEqual(restoreViewerPreference(JSON.stringify({stage:9,cumulative:false})),{stage:9,cumulative:false});
  assert.deepEqual(restoreViewerPreference(JSON.stringify({stage:99,cumulative:"bad"})),{stage:12,cumulative:true});
});
