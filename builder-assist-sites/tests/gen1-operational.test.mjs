import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [client, api, css] = await Promise.all([
  readFile(new URL("../public/gen1-operational.js", import.meta.url), "utf8"),
  readFile(new URL("../app/api/gen1/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/gen1-operational.css", import.meta.url), "utf8"),
]);

test("Buildify is materials-only and exposes operational comparison and finishes", () => {
  assert.match(client, /data-g1o-category-select/);
  assert.match(client, /Same quantity \+ unit/);
  assert.match(client, /data-finish-form/);
  assert.match(client, /data-save-finish/);
  assert.match(client, /data-delete-finish/);
  assert.doesNotMatch(client, /data-est-field="laborCost"/);
  assert.doesNotMatch(client, /Job Cost/i);
  assert.match(api, /laborCostCents: 0/);
  assert.match(api, /action === "add_finish"/);
});

test("the single plan-set uploader submits one idempotent shared-house intent", () => {
  assert.match(client, /form\.append\("createProjectName"/);
  assert.match(client, /files\.forEach\(file => form\.append\("plans", file\)\)/);
  assert.match(client, /form\.append\("idempotencyKey", upload\.token\)/);
  assert.match(client, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(client, /localStorage\.getItem\(storageKey\)/);
  assert.match(client, /localStorage\.removeItem\(upload\.storageKey\)/);
  assert.doesNotMatch(client, /action: "create_project", name: houseName/);
  assert.match(api, /cleanupUploadBatch/);
  assert.match(api, /combined upload exceeds the 80 MB plan-set limit/);
  assert.match(api, /gen1UploadBatches/);
  assert.match(api, /duplicatePrevented: true/);
  assert.match(api, /UPLOAD_IN_PROGRESS/);
  assert.match(api, /15 \* 60 \* 1000/);
  assert.match(api, /previousBatch\.createdProject/);
  assert.match(api, /gen1ProjectFiles\.uploadBatchId/);
  assert.match(api, /analysisStatus: "uploading"/);
  assert.match(api, /status: "upload_processing"/);
  assert.match(api, /UPLOAD_RECOVERY_REQUIRED/);
  assert.doesNotMatch(api, /if \(projects\.length\) await db\.delete\(gen1Projects\)/);
});

test("Assistify records persist photos and calendar-ready dates without Job Cost", () => {
  const moduleBlock = client.slice(client.indexOf("const MODULES = ["), client.indexOf("const S ="));
  assert.equal((moduleBlock.match(/\{ no: /g) || []).length, 11);
  assert.doesNotMatch(moduleBlock, /no: 18/);
  assert.match(client, /module_evidence:\$\{record\.id\}/);
  assert.match(client, /data-module-photo/);
  assert.match(client, /BEGIN:VCALENDAR/);
  assert.match(client, /Export calendar \(\.ics\)/);
  assert.match(api, /assistify_evidence_upload/);
  assert.match(api, /env\.BUCKET\.delete\(file\.r2Key\)/);
  assert.match(client, /sub === "assistify-operations" \? "assistify"/);
});

test("the selected house drives the plan workspace and responsive controls", () => {
  assert.match(client, /swenka-floor-plan\.png/);
  assert.match(client, /PLAN-LINKED 2\.5D PREVIEW/);
  assert.match(client, /not BIM geometry/);
  assert.match(css, /\.g1o-plan-model-grid/);
  assert.match(css, /@media\(max-width:620px\).*\.g1o-finish-form/);
  assert.match(css, /\.g1o-new-house:focus-within/);
});

test("D1 writes stay below the platform's 100-parameter query limit", () => {
  assert.match(api, /index \+= 4\).*gen1EstimateLines/s);
  assert.match(api, /index \+= 8\).*gen1PhaseTasks/s);
  assert.match(api, /index \+= 4\).*gen1ModuleRecords/s);
  assert.match(api, /for \(const project of projects\) hydratedProjects\.push\(await hydrateProject\(project\)\)/);
  assert.match(api, /gen1ProjectEvents\.eventType, "project_created"/);
  assert.match(api, /await db\.batch\(statements/);
  assert.match(api, /users never reopen a half-recalculated estimate/);
});

test("Gen1 fails closed without authenticated workspace identity and rejects cross-site writes", () => {
  assert.doesNotMatch(api, /gen1@builderassist\.local/);
  assert.match(api, /AUTH_REQUIRED/);
  assert.match(api, /requireSameOrigin\(request\)/);
  assert.match(api, /ORIGIN_FORBIDDEN/);
  assert.match(api, /contact support with the incident ID/);
  assert.match(api, /VALIDATION_ERROR/);
  assert.match(api, /PROJECT_NOT_FOUND/);
  assert.match(api, /publicPath: file\.r2Key\.startsWith\("public:"\)/);
  assert.match(api, /controlledModelKey: file\.r2Key === "public:\/project-plans\/66th-st-approved-plans\.pdf"/);
  assert.doesNotMatch(client, /file\.r2Key/);
  assert.match(api, /assertProjectRecord\("module"/);
  assert.match(api, /assertProjectRecord\("growify"/);
  assert.match(api, /RECORD_NOT_FOUND/);
  assert.match(api, /PAYLOAD_TOO_LARGE/);
  assert.match(api, /Choose a supported record type to delete/);
  assert.match(api, /Two first-load requests may race/);
  assert.match(api, /prj_featured_\$\{workspaceId\}/);
  assert.match(api, /est_seed_\$\{project\.id\}/);
  assert.match(api, /evt_created_\$\{project\.id\}/);
  assert.match(api, /onConflictDoNothing\(\)/);
});
