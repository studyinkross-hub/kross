CREATE TABLE `records` (
	`session` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`session`, `id`)
);
