import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = (await Promise.all([
  readFile(new URL("../drizzle/0001_whole_azazel.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0002_dapper_freak.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0003_project_model.sql", import.meta.url), "utf8"),
])).join("\n");

test("upload idempotency migration is additive, indexed and workspace-scoped", () => {
  assert.match(migration, /CREATE TABLE `gen1_upload_batches`/);
  assert.match(migration, /workspace_id/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /CREATE UNIQUE INDEX `gen1_upload_batches_workspace_key_unique`/);
  assert.match(migration, /ALTER TABLE `gen1_project_files` ADD `upload_batch_id`/);
  assert.match(migration, /ALTER TABLE `gen1_upload_batches` ADD `created_project`/);
  assert.match(migration, /FOREIGN KEY \(`workspace_id`\).*ON DELETE cascade/);
  assert.match(migration, /FOREIGN KEY \(`project_id`\).*ON DELETE cascade/);
  assert.match(migration, /CREATE TABLE `gen1_project_models`/);
  assert.match(migration, /schema_version/);
  assert.match(migration, /model_version/);
  assert.match(migration, /active_revision_id/);
  assert.match(migration, /model_json/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE `gen1_/i);
});
