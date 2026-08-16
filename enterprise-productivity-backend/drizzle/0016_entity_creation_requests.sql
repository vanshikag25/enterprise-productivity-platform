CREATE TYPE "public"."entity_creation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."entity_creation_type" AS ENUM('task', 'meeting');--> statement-breakpoint
CREATE TABLE "entity_creation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_creation_type" NOT NULL,
	"status" "entity_creation_status" DEFAULT 'pending' NOT NULL,
	"title" varchar(512) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"source_channel_id" varchar(255),
	"source_message_id" varchar(255),
	"source_sender_id" varchar(255),
	"source_channel_name" varchar(255),
	"source_message_text" text,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
