-- Hand-written: drizzle-kit emitted ALTER TABLE ADD, which drops ON DELETE cascade on the
-- self-referencing parent_id and cannot add NOT NULL author/source to a non-empty table.
-- Existing rows predate the viewer comment UI, so they were written through MCP by the owner.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`parent_id` text,
	`author` text NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`resolved_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "project_id", "version_id", "parent_id", "author", "source", "target", "body", "created_at", "updated_at", "resolved_at") SELECT `comments`.`id`, `comments`.`project_id`, `comments`.`version_id`, NULL, `projects`.`owner`, 'mcp', `comments`.`target`, `comments`.`body`, `comments`.`created_at`, NULL, NULL FROM `comments` INNER JOIN `projects` ON `projects`.`id` = `comments`.`project_id`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `comments_project_version_idx` ON `comments` (`project_id`,`version_id`);
