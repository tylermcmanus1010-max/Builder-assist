import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = (name) => readFile(new URL(`../docs/launch/${name}`, import.meta.url), "utf8").then(JSON.parse);
const [ledger, quota, synthesis, contradictions, traceability, inventory, dependencies] = await Promise.all([
  load("source-ledger.json"), load("research-quota-audit.json"), load("research-synthesis.json"),
  load("research-contradictions.json"), load("traceability-matrix.json"), load("system-inventory.json"), load("dependency-inventory.json"),
]);

test("the audited research ledger satisfies the recorded launch quotas", () => {
  assert.equal(ledger.length, 250);
  assert.deepEqual(ledger.map((row) => row.source_id), Array.from({ length: 250 }, (_, index) => `S${String(index + 1).padStart(3, "0")}`));
  assert.equal(new Set(ledger.map((row) => row.canonical_url)).size, 250);
  assert.equal(new Set(ledger.map((row) => row.domain)).size, quota.unique_domains);
  assert.ok(quota.unique_domains >= 60);
  assert.equal(quota.qualifying_sources, 250);
  assert.equal(Object.values(quota.type_counts).reduce((sum, value) => sum + value, 0), 250);
  assert.equal(quota.revalidation_sample, 25);
  assert.match(quota.audit_status, /^PASSED/);
  assert.match(quota.saturation_status, /^REACHED/);
});

test("research synthesis and contradiction artifacts are complete and evidence linked", () => {
  assert.equal(synthesis.user_delight_catalog.length, 30);
  assert.equal(synthesis.user_pain_catalog.length, 50);
  assert.equal(synthesis.trust_killer_catalog.length, 20);
  assert.equal(synthesis.builder_assist_must_not_rules.length, 50);
  assert.equal(contradictions.length, 10);
  for (const row of contradictions) {
    assert.ok(row.supporting_evidence.length > 0 && row.opposing_evidence.length > 0);
    assert.ok(row.decision && row.validation);
  }
});

test("every P0/P1 launch requirement has a structured evidence-to-code chain", () => {
  assert.deepEqual(traceability.map((row) => row.requirement), Array.from({ length: 16 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`));
  for (const row of traceability) {
    assert.match(row.severity, /^P[01]$/);
    assert.ok(row.sources.length > 0);
    for (const key of ["finding", "user_need", "exposure", "decision", "test", "status", "verification"]) assert.ok(row[key]);
    assert.ok(row.implementation.length > 0);
  }
});

test("system and dependency inventories retain unverified launch blockers", () => {
  assert.ok(inventory.items.length >= 18);
  assert.ok(dependencies.dependencies.length >= 10);
  assert.ok(inventory.items.some((item) => /UNVERIFIED|pending|missing/i.test(`${item.status} ${item.limitation}`)));
  assert.ok(dependencies.open_items.length > 0);
});
