CREATE TABLE `screens` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`name` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `screens_version_idx` ON `screens` (`version_id`);--> statement-breakpoint
ALTER TABLE `versions` ADD `type` text DEFAULT 'canvas' NOT NULL;