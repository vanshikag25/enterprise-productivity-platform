CREATE TYPE "public"."ai_action_intent_type" AS ENUM('task', 'meeting', 'deadline', 'reminder', 'decision', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."ai_action_status" AS ENUM('pending', 'created');--> statement-breakpoint
CREATE TABLE "ai_action_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_detected_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"sender_id" varchar(255),
	"channel_name" varchar(255),
	"intent_type" "ai_action_intent_type" NOT NULL,
	"title" varchar(512) NOT NULL,
	"summary" text,
	"confidence" numeric(3, 2),
	"source_message_text" text,
	"meta" jsonb,
	"status" "ai_action_status" DEFAULT 'pending' NOT NULL,
	"created_by" varchar(255),
	"resolved_entity_type" varchar(50),
	"resolved_entity_id" varchar(255),
	"resolution_note" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_action_dismissals" ADD CONSTRAINT "ai_action_dismissals_action_id_ai_detected_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."ai_detected_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_action_dismissals_user_idx" ON "ai_action_dismissals" USING btree ("action_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_detected_actions_message_intent_idx" ON "ai_detected_actions" USING btree ("message_id","intent_type");