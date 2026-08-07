ALTER TABLE "tasks" ADD COLUMN "source_channel_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_sender_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_channel_name" varchar(255);