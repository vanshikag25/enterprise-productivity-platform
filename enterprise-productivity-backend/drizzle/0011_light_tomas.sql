CREATE TYPE "public"."reminder_priority" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TABLE "message_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source_channel_id" varchar(255) NOT NULL,
	"source_message_id" varchar(255) NOT NULL,
	"source_sender_id" varchar(255),
	"source_channel_name" varchar(255),
	"source_message_text" text,
	"source_sender_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"priority" "reminder_priority" DEFAULT 'Medium' NOT NULL,
	"notes" text,
	"source_channel_id" varchar(255),
	"source_message_id" varchar(255),
	"source_sender_id" varchar(255),
	"source_channel_name" varchar(255),
	"is_triggered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"source_channel_id" varchar(255),
	"source_message_id" varchar(255),
	"source_sender_id" varchar(255),
	"source_channel_name" varchar(255),
	"source_message_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "source_channel_id" varchar(255);--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "source_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "source_sender_id" varchar(255);--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "source_channel_name" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "message_bookmarks_user_message_idx" ON "message_bookmarks" USING btree ("user_id","source_message_id");