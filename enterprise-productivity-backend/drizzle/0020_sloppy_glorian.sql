ALTER TABLE "moderation_reports" ADD COLUMN "target_user_name" varchar(255);--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD COLUMN "target_message_text" text;