CREATE TYPE "public"."moderation_action_type" AS ENUM('message_delete', 'user_mute', 'user_unmute', 'member_remove', 'user_ban', 'user_unban', 'channel_lock', 'channel_unlock', 'report_review', 'report_resolve', 'report_dismiss');--> statement-breakpoint
CREATE TYPE "public"."moderation_report_status" AS ENUM('pending', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."moderation_report_target" AS ENUM('message', 'user');--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moderator_id" varchar(255) NOT NULL,
	"moderator_role" "user_role" NOT NULL,
	"action_type" "moderation_action_type" NOT NULL,
	"target_user_id" varchar(255),
	"target_message_id" varchar(255),
	"channel_id" varchar(255),
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" varchar(255) NOT NULL,
	"target_type" "moderation_report_target" NOT NULL,
	"target_message_id" varchar(255),
	"target_user_id" varchar(255),
	"channel_id" varchar(255) NOT NULL,
	"channel_name" varchar(255),
	"reason" varchar(255) NOT NULL,
	"description" text,
	"status" "moderation_report_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_reports_reporter_message_idx" ON "moderation_reports" USING btree ("reporter_id","target_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_reports_reporter_user_channel_idx" ON "moderation_reports" USING btree ("reporter_id","target_user_id","channel_id");