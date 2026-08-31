import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const gen1Workspaces = sqliteTable("gen1_workspaces", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull().default("Builder Assist Gen1"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  ownerEmailUnique: uniqueIndex("gen1_workspaces_owner_email_unique").on(table.ownerEmail),
}));

export const gen1Projects = sqliteTable("gen1_projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => gen1Workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull().default("Address pending"),
  clientName: text("client_name").notNull().default("Property owner pending"),
  status: text("status").notNull().default("plan_intake"),
  squareFeet: integer("square_feet").notNull().default(2500),
  stories: real("stories").notNull().default(1),
  garageBays: integer("garage_bays").notNull().default(2),
  qualityLevel: text("quality_level").notNull().default("standard"),
  estimateStatus: text("estimate_status").notNull().default("preliminary"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("gen1_projects_workspace_idx").on(table.workspaceId),
}));

export const gen1ProjectFiles = sqliteTable("gen1_project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  r2Key: text("r2_key").notNull(),
  documentType: text("document_type").notNull().default("plan"),
  analysisStatus: text("analysis_status").notNull().default("queued"),
  uploadBatchId: text("upload_batch_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_project_files_project_idx").on(table.projectId),
  uploadBatchIdx: index("gen1_project_files_upload_batch_idx").on(table.uploadBatchId),
}));

export const gen1ProjectModels = sqliteTable("gen1_project_models", {
  projectId: text("project_id").primaryKey().references(() => gen1Projects.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull(),
  modelVersion: integer("model_version").notNull(),
  activeRevisionId: text("active_revision_id").notNull(),
  status: text("status").notNull().default("awaiting_scale"),
  modelJson: text("model_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  revisionIdx: index("gen1_project_models_revision_idx").on(table.projectId, table.activeRevisionId),
  versionIdx: index("gen1_project_models_version_idx").on(table.projectId, table.modelVersion),
}));

export const gen1EstimateLines = sqliteTable("gen1_estimate_lines", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  item: text("item").notNull(),
  unit: text("unit").notNull().default("allowance"),
  quantity: real("quantity").notNull().default(1),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  laborCostCents: integer("labor_cost_cents").notNull().default(0),
  vendor: text("vendor").notNull().default("Builder Assist"),
  source: text("source").notNull().default("plan-set preliminary"),
  competitorRatesJson: text("competitor_rates_json").notNull().default("{}"),
  included: integer("included", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_estimate_lines_project_idx").on(table.projectId),
}));

export const gen1FinishSelections = sqliteTable("gen1_finish_selections", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  item: text("item").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("allowance"),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  vendor: text("vendor").notNull().default("Unselected"),
  selected: integer("selected", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_finish_selections_project_idx").on(table.projectId),
}));

export const gen1PhaseTasks = sqliteTable("gen1_phase_tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  phaseNo: integer("phase_no").notNull(),
  taskNo: integer("task_no").notNull(),
  label: text("label").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("not_started"),
  owner: text("owner").notNull().default("Unassigned"),
  dueDate: text("due_date"),
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_phase_tasks_project_idx").on(table.projectId),
  phaseIdx: index("gen1_phase_tasks_phase_idx").on(table.projectId, table.phaseNo),
}));

export const gen1ModuleRecords = sqliteTable("gen1_module_records", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  moduleNo: integer("module_no").notNull(),
  recordType: text("record_type").notNull().default("record"),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"),
  owner: text("owner").notNull().default("Unassigned"),
  dueDate: text("due_date"),
  notes: text("notes").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_module_records_project_idx").on(table.projectId),
  moduleIdx: index("gen1_module_records_module_idx").on(table.projectId, table.moduleNo),
}));

export const gen1GrowifyRecords = sqliteTable("gen1_growify_records", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  valueCents: integer("value_cents").notNull().default(0),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_growify_records_project_idx").on(table.projectId),
  kindIdx: index("gen1_growify_records_kind_idx").on(table.projectId, table.kind),
}));

export const gen1ProjectEvents = sqliteTable("gen1_project_events", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  actor: text("actor").notNull().default("Gen1 contractor"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("gen1_project_events_project_idx").on(table.projectId),
}));

export const gen1UploadBatches = sqliteTable("gen1_upload_batches", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => gen1Workspaces.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(),
  projectId: text("project_id").notNull().references(() => gen1Projects.id, { onDelete: "cascade" }),
  operation: text("operation").notNull().default("plan_upload"),
  status: text("status").notNull().default("processing"),
  fileCount: integer("file_count").notNull().default(0),
  totalSizeBytes: integer("total_size_bytes").notNull().default(0),
  createdProject: integer("created_project", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => ({
  workspaceKeyUnique: uniqueIndex("gen1_upload_batches_workspace_key_unique").on(table.workspaceId, table.idempotencyKey),
  projectIdx: index("gen1_upload_batches_project_idx").on(table.projectId),
}));
