CREATE TABLE `gen1_project_models` (
	`project_id` text PRIMARY KEY NOT NULL,
	`schema_version` integer NOT NULL,
	`model_version` integer NOT NULL,
	`active_revision_id` text NOT NULL,
	`status` text DEFAULT 'awaiting_scale' NOT NULL,
	`model_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen1_project_models_revision_idx` ON `gen1_project_models` (`project_id`,`active_revision_id`);
--> statement-breakpoint
CREATE INDEX `gen1_project_models_version_idx` ON `gen1_project_models` (`project_id`,`model_version`);
