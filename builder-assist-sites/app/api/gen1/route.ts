import { env } from "cloudflare:workers";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { hasExpectedFileSignature, safeStorageFilename, validIdempotencyKey } from "../../../lib/upload-security";
import { appendSourceDocuments, applyWallDimensionDefaults, createProjectModel, parseStoredProjectModel, ProjectModelValidationError, recordScaleCalibration, reviewBuildingElements, traceWall, validateProjectModel, type Point2, type ProjectModel, type SourceDocument } from "../../../lib/project-model";
import { reconcileBlueprintIR } from "../../../lib/blueprint-project-model";
import { countVectorPdfPages, extractVectorPdf, VectorPdfExtractionError } from "../../../lib/vector-pdf";
import {
  gen1EstimateLines,
  gen1FinishSelections,
  gen1GrowifyRecords,
  gen1ModuleRecords,
  gen1PhaseTasks,
  gen1ProjectEvents,
  gen1ProjectFiles,
  gen1ProjectModels,
  gen1Projects,
  gen1UploadBatches,
  gen1Workspaces,
} from "../../../db/schema";

const PHASE_TASKS = [
  ["Create project shell and owner record", "Confirm goals, quality level and target occupancy", "Build responsibility matrix and communication protocol", "Set preliminary budget and schedule", "Approve project charter and handoff"],
  ["Verify ownership and legal description", "Confirm zoning, setbacks and coverage", "Map easements, access and drainage", "Review environmental and hazard constraints", "Issue lot acceptance decision"],
  ["Procure boundary and topographic survey", "Establish benchmarks and control", "Complete geotechnical investigation", "Verify utility locations and capacities", "Close site-investigation RFIs"],
  ["Develop site-layout alternatives", "Develop dimensioned floor plans", "Review massing and elevations", "Align structural and MEP concepts", "Capture owner schematic approval"],
  ["Complete architectural documents", "Complete structural design", "Coordinate civil and drainage design", "Coordinate MEP and low-voltage", "Run constructability and code review"],
  ["Confirm jurisdiction requirements", "Submit building and site permits", "Track comments and resubmittals", "Coordinate HOA and utilities", "Record permit conditions and inspection sequence"],
  ["Reconcile estimate and contingency", "Issue and level bid packages", "Execute contracts and purchase orders", "Release long-lead procurement", "Hold construction-readiness review"],
  ["Document preconstruction conditions", "Install temporary controls", "Establish layout control", "Install erosion and dust controls", "Complete mobilization inspection"],
  ["Excavate and test soils", "Establish pad and footing elevations", "Install underground utilities", "Coordinate sleeves and vapor systems", "Complete pre-pour inspections"],
  ["Review placement plan and access", "Place foundations and slab", "Perform concrete testing", "Verify anchors and elevations", "Complete cure, backfill and drainage"],
  ["Verify plates, anchors and hold-downs", "Frame walls, floors and openings", "Set trusses and roof framing", "Coordinate blocking and penetrations", "Complete framing inspection"],
  ["Install roofing and flashings", "Install windows and exterior doors", "Install weather barrier", "Complete sealants and water details", "Run enclosure QA"],
  ["Confirm coordinated rough layouts", "Install plumbing and gas rough", "Install HVAC rough", "Install electrical, fire and low-voltage", "Test and approve concealment"],
  ["Install insulation and air sealing", "Hang and finish drywall", "Complete cabinets, tile, flooring and paint", "Install fixtures and finish devices", "Complete hardscape and final grading"],
  ["Run completion and life-safety audit", "Complete contractor and owner punch", "Pass finals and secure CO", "Deliver closeout and training", "Launch warranty follow-up"],
] as const;

const FINISHES = [
  ["Cabinetry", "Kitchen and bath cabinetry", 3250000],
  ["Countertops", "Kitchen and bath countertops", 1480000],
  ["Flooring", "Finished flooring package", 2125000],
  ["Interior paint", "Interior paint colors and sheen", 1275000],
  ["Plumbing fixtures", "Decorative plumbing fixtures", 980000],
  ["Lighting", "Decorative lighting package", 1150000],
  ["Appliances", "Kitchen and laundry appliances", 1850000],
  ["Hardware", "Interior door and cabinet hardware", 640000],
] as const;

const ASSISTIFY_SEEDS = [
  { moduleNo: 6, recordType: "readiness gate", title: "Approved plan set received", status: "approved", owner: "Project manager", notes: "City of Scottsdale plan check 4752-25 is the active construction baseline.", payload: { gate: "Permit drawings", source: "Buildify plan set", evidence: "A000-S003 approved set" } },
  { moduleNo: 7, recordType: "schedule activity", title: "Construction kickoff and mobilization", status: "open", owner: "Superintendent", notes: "Confirm start authorization, long-lead releases, and site access before mobilization.", payload: { startDate: "2026-09-07", endDate: "2026-09-11", progress: 0, dependency: "Readiness gate approved", trade: "General contractor" } },
  { moduleNo: 8, recordType: "task", title: "Post approved plans on jobsite", status: "in_progress", owner: "Superintendent", notes: "The City-approved set must remain on site throughout construction.", payload: { priority: "high", evidenceRequired: "Jobsite photo", workflow: "Field readiness" } },
  { moduleNo: 9, recordType: "daily log", title: "Preconstruction site walk", status: "complete", owner: "Superintendent", notes: "Document access, neighboring conditions, utility locations, and existing protection requirements.", payload: { logDate: "2026-08-27", weather: "Clear", crewCount: 2, laborHours: 4, delayHours: 0 } },
  { moduleNo: 11, recordType: "visual evidence", title: "Existing-condition photo set", status: "open", owner: "Field engineer", notes: "Capture lot, access, adjacent property, utilities, and drainage before mobilization.", payload: { location: "12228 N 66th St", trade: "General contractor", captureType: "Before construction" } },
  { moduleNo: 12, recordType: "submittal", title: "Premanufactured truss deferred submittal", status: "open", owner: "Project engineer", notes: "Approved plans identify truss designs as a deferred submittal.", payload: { itemType: "Submittal", reference: "A000 / S002", costImpactCents: 0, scheduleImpactDays: 0, ballInCourt: "Structural engineer" } },
  { moduleNo: 13, recordType: "inspection / quality item", title: "Fire sprinkler permit and inspection path", status: "open", owner: "Project manager", notes: "Separate deferred submittal and approval are required by Scottsdale Fire Department.", payload: { itemType: "Permit / inspection", location: "Whole house", severity: "critical", evidenceRequired: "Approved fire set" } },
  { moduleNo: 14, recordType: "trade compliance", title: "Truss supplier compliance package", status: "open", owner: "Procurement lead", notes: "Collect insurance, license, tax form, engineering package, and approved shop drawings.", payload: { company: "Unassigned truss supplier", trade: "Structural framing", requirement: "Insurance + engineered submittal", expiresOn: "" } },
  { moduleNo: 17, recordType: "change event", title: "Approved-plan baseline established", status: "approved", owner: "Project manager", notes: "Future scope deviations must be priced in Buildify and routed through Growify for owner approval.", payload: { reason: "Baseline control", costImpactCents: 0, scheduleImpactDays: 0, approvalPath: "Buildify pricing -> Growify approval" } },
  { moduleNo: 22, recordType: "time / crew entry", title: "Preconstruction coordination crew", status: "approved", owner: "Superintendent", notes: "Initial field and plan coordination time entry.", payload: { workDate: "2026-08-27", crew: "Preconstruction team", hours: 4, workers: 2, costCode: "01-PRECON", equipment: "Site vehicle" } },
  { moduleNo: 25, recordType: "trade request", title: "Issue truss coordination request", status: "open", owner: "Procurement lead", notes: "Trade partner receives only the approved plan sheets, response date, and required submittal action.", payload: { company: "Unassigned truss supplier", requestType: "Submittal request", responseDue: "2026-09-10", accessScope: "A105, S002, S003" } },
] as const;

type EstimateTemplateLine = {
  category: string;
  item: string;
  unit: string;
  q: (sf: number, stories: number, garage: number) => number;
  material: (sf: number, stories: number, garage: number) => number;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ESTIMATE_TEMPLATE: EstimateTemplateLine[] = [
  { category: "Sitework", item: "Survey, mobilization, earthwork and temporary controls", unit: "allowance", q: () => 1, material: () => 2450000 },
  { category: "Concrete", item: "Foundation, reinforcement and slab materials", unit: "sf", q: (sf: number) => sf, material: () => 1850 },
  { category: "Framing", item: "Structural framing lumber and hardware", unit: "sf", q: (sf: number) => sf, material: () => 1425 },
  { category: "Roofing", item: "Roof structure covering, flashing and drainage", unit: "roof sf", q: (sf: number) => Math.round(sf * .72), material: () => 790 },
  { category: "Exterior envelope", item: "Weather barrier, stucco/siding and exterior trim", unit: "wall sf", q: (sf: number, stories: number) => Math.round(sf * (stories > 1 ? 1.35 : .95)), material: () => 925 },
  { category: "Openings", item: "Windows, exterior doors and garage doors", unit: "opening", q: (sf: number, _stories: number, garage: number) => Math.max(18, Math.round(sf / 125) + garage), material: () => 132500 },
  { category: "Plumbing rough", item: "Water, waste, vent, gas and rough fixtures", unit: "fixture", q: (sf: number) => Math.max(14, Math.round(sf / 135)), material: () => 48500 },
  { category: "Electrical rough", item: "Service, wiring, devices and life safety rough", unit: "sf", q: (sf: number) => sf, material: () => 515 },
  { category: "HVAC", item: "Heating, cooling, ventilation and controls", unit: "ton", q: (sf: number) => Math.max(2, Math.ceil(sf / 600)), material: () => 315000 },
  { category: "Insulation", item: "Thermal and air-sealing package", unit: "sf", q: (sf: number) => Math.round(sf * 1.65), material: () => 195 },
  { category: "Drywall", item: "Drywall board, finishing and texture", unit: "board sf", q: (sf: number) => Math.round(sf * 3.15), material: () => 98 },
  { category: "General requirements", item: "Supervision, permits, testing, safety and closeout", unit: "allowance", q: () => 1, material: () => 1850000 },
];

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function ownerEmail(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) throw new ApiError(401, "AUTH_REQUIRED", "Sign in to access this Builder Assist workspace.");
  if (email.length > 320 || !email.includes("@")) throw new ApiError(401, "AUTH_INVALID", "Your authenticated workspace identity is invalid.");
  return email;
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin && new URL(origin).origin === new URL(request.url).origin) return;
  if (!origin && fetchSite === "same-origin") return;
  throw new ApiError(403, "ORIGIN_FORBIDDEN", "This update must be started from Builder Assist.");
}

function errorResponse(error: unknown, operation: "GET" | "POST") {
  const requestId = crypto.randomUUID();
  console.error(`Gen1 ${operation} failed [${requestId}]`, error);
  if (error instanceof ApiError) {
    return Response.json({ error: error.message, code: error.code, requestId }, { status: error.status });
  }
  return Response.json({ error: "Builder Assist could not complete the request. Retry once; if it still fails, contact support with the incident ID.", code: "INTERNAL_ERROR", requestId }, { status: 500 });
}

function now() {
  return new Date().toISOString();
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function requiredText(value: unknown, label: string, maxLength = 180) {
  const text = String(value || "").trim();
  if (!text) throw new ApiError(400, "VALIDATION_ERROR", `${label} is required.`);
  return text.slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safePayload(value: unknown, label = "Record details") {
  const payload = JSON.stringify(value && typeof value === "object" ? value : {});
  if (payload.length > 50_000) throw new ApiError(413, "PAYLOAD_TOO_LARGE", `${label} must be smaller than 50 KB.`);
  return payload;
}

function optionalDate(value: unknown, label: string) {
  const date = optionalText(value, 10);
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new ApiError(400, "VALIDATION_ERROR", `${label} must be a valid date.`);
  return date;
}

function contactEmail(value: unknown) {
  const email = optionalText(value, 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "VALIDATION_ERROR", "Contact email must be valid.");
  return email;
}

async function assertProjectRecord(table: "estimate" | "finish" | "task" | "module" | "growify", recordId: string, projectId: string) {
  if (!recordId) throw new ApiError(400, "VALIDATION_ERROR", "A record identifier is required.");
  const db = getDb();
  const rows = table === "estimate" ? await db.select({ id: gen1EstimateLines.id }).from(gen1EstimateLines).where(and(eq(gen1EstimateLines.id, recordId), eq(gen1EstimateLines.projectId, projectId))).limit(1)
    : table === "finish" ? await db.select({ id: gen1FinishSelections.id }).from(gen1FinishSelections).where(and(eq(gen1FinishSelections.id, recordId), eq(gen1FinishSelections.projectId, projectId))).limit(1)
    : table === "task" ? await db.select({ id: gen1PhaseTasks.id }).from(gen1PhaseTasks).where(and(eq(gen1PhaseTasks.id, recordId), eq(gen1PhaseTasks.projectId, projectId))).limit(1)
    : table === "module" ? await db.select({ id: gen1ModuleRecords.id }).from(gen1ModuleRecords).where(and(eq(gen1ModuleRecords.id, recordId), eq(gen1ModuleRecords.projectId, projectId))).limit(1)
    : await db.select({ id: gen1GrowifyRecords.id }).from(gen1GrowifyRecords).where(and(eq(gen1GrowifyRecords.id, recordId), eq(gen1GrowifyRecords.projectId, projectId))).limit(1);
  if (!rows.length) throw new ApiError(404, "RECORD_NOT_FOUND", "This record no longer exists in the selected house. Refresh before retrying.");
}

async function ensureWorkspace(request: Request) {
  const db = getDb();
  const email = ownerEmail(request);
  const [existing] = await db.select().from(gen1Workspaces).where(eq(gen1Workspaces.ownerEmail, email)).limit(1);
  if (existing) return existing;
  const workspace = { id: id("ws"), ownerEmail: email, name: "Builder Assist Gen1", updatedAt: now() };
  try { await db.insert(gen1Workspaces).values(workspace); }
  catch (error) {
    // Two first-load requests may race on the unique owner email. Return the
    // committed winner instead of turning a harmless duplicate into a 500.
    const [winner] = await db.select().from(gen1Workspaces).where(eq(gen1Workspaces.ownerEmail, email)).limit(1);
    if (winner) return winner;
    throw error;
  }
  return workspace;
}

function estimateRows(projectId: string, sf: number, stories: number, garage: number, quality: string) {
  const qualityFactor = quality === "premium" ? 1.24 : quality === "luxury" ? 1.58 : 1;
  return ESTIMATE_TEMPLATE.map((line, index) => {
    const base = Math.round(line.material(sf, stories, garage) * qualityFactor);
    const rates = {
      "Builder Assist": base,
      "Home Depot": Math.round(base * 1.115),
      "Lowe's": Math.round(base * 1.087),
      "84 Lumber": Math.round(base * 1.064),
      "Ferguson": Math.round(base * 1.142),
    };
    return {
      id: id("est"), projectId, category: line.category, item: line.item, unit: line.unit,
      quantity: line.q(sf, stories, garage), unitCostCents: base,
      laborCostCents: 0,
      vendor: "Builder Assist", source: "project plan assumptions", competitorRatesJson: JSON.stringify(rates), sortOrder: index,
    };
  });
}

async function seedProject(project: typeof gen1Projects.$inferSelect, featured = false) {
  const db = getDb();
  const lines = estimateRows(project.id, project.squareFeet, project.stories, project.garageBays, project.qualityLevel).map((line, index) => ({ ...line, id: `est_seed_${project.id}_${index + 1}` }));
  const tasks = PHASE_TASKS.flatMap((labels, phaseIndex) => labels.map((label, taskIndex) => ({
    id: `task_seed_${project.id}_${phaseIndex + 1}_${taskIndex + 1}`, projectId: project.id, phaseNo: phaseIndex + 1, taskNo: taskIndex + 1, label,
  })));
  const finishes = FINISHES.map(([category, item, price], index) => ({
    id: `fin_seed_${project.id}_${index + 1}`, projectId: project.id, category, item, quantity: 1, unit: "allowance", unitCostCents: price,
  }));
  const moduleRows = ASSISTIFY_SEEDS.map((seed, index) => ({
      id: `mod_seed_${project.id}_${index + 1}`, projectId: project.id, moduleNo: seed.moduleNo, recordType: seed.recordType,
      title: seed.title, status: seed.status, owner: seed.owner, notes: seed.notes,
      payloadJson: JSON.stringify(seed.payload),
      updatedAt: now(),
  }));
  const preliminaryValue = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0);
  const [estimateExists, finishExists, taskExists, moduleExists, growExists, eventExists] = await Promise.all([
    db.select({ id: gen1EstimateLines.id }).from(gen1EstimateLines).where(eq(gen1EstimateLines.projectId, project.id)).limit(1),
    db.select({ id: gen1FinishSelections.id }).from(gen1FinishSelections).where(eq(gen1FinishSelections.projectId, project.id)).limit(1),
    db.select({ id: gen1PhaseTasks.id }).from(gen1PhaseTasks).where(eq(gen1PhaseTasks.projectId, project.id)).limit(1),
    db.select({ id: gen1ModuleRecords.id }).from(gen1ModuleRecords).where(eq(gen1ModuleRecords.projectId, project.id)).limit(1),
    db.select({ id: gen1GrowifyRecords.id }).from(gen1GrowifyRecords).where(eq(gen1GrowifyRecords.projectId, project.id)).limit(1),
    db.select({ id: gen1ProjectEvents.id }).from(gen1ProjectEvents).where(and(eq(gen1ProjectEvents.projectId, project.id), eq(gen1ProjectEvents.eventType, "project_created"))).limit(1),
  ]);
  const initializing = !eventExists.length;
  if (initializing && !estimateExists.length) {
    for (let index = 0; index < lines.length; index += 4) await db.insert(gen1EstimateLines).values(lines.slice(index, index + 4)).onConflictDoNothing();
  }
  if (initializing && !finishExists.length) await db.insert(gen1FinishSelections).values(finishes).onConflictDoNothing();
  if (initializing && !taskExists.length) {
    for (let index = 0; index < tasks.length; index += 8) await db.insert(gen1PhaseTasks).values(tasks.slice(index, index + 8)).onConflictDoNothing();
  }
  if (initializing && featured && !moduleExists.length) {
    for (let index = 0; index < moduleRows.length; index += 4) await db.insert(gen1ModuleRecords).values(moduleRows.slice(index, index + 4)).onConflictDoNothing();
  }
  if (initializing && !growExists.length) {
    await db.insert(gen1GrowifyRecords).values([
      { id: `grow_seed_${project.id}_lead`, projectId: project.id, kind: "lead", title: `${project.name} property owner`, status: "qualified", contactName: project.clientName, valueCents: preliminaryValue, payloadJson: JSON.stringify({ stage: "Qualified", source: "Plan upload", nextAction: "Confirm owner and property details" }) },
      { id: `grow_seed_${project.id}_campaign`, projectId: project.id, kind: "campaign", title: `${project.name} project lifecycle`, status: "active", contactName: project.clientName, payloadJson: JSON.stringify({ channels: ["Email", "SMS"], audience: "Project contacts", sent: 0, replies: 0 }) },
      { id: `grow_seed_${project.id}_automation`, projectId: project.id, kind: "automation", title: "New plan-set follow-up", status: "active", payloadJson: JSON.stringify({ trigger: "Project created", action: "Create lead, campaign and preconstruction follow-up", runs: 1 }) },
      { id: `grow_seed_${project.id}_proposal`, projectId: project.id, kind: "proposal", title: `${project.name} materials proposal`, status: "draft", valueCents: preliminaryValue, payloadJson: JSON.stringify({ source: "Current Buildify materials estimate", version: 1 }) },
    ]).onConflictDoNothing();
  }
  if (initializing) await db.insert(gen1ProjectEvents).values({ id: `evt_created_${project.id}`, projectId: project.id, eventType: "project_created", title: "House workspace created", detail: "Buildify, Assistify and Growify records were linked to this house." }).onConflictDoNothing();
}

async function createFeaturedProject(workspaceId: string) {
  const db = getDb();
  const project = {
    id: `prj_featured_${workspaceId}`, workspaceId, name: "Swenka Residence", address: "12228 N 66th St, Scottsdale, AZ 85254",
    clientName: "RS AHCS LLC", status: "approved_plans", squareFeet: 6078, stories: 1, garageBays: 3,
    qualityLevel: "luxury", estimateStatus: "plan_based", updatedAt: now(),
  };
  try { await db.insert(gen1Projects).values(project); }
  catch (error) {
    // A deterministic primary key lets concurrent first loads converge on one
    // featured house without duplicating its seeded estimates and workflows.
    const [winner] = await db.select({ id: gen1Projects.id }).from(gen1Projects).where(and(eq(gen1Projects.id, project.id), eq(gen1Projects.workspaceId, workspaceId))).limit(1);
    if (winner) return;
    throw error;
  }
  await db.insert(gen1ProjectFiles).values({
    id: id("file"), projectId: project.id, filename: "66thST4752-25_APPROVEDPlans.pdf", contentType: "application/pdf",
    sizeBytes: 3315406, r2Key: "public:/project-plans/66th-st-approved-plans.pdf", documentType: "approved_plan_set", analysisStatus: "approved",
  });
  await seedProject(project as typeof gen1Projects.$inferSelect, true);
}

function parseJson(value: string) {
  try { return JSON.parse(value); } catch { return {}; }
}

async function loadCanonicalProjectModel(projectId: string) {
  const db = getDb();
  const [row] = await db.select().from(gen1ProjectModels).where(eq(gen1ProjectModels.projectId, projectId)).limit(1);
  if (!row) return { row: null, model: null, error: "" };
  try {
    const model = parseStoredProjectModel(row.modelJson);
    if (model.projectId !== row.projectId || model.activeRevisionId !== row.activeRevisionId || model.modelVersion !== row.modelVersion || row.schemaVersion > model.schemaVersion) throw new Error("The ProjectModel envelope does not match its persisted identity.");
    return { row, model, error: "" };
  } catch (error) {
    await db.update(gen1ProjectModels).set({ status: "quarantined", updatedAt: now() }).where(eq(gen1ProjectModels.projectId, projectId));
    return { row, model: null, error: error instanceof Error ? error.message : "The stored ProjectModel is incompatible." };
  }
}

async function commitProjectModelTransition(input: {
  projectId: string;
  previousVersion: number | null;
  model: ProjectModel;
  projectStatus: string;
  eventType: string;
  eventTitle: string;
  eventDetail: string;
  uploadBatchId?: string;
  processedFileIds?: string[];
}) {
  const model = validateProjectModel(input.model);
  if (model.projectId !== input.projectId) throw new ApiError(400, "MODEL_INVALID", "ProjectModel projectId does not match the selected project.");
  const timestamp = now();
  const payload = JSON.stringify(model);
  const write = input.previousVersion === null
    ? env.DB.prepare("INSERT INTO gen1_project_models (project_id, schema_version, model_version, active_revision_id, status, model_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(input.projectId, model.schemaVersion, model.modelVersion, model.activeRevisionId, model.status, payload, timestamp, timestamp)
    : env.DB.prepare("UPDATE gen1_project_models SET schema_version = ?, model_version = ?, active_revision_id = ?, status = ?, model_json = ?, updated_at = ? WHERE project_id = ? AND model_version = ?").bind(model.schemaVersion, model.modelVersion, model.activeRevisionId, model.status, payload, timestamp, input.projectId, input.previousVersion);
  const guard = "EXISTS (SELECT 1 FROM gen1_project_models WHERE project_id = ? AND model_version = ? AND model_json = ?)";
  const statements = [
    write,
    env.DB.prepare(`UPDATE gen1_projects SET status = ?, updated_at = ? WHERE id = ? AND ${guard}`).bind(input.projectStatus, timestamp, input.projectId, input.projectId, model.modelVersion, payload),
    env.DB.prepare(`INSERT INTO gen1_project_events (id, project_id, event_type, title, detail, actor, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`).bind(id("evt"), input.projectId, input.eventType, input.eventTitle, input.eventDetail, "ProjectModel pipeline", timestamp, input.projectId, model.modelVersion, payload),
  ];
  if (input.uploadBatchId) statements.push(env.DB.prepare(`UPDATE gen1_upload_batches SET status = 'complete', completed_at = ? WHERE id = ? AND project_id = ? AND ${guard}`).bind(timestamp, input.uploadBatchId, input.projectId, input.projectId, model.modelVersion, payload));
  for (const fileId of input.processedFileIds || []) statements.push(env.DB.prepare(`UPDATE gen1_project_files SET analysis_status = 'extracted' WHERE id = ? AND project_id = ? AND ${guard}`).bind(fileId, input.projectId, input.projectId, model.modelVersion, payload));
  const results = await env.DB.batch(statements);
  const changes = Number((results[0] as { meta?: { changes?: number } }).meta?.changes || 0);
  if (changes !== 1) throw new ApiError(409, "MODEL_VERSION_CONFLICT", "The project changed while this operation was running. Reload the active ProjectModel and retry.");
}

async function hydrateProject(project: typeof gen1Projects.$inferSelect) {
  const db = getDb();
  const [files, estimateLines, finishes] = await Promise.all([
    db.select().from(gen1ProjectFiles).where(eq(gen1ProjectFiles.projectId, project.id)).orderBy(desc(gen1ProjectFiles.createdAt)),
    db.select().from(gen1EstimateLines).where(eq(gen1EstimateLines.projectId, project.id)).orderBy(asc(gen1EstimateLines.sortOrder)),
    db.select().from(gen1FinishSelections).where(eq(gen1FinishSelections.projectId, project.id)).orderBy(asc(gen1FinishSelections.category)),
  ]);
  const [phaseTasks, moduleRecords, growifyRecords] = await Promise.all([
    db.select().from(gen1PhaseTasks).where(eq(gen1PhaseTasks.projectId, project.id)).orderBy(asc(gen1PhaseTasks.phaseNo), asc(gen1PhaseTasks.taskNo)),
    db.select().from(gen1ModuleRecords).where(eq(gen1ModuleRecords.projectId, project.id)).orderBy(desc(gen1ModuleRecords.updatedAt)),
    db.select().from(gen1GrowifyRecords).where(eq(gen1GrowifyRecords.projectId, project.id)).orderBy(desc(gen1GrowifyRecords.updatedAt)),
  ]);
  const events = await db.select().from(gen1ProjectEvents).where(eq(gen1ProjectEvents.projectId, project.id)).orderBy(desc(gen1ProjectEvents.createdAt)).limit(60);
  const { model, error: modelError } = await loadCanonicalProjectModel(project.id);
  const canonicalEstimateLines = model?.estimateLines.map((line) => ({
    id: line.estimateLineId, projectId: line.projectId, category: "Walls", item: line.description, unit: line.units,
    quantity: line.quantity, unitCostCents: line.unitCostCents || 0, laborCostCents: 0, vendor: "Unpriced",
    source: `ProjectModel element ${line.elementId}`, competitorRates: {}, included: false, sortOrder: 0,
    updatedAt: project.updatedAt, elementId: line.elementId, revisionId: line.revisionId, sourceGeometryId: line.sourceGeometryId,
  }));
  return {
    ...project,
    files: files.map((file) => ({
      id: file.id,
      projectId: file.projectId,
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      documentType: file.documentType,
      analysisStatus: file.analysisStatus,
      createdAt: file.createdAt,
      publicPath: file.r2Key.startsWith("public:") ? file.r2Key.slice(7) : null,
    })),
    projectModel: model,
    modelError,
    modelStatus: modelError ? "invalid_model" : model?.status === "ready" ? "ready" : model ? "geometry_review" : files.some((file) => !file.documentType.startsWith("module_evidence:")) ? "awaiting_model" : "awaiting_plans",
    drawingElements: model?.geometry2D || [],
    takeoffItems: model?.takeoffItems || [],
    modelObjects: model?.modelObjects || [],
    issues: model?.issues || [],
    revisionSets: model?.revisionSets || [],
    reports: model?.reports || [],
    estimateLines: canonicalEstimateLines || (project.id.startsWith("prj_featured_") ? estimateLines.map((row) => ({ ...row, competitorRates: parseJson(row.competitorRatesJson) })) : []),
    finishes,
    phaseTasks,
    moduleRecords: moduleRecords.map((row) => ({ ...row, payload: parseJson(row.payloadJson) })),
    growifyRecords: growifyRecords.map((row) => ({ ...row, payload: parseJson(row.payloadJson) })),
    events,
  };
}

async function bootstrap(request: Request) {
  const db = getDb();
  const workspace = await ensureWorkspace(request);
  let projects = await db.select().from(gen1Projects).where(eq(gen1Projects.workspaceId, workspace.id)).orderBy(desc(gen1Projects.updatedAt));
  // A newly created house is not visible until its complete plan-set upload has
  // committed. Interrupted batches are recovered by the idempotent retry path.
  projects = projects.filter((project) => project.status !== "upload_processing");
  const demoMode = new URL(request.url).searchParams.get("demo") === "true";
  if (!projects.length && demoMode) {
    await createFeaturedProject(workspace.id);
    projects = await db.select().from(gen1Projects).where(eq(gen1Projects.workspaceId, workspace.id)).orderBy(desc(gen1Projects.updatedAt));
  }
  if (demoMode) for (const project of projects) await seedProject(project, project.address.includes("12228 N 66th St"));
  const hydratedProjects = [];
  for (const project of projects) hydratedProjects.push(await hydrateProject(project));
  return { workspace, projects: hydratedProjects };
}

async function cleanupUploadBatch(workspaceId: string, batchId: string, projectId: string, createdProject: boolean, knownKeys: string[] = []) {
  const db = getDb();
  const taggedFiles = await db.select().from(gen1ProjectFiles).where(and(eq(gen1ProjectFiles.projectId, projectId), eq(gen1ProjectFiles.uploadBatchId, batchId)));
  const keys = new Set([...knownKeys, ...taggedFiles.map((file) => file.r2Key)].filter((key) => !key.startsWith("public:")));
  let storageCleared = true;
  for (const key of keys) {
    try { await env.BUCKET.delete(key); }
    catch { storageCleared = false; }
  }
  if (!storageCleared) {
    await db.update(gen1UploadBatches).set({ status: "failed", completedAt: now() }).where(and(eq(gen1UploadBatches.id, batchId), eq(gen1UploadBatches.workspaceId, workspaceId)));
    return false;
  }
  await db.delete(gen1ProjectFiles).where(and(eq(gen1ProjectFiles.projectId, projectId), eq(gen1ProjectFiles.uploadBatchId, batchId)));
  await db.delete(gen1UploadBatches).where(and(eq(gen1UploadBatches.id, batchId), eq(gen1UploadBatches.workspaceId, workspaceId)));
  if (createdProject) await db.delete(gen1Projects).where(and(eq(gen1Projects.id, projectId), eq(gen1Projects.workspaceId, workspaceId)));
  return true;
}

async function requireProject(request: Request, projectId: string) {
  const db = getDb();
  const workspace = await ensureWorkspace(request);
  const [project] = await db.select().from(gen1Projects).where(and(eq(gen1Projects.id, projectId), eq(gen1Projects.workspaceId, workspace.id))).limit(1);
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "This project does not exist or is outside your workspace.");
  return project;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), fileId = url.searchParams.get("fileId"), projectId = url.searchParams.get("projectId");
    if (fileId && projectId) {
      const project = await requireProject(request, projectId);
      const db = getDb();
      const [file] = await db.select().from(gen1ProjectFiles).where(and(eq(gen1ProjectFiles.id, fileId), eq(gen1ProjectFiles.projectId, project.id))).limit(1);
      if (!file) return Response.json({ error: "Plan document not found" }, { status: 404 });
      if (file.r2Key.startsWith("public:")) return Response.redirect(new URL(file.r2Key.slice(7), request.url), 302);
      const object = await env.BUCKET.get(file.r2Key);
      if (!object) return Response.json({ error: "Plan document bytes not found" }, { status: 404 });
      return new Response(object.body, { headers: { "content-type": file.contentType, "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`, "cache-control": "private, max-age=60", "x-content-type-options": "nosniff" } });
    }
    return Response.json(await bootstrap(request));
  }
  catch (error) { return errorResponse(error, "GET"); }
}

async function uploadPlansToProject(request: Request) {
  const declaredBytes = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > 85 * 1024 * 1024) throw new ApiError(413, "UPLOAD_TOO_LARGE", "The upload request exceeds the 80 MB plan-set limit.");
  const form = await request.formData();
  const files = form.getAll("plans").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return Response.json({ error: "Choose at least one plan document" }, { status: 400 });
  if (files.length > 20) return Response.json({ error: "Upload no more than 20 documents in one plan set" }, { status: 413 });
  const requestedProjectId = String(form.get("projectId") || "");
  const createProjectName = String(form.get("createProjectName") || "");
  const moduleRecordId = String(form.get("moduleRecordId") || "");
  const idempotencyKey = String(form.get("idempotencyKey") || "").trim();
  if (!validIdempotencyKey(idempotencyKey)) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Restart the upload from Builder Assist so it can be protected from duplicate submission.");
  const allowedPlanTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/tiff", "image/vnd.dxf", "application/dxf"]);
  const allowedPhotoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/tiff"]);
  const allowedPlanExtensions = new Set(["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff", "dxf"]);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > 80 * 1024 * 1024) return Response.json({ error: "The combined upload exceeds the 80 MB plan-set limit" }, { status: 413 });
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const sizeLimit = moduleRecordId ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > sizeLimit) return Response.json({ error: `${file.name} exceeds the ${moduleRecordId ? 15 : 50} MB file limit` }, { status: 413 });
    if (moduleRecordId && !allowedPhotoTypes.has(file.type)) return Response.json({ error: `${file.name} must be a PNG, JPG, WebP or TIFF image` }, { status: 415 });
    if (!moduleRecordId && (!allowedPlanExtensions.has(extension) || (file.type && file.type !== "application/octet-stream" && !allowedPlanTypes.has(file.type)))) return Response.json({ error: `${file.name} is not a supported plan document` }, { status: 415 });
    if (!await hasExpectedFileSignature(file, extension)) return Response.json({ error: `${file.name} does not contain a valid ${extension.toUpperCase()} file signature` }, { status: 415 });
  }
  const workspace = await ensureWorkspace(request);
  const db = getDb();
  const [previousBatch] = await db.select().from(gen1UploadBatches).where(and(eq(gen1UploadBatches.workspaceId, workspace.id), eq(gen1UploadBatches.idempotencyKey, idempotencyKey))).limit(1);
  if (previousBatch?.status === "complete") {
    const [previousProject] = await db.select().from(gen1Projects).where(and(eq(gen1Projects.id, previousBatch.projectId), eq(gen1Projects.workspaceId, workspace.id))).limit(1);
    if (previousProject) return Response.json({ project: await hydrateProject(previousProject), duplicatePrevented: true }, { status: 200 });
  }
  if (previousBatch) {
    const ageMs = Date.now() - new Date(previousBatch.createdAt).getTime();
    const recoverable = previousBatch.status === "failed" || (Number.isFinite(ageMs) && ageMs >= 15 * 60 * 1000);
    if (!recoverable) throw new ApiError(409, "UPLOAD_IN_PROGRESS", "This plan set is already being saved. Wait a moment, then refresh the project list.");
    const cleaned = await cleanupUploadBatch(workspace.id, previousBatch.id, previousBatch.projectId, previousBatch.createdProject);
    if (!cleaned) throw new ApiError(503, "UPLOAD_RECOVERY_REQUIRED", "Builder Assist preserved the interrupted upload for safe recovery. Retry later or contact support with the incident ID.");
  }
  let project = requestedProjectId ? await requireProject(request, requestedProjectId) : null;
  let createdForUpload = false;
  if (!project) {
    if (!createProjectName || moduleRecordId) return Response.json({ error: "Choose a house for this upload" }, { status: 400 });
    project = await insertProject(workspace.id, { name: createProjectName });
    createdForUpload = true;
    await db.update(gen1Projects).set({ status: "upload_processing", updatedAt: now() }).where(and(eq(gen1Projects.id, project.id), eq(gen1Projects.workspaceId, workspace.id)));
  }
  const projectId = project.id;
  if (moduleRecordId) {
    const [record] = await db.select({ id: gen1ModuleRecords.id }).from(gen1ModuleRecords).where(and(eq(gen1ModuleRecords.id, moduleRecordId), eq(gen1ModuleRecords.projectId, projectId))).limit(1);
    if (!record) return Response.json({ error: "Assistify record not found" }, { status: 404 });
  }
  const batchId = id("upl");
  try {
    await db.insert(gen1UploadBatches).values({
      id: batchId, workspaceId: workspace.id, idempotencyKey, projectId,
      operation: moduleRecordId ? "assistify_evidence_upload" : "plan_upload", status: "processing",
      fileCount: files.length, totalSizeBytes: totalSize, createdProject: createdForUpload,
    });
  } catch (error) {
    if (createdForUpload) await db.delete(gen1Projects).where(and(eq(gen1Projects.id, projectId), eq(gen1Projects.workspaceId, workspace.id)));
    const [winner] = await db.select().from(gen1UploadBatches).where(and(eq(gen1UploadBatches.workspaceId, workspace.id), eq(gen1UploadBatches.idempotencyKey, idempotencyKey))).limit(1);
    if (winner?.status === "complete") {
      const [winnerProject] = await db.select().from(gen1Projects).where(and(eq(gen1Projects.id, winner.projectId), eq(gen1Projects.workspaceId, workspace.id))).limit(1);
      if (winnerProject) return Response.json({ project: await hydrateProject(winnerProject), duplicatePrevented: true }, { status: 200 });
    }
    if (winner) throw new ApiError(409, "UPLOAD_IN_PROGRESS", "This plan set is already being saved. Wait a moment, then refresh the project list.");
    throw error;
  }
  const storedKeys: string[] = [];
  const uploadedDocuments: SourceDocument[] = [];
  const pdfInputs: Array<{ documentId: string; bytes: ArrayBuffer }> = [];
  let committed = false;
  try {
    for (const file of files) {
      const fileId = id("file");
      const safe = safeStorageFilename(file.name);
      const r2Key = `${workspace.id}/${projectId}/${fileId}-${safe}`;
      storedKeys.push(r2Key);
      await db.insert(gen1ProjectFiles).values({ id: fileId, projectId, filename: file.name.slice(0, 240), contentType: file.type || "application/octet-stream", sizeBytes: file.size, r2Key, documentType: moduleRecordId ? `module_evidence:${moduleRecordId}` : "plan", analysisStatus: "uploading", uploadBatchId: batchId });
      const bytes = await file.arrayBuffer();
      await env.BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      await db.update(gen1ProjectFiles).set({ analysisStatus: moduleRecordId ? "attached" : "processing" }).where(and(eq(gen1ProjectFiles.id, fileId), eq(gen1ProjectFiles.projectId, projectId)));
      if (!moduleRecordId) {
        const isPdf = file.type === "application/pdf";
        const pageCount = isPdf ? countVectorPdfPages(bytes) : 1;
        if (isPdf && pageCount === undefined) throw new ApiError(422, "PDF_UNREADABLE", "The PDF page structure is unreadable or encrypted and was not persisted as interpreted project data.");
        uploadedDocuments.push({ documentId: fileId, projectId, filename: file.name.slice(0, 240), contentType: file.type || "application/octet-stream", sizeBytes: file.size, lifecycleStatus: "persisted", storageKey: r2Key, sha256: await sha256Hex(bytes), pageCount, sheetIds: [] });
        if (isPdf) pdfInputs.push({ documentId: fileId, bytes });
      }
    }
    if (moduleRecordId) {
      await db.batch([
        db.update(gen1Projects).set({ updatedAt: now() }).where(eq(gen1Projects.id, projectId)),
        db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "assistify_evidence_upload", title: `${files.length} evidence photo${files.length === 1 ? "" : "s"} uploaded`, detail: "Photo evidence was attached to the Assistify record and added to the shared project history." }),
        db.update(gen1UploadBatches).set({ status: "complete", completedAt: now() }).where(eq(gen1UploadBatches.id, batchId)),
      ]);
      committed = true;
    } else {
      const current = await loadCanonicalProjectModel(projectId);
      if (current.error) throw new ApiError(409, "MODEL_QUARANTINED", "The existing ProjectModel is invalid. Resolve or migrate it before adding source documents.");
      let nextModel = current.model ? appendSourceDocuments(current.model, uploadedDocuments) : createProjectModel(projectId, id("rev"), uploadedDocuments);
      try {
        for (const pdf of pdfInputs) {
          const document = nextModel.sourceDocuments.find((candidate) => candidate.documentId === pdf.documentId)!;
          const ir = await extractVectorPdf(pdf.bytes, { projectId, revisionId: nextModel.activeRevisionId, sourceDocumentId: pdf.documentId, sheetIds: document.sheetIds, extractedAt: now() });
          nextModel = reconcileBlueprintIR(nextModel, ir);
        }
      } catch (error) {
        if (error instanceof VectorPdfExtractionError) throw new ApiError(422, "PDF_EXTRACTION_FAILED", error.message);
        throw error;
      }
      await commitProjectModelTransition({
        projectId, previousVersion: current.row?.modelVersion ?? null, model: nextModel, projectStatus: nextModel.status,
        eventType: "plan_upload", eventTitle: `${files.length} plan document${files.length === 1 ? "" : "s"} uploaded`,
        eventDetail: pdfInputs.length ? "Persisted vector PDFs were extracted into BlueprintIR and reconciled into the canonical ProjectModel. Preliminary geometry requires review." : "Source documents were persisted and registered in the canonical ProjectModel.", uploadBatchId: batchId, processedFileIds: uploadedDocuments.map((document) => document.documentId),
      });
      committed = true;
    }
    const [updated] = await db.select().from(gen1Projects).where(eq(gen1Projects.id, projectId)).limit(1);
    return Response.json({ project: await hydrateProject(updated) }, { status: 201 });
  } catch (error) {
    if (committed) throw error;
    const cleaned = await cleanupUploadBatch(workspace.id, batchId, projectId, createdForUpload, storedKeys);
    if (!cleaned) throw new ApiError(503, "UPLOAD_RECOVERY_REQUIRED", "Builder Assist preserved the interrupted upload for safe recovery. Retry later or contact support with the incident ID.");
    throw error;
  }
}

async function insertProject(workspaceId: string, body: Record<string, unknown>) {
  const db = getDb();
  const project = {
    id: id("prj"), workspaceId, name: requiredText(body.name || "New House", "House name"),
    address: String(body.address || "Address pending"), clientName: String(body.clientName || "Property owner pending"), status: "plan_intake",
    squareFeet: boundedNumber(body.squareFeet, 2500, 250, 100000), stories: boundedNumber(body.stories, 1, 1, 4), garageBays: boundedNumber(body.garageBays, 2, 0, 12),
    qualityLevel: ["standard", "premium", "luxury"].includes(String(body.qualityLevel)) ? String(body.qualityLevel) : "standard", estimateStatus: "preliminary", updatedAt: now(),
  };
  await db.insert(gen1Projects).values(project);
  return project as typeof gen1Projects.$inferSelect;
}

async function createProject(request: Request, body: Record<string, unknown>) {
  const workspace = await ensureWorkspace(request);
  const project = await insertProject(workspace.id, body);
  return Response.json({ project: await hydrateProject(project as typeof gen1Projects.$inferSelect) }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    // Reject unauthenticated writes before parsing multipart or JSON bodies.
    // The platform-supplied identity is checked again when the workspace is resolved.
    ownerEmail(request);
    if ((request.headers.get("content-type") || "").includes("multipart/form-data")) return uploadPlansToProject(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "create_project") return createProject(request, body);
    const projectId = String(body.projectId || "");
    const project = await requireProject(request, projectId);
    const db = getDb();
    let createdRecordId = "";

    if (action === "calibrate_scale" || action === "trace_wall" || action === "review_geometry" || action === "apply_wall_defaults") {
      const current = await loadCanonicalProjectModel(projectId);
      if (current.error) throw new ApiError(409, "MODEL_QUARANTINED", "The active ProjectModel is invalid and cannot accept commands until it is migrated or replaced.");
      if (!current.model || !current.row) throw new ApiError(409, "MODEL_REQUIRED", "Upload and persist a source document before editing project geometry.");
      const expectedModelVersion = Number(body.expectedModelVersion);
      if (!Number.isInteger(expectedModelVersion) || expectedModelVersion !== current.model.modelVersion) throw new ApiError(409, "MODEL_VERSION_CONFLICT", "The project changed in another workspace. Reload before retrying.");
      let nextModel: ProjectModel;
      try {
        if (action === "review_geometry") {
          const rawIds = Array.isArray(body.elementIds) ? body.elementIds.map((value) => String(value)).slice(0, 1000) : undefined;
          nextModel = reviewBuildingElements(current.model, {
            elementIds: rawIds?.length ? rawIds : undefined,
            decision: body.decision === "removed" ? "removed" : "approved",
            reviewedAt: now(),
            description: requiredText(body.evidenceDescription, "Review evidence", 500),
          });
        } else if (action === "apply_wall_defaults") {
          nextModel = applyWallDimensionDefaults(current.model, {
            height: body.height === undefined || body.height === null || body.height === "" ? undefined : Number(body.height),
            thickness: body.thickness === undefined || body.thickness === null || body.thickness === "" ? undefined : Number(body.thickness),
            appliedAt: now(),
          });
        } else if (action === "calibrate_scale") {
          nextModel = recordScaleCalibration(current.model, {
            sheetId: requiredText(body.sheetId, "Sheet identifier", 128),
            drawingDistance: Number(body.drawingDistance), drawingUnits: body.drawingUnits === "mm" ? "mm" : body.drawingUnits === "px" ? "px" : "in", realDistance: Number(body.realDistance),
            units: body.units === "m" ? "m" : "ft", calibratedAt: now(),
            evidence: {
              sourceDocumentId: requiredText(body.sourceDocumentId, "Source document identifier", 128),
              pageNumber: Number(body.pageNumber),
              description: requiredText(body.evidenceDescription, "Scale evidence", 500),
            },
          });
        } else {
          const start = body.start as Point2, end = body.end as Point2;
          const reviewed = Boolean(body.reviewed);
          nextModel = traceWall(current.model, {
            elementId: optionalText(body.elementId, 128) || undefined,
            sheetId: requiredText(body.sheetId, "Sheet identifier", 128), sourceGeometryId: requiredText(body.sourceGeometryId, "Source geometry identifier", 128),
            levelId: requiredText(body.levelId, "Level identifier", 128), levelName: optionalText(body.levelName, 128), levelElevation: body.levelElevation === undefined ? undefined : Number(body.levelElevation),
            start: { x: Number(start?.x), y: Number(start?.y) }, end: { x: Number(end?.x), y: Number(end?.y) },
            height: body.height === undefined ? undefined : Number(body.height), thickness: body.thickness === undefined ? undefined : Number(body.thickness),
            reviewEvidence: reviewed ? {
              reviewedAt: now(), reviewedBy: "user",
              sourceDocumentId: requiredText(body.sourceDocumentId, "Source document identifier", 128),
              pageNumber: Number(body.pageNumber),
              description: requiredText(body.evidenceDescription, "Wall review evidence", 500),
            } : undefined,
          });
        }
      } catch (error) {
        if (error instanceof ProjectModelValidationError) throw new ApiError(400, "MODEL_INVALID", error.message);
        throw error;
      }
      const transition = action === "calibrate_scale" ? { eventType: "scale_calibrated", eventTitle: "Drawing scale calibrated", eventDetail: `Scale was verified for ${String(body.sheetId)}.` }
        : action === "review_geometry" ? { eventType: "geometry_reviewed", eventTitle: body.decision === "removed" ? "Detected geometry removed" : "Preliminary walls confirmed", eventDetail: body.decision === "removed" ? "The user removed detected geometry that is not a wall on the plans." : `The user confirmed preliminary walls; ${nextModel.status === "ready" ? "the model is now fully reviewed" : "some walls still require review"}.` }
        : action === "apply_wall_defaults" ? { eventType: "wall_defaults_applied", eventTitle: "Building basics applied", eventDetail: "Typical wall dimensions were applied to every preliminary wall as explicit assumptions." }
        : { eventType: "wall_traced", eventTitle: "Wall traced into ProjectModel", eventDetail: `Drawing, Takeoff, Estimate and 3D now reference ${nextModel.buildingElements.at(-1)?.elementId}.` };
      await commitProjectModelTransition({ projectId, previousVersion: expectedModelVersion, model: nextModel, projectStatus: nextModel.status, ...transition });
      return Response.json({ project: await hydrateProject(project) });
    }

    if (action === "delete_project") {
      // Removes a whole house record — e.g. an example or test plan set that
      // should not stay in the workspace. Stored plan bytes are deleted first
      // so no orphaned uploads survive the row cascade.
      const projectFiles = await db.select().from(gen1ProjectFiles).where(eq(gen1ProjectFiles.projectId, projectId));
      let storageCleared = true;
      for (const file of projectFiles) {
        if (file.r2Key.startsWith("public:")) continue;
        try { await env.BUCKET.delete(file.r2Key); }
        catch { storageCleared = false; }
      }
      if (!storageCleared) throw new ApiError(503, "DELETE_INCOMPLETE", "Some stored plan files could not be removed yet. Retry the delete; nothing else was changed.");
      await db.delete(gen1Projects).where(and(eq(gen1Projects.id, projectId), eq(gen1Projects.workspaceId, project.workspaceId)));
      return Response.json({ deleted: true, projectId });
    }

    if (action === "update_project") {
      const patch = (body.patch || {}) as Record<string, unknown>;
      const values = {
        name: requiredText(patch.name ?? project.name, "House name"), address: String(patch.address ?? project.address).trim().slice(0, 240), clientName: String(patch.clientName ?? project.clientName).trim().slice(0, 180),
        squareFeet: boundedNumber(patch.squareFeet, project.squareFeet, 250, 100000), stories: boundedNumber(patch.stories, project.stories, 1, 4), garageBays: boundedNumber(patch.garageBays, project.garageBays, 0, 12),
        qualityLevel: ["standard", "premium", "luxury"].includes(String(patch.qualityLevel)) ? String(patch.qualityLevel) : project.qualityLevel, status: project.status, updatedAt: now(),
      };
      await db.update(gen1Projects).set(values).where(eq(gen1Projects.id, projectId));
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "project_updated", title: "Project details updated", detail: `${values.squareFeet.toLocaleString()} sf · ${values.qualityLevel}` });
    } else if (action === "recalculate_estimate") {
      const fresh = (await db.select().from(gen1Projects).where(eq(gen1Projects.id, projectId)).limit(1))[0];
      const freshLines = estimateRows(projectId, fresh.squareFeet, fresh.stories, fresh.garageBays, fresh.qualityLevel)
        .map((line, index) => ({ ...line, id: `est_seed_${projectId}_${index + 1}` }));
      const recalculatedAt = now();
      const statements = [
        // D1 executes batch statements as one transaction. Removing the old
        // rate book, inserting all deterministic replacements, updating the
        // project and writing its audit event therefore either all commit or
        // all roll back; users never reopen a half-recalculated estimate.
        db.delete(gen1EstimateLines).where(eq(gen1EstimateLines.projectId, projectId)),
        ...freshLines.map((line) => db.insert(gen1EstimateLines).values({ ...line, updatedAt: recalculatedAt })),
        db.update(gen1Projects).set({ estimateStatus: "preliminary", updatedAt: recalculatedAt }).where(eq(gen1Projects.id, projectId)),
        db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "estimate_recalculated", title: "Build estimate recalculated", detail: "Project assumptions were applied to the current plan-set estimate." }),
      ];
      await db.batch(statements as [typeof statements[number], ...typeof statements[number][]]);
    } else if (action === "update_estimate_line") {
      const lineId = String(body.id || "");
      await assertProjectRecord("estimate", lineId, projectId);
      await db.update(gen1EstimateLines).set({ quantity: boundedNumber(body.quantity, 0, 0, 10000000), unitCostCents: Math.round(boundedNumber(body.unitCostCents, 0, 0, 1000000000)), laborCostCents: 0, included: Boolean(body.included), updatedAt: now() }).where(and(eq(gen1EstimateLines.id, lineId), eq(gen1EstimateLines.projectId, projectId)));
    } else if (action === "add_finish") {
      await db.insert(gen1FinishSelections).values({ id: id("fin"), projectId, category: requiredText(body.category, "Finish category", 100), item: requiredText(body.item, "Finish product", 180), vendor: String(body.vendor || "Unselected").trim().slice(0, 120), quantity: boundedNumber(body.quantity, 1, 0, 1000000), unit: String(body.unit || "allowance").slice(0, 40), unitCostCents: Math.round(boundedNumber(body.unitCostCents, 0, 0, 1000000000)), selected: Boolean(body.selected), updatedAt: now() });
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "finish_added", title: "Finish option added", detail: `${String(body.category || "Custom")} · ${String(body.item || "New finish")}`.slice(0, 300) });
    } else if (action === "update_finish") {
      const finishId = String(body.id || "");
      await assertProjectRecord("finish", finishId, projectId);
      await db.update(gen1FinishSelections).set({ selected: Boolean(body.selected), item: requiredText(body.item, "Finish product", 180), vendor: optionalText(body.vendor || "Unselected", 120), unitCostCents: Math.round(boundedNumber(body.unitCostCents, 0, 0, 1000000000)), quantity: boundedNumber(body.quantity, 1, 0, 1000000), updatedAt: now() }).where(and(eq(gen1FinishSelections.id, finishId), eq(gen1FinishSelections.projectId, projectId)));
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "finish_updated", title: "Finish pricing updated", detail: String(body.item || "Finish selection").slice(0, 240) });
    } else if (action === "toggle_phase_task") {
      const taskId = String(body.id || "");
      await assertProjectRecord("task", taskId, projectId);
      const completed = Boolean(body.completed);
      await db.update(gen1PhaseTasks).set({ completed, status: completed ? "complete" : "not_started", updatedAt: now() }).where(and(eq(gen1PhaseTasks.id, taskId), eq(gen1PhaseTasks.projectId, projectId)));
    } else if (action === "add_module_record") {
      const moduleNo = Number(body.moduleNo);
      if (![6, 7, 8, 9, 11, 12, 13, 14, 17, 22, 25].includes(moduleNo)) return Response.json({ error: "Unsupported Assistify tool" }, { status: 400 });
      const payloadJson = safePayload(body.payload, "Assistify record details");
      const record = { id: id("mod"), projectId, moduleNo, recordType: optionalText(body.recordType || "record", 80), title: requiredText(body.title, "Record title"), status: optionalText(body.status || "open", 40), owner: optionalText(body.owner || "Unassigned", 140), dueDate: optionalDate(body.dueDate, "Due date"), notes: optionalText(body.notes, 5000), payloadJson, updatedAt: now() };
      await db.insert(gen1ModuleRecords).values(record);
      createdRecordId = record.id;
      const syncTarget = record.moduleNo === 17 ? "Buildify pricing and Growify approval" : "shared house activity";
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "assistify_record_created", title: `Assistify · ${record.title}`, detail: `${record.status} · synchronized with ${syncTarget}` });
      if (record.moduleNo === 17) {
        await db.insert(gen1GrowifyRecords).values({
          id: id("grow"), projectId, kind: "message", title: `Approval needed: ${record.title}`, status: "draft",
          contactName: project.clientName, payloadJson: JSON.stringify({ detail: "Assistify change event is ready for Buildify pricing, then owner approval in Growify.", sourceModuleRecordId: record.id }), updatedAt: now(),
        });
      }
    } else if (action === "update_module_record") {
      const recordId = String(body.id || "");
      await assertProjectRecord("module", recordId, projectId);
      await db.update(gen1ModuleRecords).set({
        status: optionalText(body.status || "open", 40), owner: optionalText(body.owner || "Unassigned", 140), dueDate: optionalDate(body.dueDate, "Due date"),
        notes: optionalText(body.notes, 5000), payloadJson: safePayload(body.payload, "Assistify record details"), updatedAt: now(),
      }).where(and(eq(gen1ModuleRecords.id, recordId), eq(gen1ModuleRecords.projectId, projectId)));
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "assistify_record_updated", title: "Assistify workflow updated", detail: `${String(body.status || "open")} · visible across the shared house record` });
    } else if (action === "add_growify_record") {
      const record = { id: id("grow"), projectId, kind: optionalText(body.kind || "lead", 40), title: requiredText(body.title || "Untitled", "Record title"), status: optionalText(body.status || "active", 40), contactName: optionalText(body.contactName, 180), email: contactEmail(body.email), phone: optionalText(body.phone, 40), valueCents: Math.round(boundedNumber(body.valueCents, 0, 0, 100000000000)), payloadJson: safePayload(body.payload, "Growify record details"), updatedAt: now() };
      await db.insert(gen1GrowifyRecords).values(record);
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: `growify_${record.kind}`, title: record.title, detail: record.status });
    } else if (action === "update_growify_record") {
      const recordId = String(body.id || "");
      await assertProjectRecord("growify", recordId, projectId);
      await db.update(gen1GrowifyRecords).set({ status: optionalText(body.status || "active", 40), title: requiredText(body.title || "Untitled", "Record title"), contactName: optionalText(body.contactName, 180), email: contactEmail(body.email), phone: optionalText(body.phone, 40), valueCents: Math.round(boundedNumber(body.valueCents, 0, 0, 100000000000)), payloadJson: safePayload(body.payload, "Growify record details"), updatedAt: now() }).where(and(eq(gen1GrowifyRecords.id, recordId), eq(gen1GrowifyRecords.projectId, projectId)));
    } else if (action === "delete_record") {
      const recordId = String(body.id || "");
      if (body.recordType === "module") {
        await assertProjectRecord("module", recordId, projectId);
        const evidenceFiles = await db.select().from(gen1ProjectFiles).where(and(eq(gen1ProjectFiles.projectId, projectId), eq(gen1ProjectFiles.documentType, `module_evidence:${recordId}`)));
        // Delete each byte object and its matching row as a recoverable unit. If
        // a later object fails, the parent record remains and retry continues
        // with only the evidence that still exists.
        for (const file of evidenceFiles) {
          await env.BUCKET.delete(file.r2Key);
          await db.delete(gen1ProjectFiles).where(and(eq(gen1ProjectFiles.id, file.id), eq(gen1ProjectFiles.projectId, projectId)));
        }
        await db.delete(gen1ModuleRecords).where(and(eq(gen1ModuleRecords.id, recordId), eq(gen1ModuleRecords.projectId, projectId)));
      }
      else if (body.recordType === "finish") {
        await assertProjectRecord("finish", recordId, projectId);
        await db.delete(gen1FinishSelections).where(and(eq(gen1FinishSelections.id, recordId), eq(gen1FinishSelections.projectId, projectId)));
        await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "finish_deleted", title: "Finish option deleted", detail: "The finish was removed from this house." });
      }
      else if (body.recordType === "growify") {
        await assertProjectRecord("growify", recordId, projectId);
        await db.delete(gen1GrowifyRecords).where(and(eq(gen1GrowifyRecords.id, recordId), eq(gen1GrowifyRecords.projectId, projectId)));
      } else throw new ApiError(400, "VALIDATION_ERROR", "Choose a supported record type to delete.");
    } else if (action === "record_intel") {
      await db.insert(gen1ProjectEvents).values({ id: id("evt"), projectId, eventType: "competitive_intel", title: "Competitive intelligence refreshed", detail: String(body.detail || "Current project estimate compared with the active catalog rate book.") });
    } else {
      return Response.json({ error: "Unknown Gen1 action" }, { status: 400 });
    }
    const [updated] = await db.select().from(gen1Projects).where(eq(gen1Projects.id, projectId)).limit(1);
    return Response.json({ project: await hydrateProject(updated), recordId: createdRecordId || undefined });
  } catch (error) { return errorResponse(error, "POST"); }
}
