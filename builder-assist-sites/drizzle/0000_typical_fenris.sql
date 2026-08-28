CREATE TABLE `gen1_estimate_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category` text NOT NULL,
	`item` text NOT NULL,
	`unit` text DEFAULT 'allowance' NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_cost_cents` integer DEFAULT 0 NOT NULL,
	`labor_cost_cents` integer DEFAULT 0 NOT NULL,
	`vendor` text DEFAULT 'Builder Assist' NOT NULL,
	`source` text DEFAULT 'plan-set preliminary' NOT NULL,
	`competitor_rates_json` text DEFAULT '{}' NOT NULL,
	`included` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_estimate_lines_project_idx` ON `gen1_estimate_lines` (`project_id`);--> statement-breakpoint
CREATE TABLE `gen1_finish_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category` text NOT NULL,
	`item` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'allowance' NOT NULL,
	`unit_cost_cents` integer DEFAULT 0 NOT NULL,
	`vendor` text DEFAULT 'Unselected' NOT NULL,
	`selected` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_finish_selections_project_idx` ON `gen1_finish_selections` (`project_id`);--> statement-breakpoint
CREATE TABLE `gen1_growify_records` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_growify_records_project_idx` ON `gen1_growify_records` (`project_id`);--> statement-breakpoint
CREATE INDEX `gen1_growify_records_kind_idx` ON `gen1_growify_records` (`project_id`,`kind`);--> statement-breakpoint
CREATE TABLE `gen1_module_records` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`module_no` integer NOT NULL,
	`record_type` text DEFAULT 'record' NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`owner` text DEFAULT 'Unassigned' NOT NULL,
	`due_date` text,
	`notes` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_module_records_project_idx` ON `gen1_module_records` (`project_id`);--> statement-breakpoint
CREATE INDEX `gen1_module_records_module_idx` ON `gen1_module_records` (`project_id`,`module_no`);--> statement-breakpoint
CREATE TABLE `gen1_phase_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`phase_no` integer NOT NULL,
	`task_no` integer NOT NULL,
	`label` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`owner` text DEFAULT 'Unassigned' NOT NULL,
	`due_date` text,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_phase_tasks_project_idx` ON `gen1_phase_tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `gen1_phase_tasks_phase_idx` ON `gen1_phase_tasks` (`project_id`,`phase_no`);--> statement-breakpoint
CREATE TABLE `gen1_project_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`actor` text DEFAULT 'Gen1 contractor' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_project_events_project_idx` ON `gen1_project_events` (`project_id`);--> statement-breakpoint
CREATE TABLE `gen1_project_files` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`r2_key` text NOT NULL,
	`document_type` text DEFAULT 'plan' NOT NULL,
	`analysis_status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_project_files_project_idx` ON `gen1_project_files` (`project_id`);--> statement-breakpoint
CREATE TABLE `gen1_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT 'Address pending' NOT NULL,
	`client_name` text DEFAULT 'Property owner pending' NOT NULL,
	`status` text DEFAULT 'plan_intake' NOT NULL,
	`square_feet` integer DEFAULT 2500 NOT NULL,
	`stories` real DEFAULT 1 NOT NULL,
	`garage_bays` integer DEFAULT 2 NOT NULL,
	`quality_level` text DEFAULT 'standard' NOT NULL,
	`estimate_status` text DEFAULT 'preliminary' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `gen1_workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_projects_workspace_idx` ON `gen1_projects` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `gen1_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text DEFAULT 'Builder Assist Gen1' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gen1_workspaces_owner_email_unique` ON `gen1_workspaces` (`owner_email`);