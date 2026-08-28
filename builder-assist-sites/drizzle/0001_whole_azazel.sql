CREATE TABLE `gen1_upload_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`project_id` text NOT NULL,
	`operation` text DEFAULT 'plan_upload' NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`total_size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `gen1_workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `gen1_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gen1_upload_batches_workspace_key_unique` ON `gen1_upload_batches` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `gen1_upload_batches_project_idx` ON `gen1_upload_batches` (`project_id`);