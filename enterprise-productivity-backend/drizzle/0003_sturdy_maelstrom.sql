CREATE TYPE "public"."meeting_status" AS ENUM('Scheduled', 'Ongoing', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"scheduled_date" timestamp with time zone NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"organizer_id" varchar(255) NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meeting_status" "meeting_status" DEFAULT 'Scheduled' NOT NULL,
	"meeting_chat_channel_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
