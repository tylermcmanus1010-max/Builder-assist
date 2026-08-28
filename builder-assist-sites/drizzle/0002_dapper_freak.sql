ALTER TABLE `gen1_project_files` ADD `upload_batch_id` text;--> statement-breakpoint
CREATE INDEX `gen1_project_files_upload_batch_idx` ON `gen1_project_files` (`upload_batch_id`);--> statement-breakpoint
ALTER TABLE `gen1_upload_batches` ADD `created_project` integer DEFAULT false NOT NULL;